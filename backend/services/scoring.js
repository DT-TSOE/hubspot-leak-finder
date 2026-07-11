/**
 * PipeChamp Scorecard
 *
 * Two-funnel model:
 *   - Marketing score  (job: generate leads -> SQL)
 *   - Sales score      (job: SQL -> opportunity -> customer)
 *   - One headline overall grade (weighted blend) + estimated revenue impact
 *
 * Every dimension is scored 0-100 against a DOCUMENTED, SWAPPABLE benchmark.
 * Benchmarks live in BENCHMARKS below with a `source` so the UI can answer
 * "where did this number come from?" — see SCORING.md.
 */

const calc = require('./metricCalculations');
const { findStuckRecords } = require('./pipelineHealth');

// --- Benchmarks (v1 published defaults; swap for per-industry data later) ----
const BENCHMARKS = {
  speedToLead: {
    // median hours to first touch -> score
    source: 'Lead Response Management Study (Oldroyd, Kellogg/MIT); HBR "The Short Life of Online Sales Leads" (2011) — odds of qualifying drop ~10x after the first hour.',
    label: 'Median first-response time',
  },
  leadToSql: {
    par: 13, // % of leads that reach SQL
    source: 'Aggregated B2B funnel benchmarks (Salesforce/Implisit): ~13% of leads reach sales-qualified.',
    label: 'Lead → SQL conversion',
  },
  followUpCoverage: {
    par: 90, // % of active contacts with >=1 logged touch
    source: 'Activity-hygiene target: >90% of active contacts should have at least one logged touch.',
    label: 'Lead follow-up coverage',
  },
  sourceConcentration: {
    max: 70, // single source should not exceed this % of leads
    source: 'Diversification guardrail: no single source above ~70% of lead volume (concentration risk).',
    label: 'Lead source diversity',
  },
  dealStageConversion: {
    source: "Dan's methodology: of all deals that EVER entered a stage, the % that reach closed-won — measured from dealstage history, not linear stage-to-stage.",
    label: 'Deal-stage conversion',
  },
  winRate: {
    par: 20, // % of closed deals won
    source: 'Aggregate B2B close-rate benchmarks: ~20% of closed deals won is a common par.',
    label: 'Win rate',
  },
  stalledDeals: {
    source: 'Stage-aging: share of open pipeline value sitting past its expected stage duration. Lower is better.',
    label: 'Stalled deals',
  },
  salesCycle: {
    // scored relative to deal size; days
    source: 'Sales-cycle length vs a deal-size-adjusted norm (small deals should close faster).',
    label: 'Sales cycle length',
  },
};

// --- Small scoring helpers ---------------------------------------------------
const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

// Linear score: `value` mapped so that hitting `par` (or better) = 100.
function scoreToPar(value, par) {
  if (value === null || value === undefined || par <= 0) return null;
  return Math.round(clamp((value / par) * 100));
}

function scoreSpeedToLead(hours) {
  if (hours === null || hours === undefined) return null;
  if (hours < 1) return 100;
  if (hours < 6) return 90;
  if (hours < 24) return 70;
  if (hours < 48) return 40;
  return 20;
}

function letterGrade(score) {
  if (score === null) return null;
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

// Weighted blend of dimensions that actually have data (renormalizes weights).
function blend(dimensions) {
  let weighted = 0, totalWeight = 0;
  for (const d of dimensions) {
    if (d.score === null || d.score === undefined) continue;
    weighted += d.score * d.weight;
    totalWeight += d.weight;
  }
  return totalWeight > 0 ? Math.round(weighted / totalWeight) : null;
}

// --- Deal-stage conversion (the flagship) ------------------------------------
// For each pipeline stage, of all deals whose dealstage history EVER included
// that stage, what % are currently closed-won.
function calculateDealStageConversion(dealsWithHistory, pipelines) {
  if (!pipelines || !pipelines.length || !dealsWithHistory || !dealsWithHistory.length) return [];

  // Map every deal's CURRENT stage id and its set of ever-entered stage ids.
  const results = [];
  for (const pipeline of pipelines) {
    const wonStageIds = new Set(pipeline.stages.filter(s => s.isClosedWon).map(s => s.id));
    const stageIds = new Set(pipeline.stages.map(s => s.id));

    // Deals belonging to this pipeline: current stage is one of its stages.
    const pipelineDeals = dealsWithHistory.filter(d => stageIds.has(d.properties.dealstage));
    if (!pipelineDeals.length) continue;

    const totalWon = pipelineDeals.filter(d => wonStageIds.has(d.properties.dealstage)).length;

    const stages = pipeline.stages
      .filter(s => !s.isClosed) // report on open/working stages, not the closed buckets
      .map(s => {
        const everReached = pipelineDeals.filter(d => (d._stagesEntered || []).includes(s.id));
        const won = everReached.filter(d => wonStageIds.has(d.properties.dealstage)).length;
        return {
          stageId: s.id,
          label: s.label,
          displayOrder: s.displayOrder,
          everReached: everReached.length,
          won,
          conversionPct: everReached.length >= 3
            ? Math.round((won / everReached.length) * 1000) / 10
            : null,
          lowSample: everReached.length < 3,
        };
      });

    results.push({
      pipelineId: pipeline.id,
      pipelineLabel: pipeline.label,
      dealCount: pipelineDeals.length,
      // Baseline: of all deals created in this pipeline, % won.
      createdToWon: Math.round((totalWon / pipelineDeals.length) * 1000) / 10,
      stages,
    });
  }
  // Primary pipeline first (most deals).
  return results.sort((a, b) => b.dealCount - a.dealCount);
}

// --- The scorecard -----------------------------------------------------------
function buildScorecard(data) {
  const { contacts = [], deals = [], dealsWithHistory = [], pipelines = [] } = data;

  const avgDeal = calc.calculateAverageDealSize(deals);
  const avgDealSize = avgDeal.value || 0;
  const winRate = calc.calculateWinRate(deals);
  const noTouch = calc.calculateNoTouchCount(contacts);
  const speed = calc.calculateTimeToFirstTouch(contacts);
  const cycle = calc.calculateSalesCycle(deals);

  // Lead -> SQL conversion (ever-reached lifecycle stages)
  const leadToSql = calc.calculateStageConversion(contacts, 'lead', 'salesqualifiedlead');
  // Overall lead -> customer rate, used for revenue-impact estimates.
  const leadToCustomer = calc.calculateStageConversion(contacts, 'lead', 'customer');

  // Source concentration: largest single source share of active leads.
  const sources = calc.calculateSourceQuality(contacts, deals);
  const totalSourceContacts = sources.reduce((s, x) => s + x.contacts, 0);
  const topSourceShare = totalSourceContacts > 0
    ? Math.round((Math.max(0, ...sources.map(s => s.contacts)) / totalSourceContacts) * 100)
    : null;

  const dealStageConversion = calculateDealStageConversion(dealsWithHistory, pipelines);
  // Sales-side deal-stage score: weakest open-stage conversion in the primary pipeline.
  const primary = dealStageConversion[0];
  const stageScores = primary
    ? primary.stages.filter(s => s.conversionPct !== null).map(s => s.conversionPct)
    : [];
  const dealStageScore = stageScores.length
    ? Math.round(stageScores.reduce((a, b) => a + b, 0) / stageScores.length)
    : null;

  // Stalled deals: share of open pipeline value that is stuck.
  const stuck = findStuckRecords(contacts, deals).filter(r => r.type === 'deal');
  const openPipeline = calc.calculateOpenPipelineValue(deals);
  const stalledValue = stuck.reduce((s, d) => s + (d.revenueAtRisk || 0), 0);
  const stalledScore = openPipeline.value > 0
    ? Math.round(clamp(100 - (stalledValue / openPipeline.value) * 100))
    : null;

  // ---- Marketing dimensions ----
  const marketingDims = [
    { key: 'leadToSql', weight: 45, score: leadToSql.value !== null ? scoreToPar(leadToSql.value, BENCHMARKS.leadToSql.par) : null,
      value: leadToSql.value, benchmark: `${BENCHMARKS.leadToSql.par}%`, ...BENCHMARKS.leadToSql, sample: leadToSql.sample },
    { key: 'followUpCoverage', weight: 30, score: noTouch.total > 0 ? Math.round(clamp(100 - noTouch.pct)) : null,
      value: noTouch.total > 0 ? 100 - noTouch.pct : null, benchmark: `>${BENCHMARKS.followUpCoverage.par}%`, ...BENCHMARKS.followUpCoverage, sample: noTouch.total },
    { key: 'sourceConcentration', weight: 25, score: topSourceShare !== null ? Math.round(clamp(100 - Math.max(0, topSourceShare - BENCHMARKS.sourceConcentration.max) * 3)) : null,
      value: topSourceShare, benchmark: `<${BENCHMARKS.sourceConcentration.max}% from one source`, ...BENCHMARKS.sourceConcentration, sample: totalSourceContacts },
  ];

  // ---- Sales dimensions ----
  const salesDims = [
    { key: 'dealStageConversion', weight: 30, score: dealStageScore,
      value: dealStageScore, benchmark: 'per-stage vs history', ...BENCHMARKS.dealStageConversion, sample: primary?.dealCount || 0 },
    { key: 'winRate', weight: 25, score: winRate.value !== null ? scoreToPar(winRate.value, BENCHMARKS.winRate.par) : null,
      value: winRate.value, benchmark: `${BENCHMARKS.winRate.par}%`, ...BENCHMARKS.winRate, sample: winRate.sample },
    { key: 'stalledDeals', weight: 20, score: stalledScore,
      value: stalledValue, benchmark: 'minimize stuck $', ...BENCHMARKS.stalledDeals, sample: stuck.length },
    { key: 'speedToLead', weight: 15, score: scoreSpeedToLead(speed.value),
      value: speed.value, benchmark: '<1h', ...BENCHMARKS.speedToLead, sample: speed.sample },
    { key: 'salesCycle', weight: 10, score: cycle.value !== null ? scoreSalesCycle(cycle.value, avgDealSize) : null,
      value: cycle.value, benchmark: 'deal-size adjusted', ...BENCHMARKS.salesCycle, sample: cycle.sample },
  ];

  const marketingScore = blend(marketingDims);
  const salesScore = blend(salesDims);

  // Headline overall grade = weighted blend of the two funnels (50/50 of what exists).
  const overall = blend([
    { score: marketingScore, weight: 50 },
    { score: salesScore, weight: 50 },
  ]);

  const revenueImpact = estimateRevenueImpact({
    avgDealSize, winRate: winRate.value, closedDeals: winRate.sample || 0,
    leadToCustomer: leadToCustomer.value, noTouch, stalledValue,
  });

  return {
    overall: { score: overall, grade: letterGrade(overall) },
    marketing: { score: marketingScore, grade: letterGrade(marketingScore), dimensions: marketingDims },
    sales: { score: salesScore, grade: letterGrade(salesScore), dimensions: salesDims },
    dealStageConversion,
    revenueImpact,
    context: { avgDealSize },
  };
}

function scoreSalesCycle(days, avgDealSize) {
  if (days === null) return null;
  // Rough deal-size-adjusted norm: bigger deals are allowed longer cycles.
  const normDays = avgDealSize > 50000 ? 120 : avgDealSize > 10000 ? 60 : 30;
  return Math.round(clamp(100 - Math.max(0, days - normDays) / normDays * 60));
}

// --- Revenue impact ----------------------------------------------------------
// Conservative, grounded in the portal's OWN avg deal size and real counts.
// Each item documents how it was derived (no HubSpot "$800M more" fantasy).
function estimateRevenueImpact({ avgDealSize, winRate, closedDeals, leadToCustomer, noTouch, stalledValue }) {
  const items = [];
  if (!avgDealSize) return { total: 0, items, note: 'No won deals yet — cannot estimate revenue impact.' };

  // 1. Win-rate gap -> extra wins on the deals you already close out.
  if (winRate !== null && winRate < BENCHMARKS.winRate.par && closedDeals >= 3) {
    const extraWins = (BENCHMARKS.winRate.par - winRate) / 100 * closedDeals;
    const recoverable = Math.round(extraWins * avgDealSize);
    if (recoverable > 0) items.push({
      key: 'winRate',
      title: `Win rate ${winRate}% vs ${BENCHMARKS.winRate.par}% benchmark`,
      amount: recoverable,
      how: `Closing at the ${BENCHMARKS.winRate.par}% benchmark instead of ${winRate}% across your ${closedDeals} closed deals ≈ ${extraWins.toFixed(1)} more wins × ${fmt(avgDealSize)} avg deal.`,
    });
  }

  // 2. Uncontacted/slow leads -> leads that should have closed at your own rate.
  if (noTouch.value > 0 && leadToCustomer) {
    const recoverable = Math.round(noTouch.value * (leadToCustomer / 100) * avgDealSize);
    if (recoverable > 0) items.push({
      key: 'followUp',
      title: `${noTouch.value} un-touched leads`,
      amount: recoverable,
      how: `${noTouch.value} active leads with no logged touch × your ${leadToCustomer}% lead→customer rate × ${fmt(avgDealSize)} avg deal.`,
    });
  }

  // 3. Stalled deals -> value recoverable at your own win rate.
  if (stalledValue > 0 && winRate !== null) {
    const recoverable = Math.round(stalledValue * (winRate / 100));
    if (recoverable > 0) items.push({
      key: 'stalled',
      title: `${fmt(stalledValue)} in stalled deals`,
      amount: recoverable,
      how: `${fmt(stalledValue)} of open deals sitting past their stage window × your ${winRate}% win rate.`,
    });
  }

  const total = items.reduce((s, i) => s + i.amount, 0);
  return { total, items };
}

const fmt = n => '$' + Math.round(n).toLocaleString();

module.exports = { buildScorecard, calculateDealStageConversion, BENCHMARKS };
