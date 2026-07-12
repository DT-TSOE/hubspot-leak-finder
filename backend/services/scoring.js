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
 * "where did this number come from?" - see SCORING.md.
 */

const calc = require('./metricCalculations');
const { findStuckRecords } = require('./pipelineHealth');

// --- Benchmarks (v1 published defaults; swap for per-industry data later) ----
const BENCHMARKS = {
  speedToLead: {
    source: 'Median time from when a lead is created to when your team first reached out. Faster is better — leads go cold quickly.',
    label: 'Median first-response time',
  },
  leadToSql: {
    par: 13,
    source: 'Of all leads in your CRM, the percentage that have ever reached Sales Qualified Lead stage.',
    label: 'Lead → SQL conversion',
  },
  followUpCoverage: {
    par: 90,
    source: 'Of your active contacts, the percentage that have at least one logged touch (call, email, or meeting).',
    label: 'Lead follow-up coverage',
  },
  sourceConcentration: {
    max: 70,
    source: 'How spread out your lead sources are. Heavy reliance on a single source is a risk if that channel dries up.',
    label: 'Lead source diversity',
  },
  dealStageConversion: {
    source: 'Average conversion rate across your active pipeline stages — of deals that entered each stage, how many went on to win.',
    label: 'Deal-stage conversion',
  },
  winRate: {
    par: 20,
    source: 'Of all deals marked closed (won or lost), the percentage you won.',
    label: 'Win rate',
  },
  stalledDeals: {
    source: 'Percentage of your open pipeline value sitting in a stage longer than expected. Lower is better.',
    label: 'Stalled deals',
  },
  salesCycle: {
    source: 'Median days from deal created to closed-won. Compared against your own average deal size — bigger deals naturally take longer.',
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

    // How skip-heavy is this pipeline? If few deals ever touched the middle
    // stages, the org isn't diligent with HubSpot stages and created→won is the
    // only number to trust (Dan's point: most SMB deals go created→closed).
    const middleStages = stages.slice(1);
    const touchedMiddle = middleStages.some(s => s.everReached >= 3);

    results.push({
      pipelineId: pipeline.id,
      pipelineLabel: pipeline.label,
      dealCount: pipelineDeals.length,
      won: totalWon,
      // Baseline: of all deals created in this pipeline, % won. The reliable metric.
      createdToWon: Math.round((totalWon / pipelineDeals.length) * 1000) / 10,
      skipHeavy: !touchedMiddle,
      stages,
    });
  }
  // Primary pipeline first (most deals).
  return results.sort((a, b) => b.dealCount - a.dealCount);
}

// --- Adaptive weights from onboarding profile --------------------------------
// Not per-portal statistics - banded presets driven by a few onboarding answers.
// The point is a credible, explainable "tuned for your business" methodology.
const DEFAULT_WEIGHTS = {
  split: { marketing: 50, sales: 50 },
  marketing: { leadToSql: 45, followUpCoverage: 30, sourceConcentration: 25 },
  sales: { dealStageConversion: 30, winRate: 25, stalledDeals: 20, speedToLead: 15, salesCycle: 10 },
};

const BT_LABEL = { services: 'B2B services', saas: 'B2B SaaS', ecommerce: 'B2C ecommerce', local: 'Local & retail' };
const HUB_LABEL = { both: 'Marketing + Sales', sales: 'Sales-led', marketing: 'Marketing-led' };
const GOAL_LABEL = { more_leads: 'more leads', higher_close: 'higher close rate', faster_cycle: 'faster cycle', bigger_deals: 'bigger deals' };

function _normalize(obj) {
  const sum = Object.values(obj).reduce((a, b) => a + b, 0);
  if (sum <= 0) return;
  for (const k of Object.keys(obj)) obj[k] = Math.round((obj[k] / sum) * 100);
}
function _tiltSplit(split, funnel, amt) {
  if (split.marketing === 0 || split.sales === 0) return; // a funnel is locked
  const other = funnel === 'marketing' ? 'sales' : 'marketing';
  split[funnel] = Math.min(80, split[funnel] + amt);
  split[other] = 100 - split[funnel];
}

function resolveScoreProfile(profile) {
  const w = {
    split: { ...DEFAULT_WEIGHTS.split },
    marketing: { ...DEFAULT_WEIGHTS.marketing },
    sales: { ...DEFAULT_WEIGHTS.sales },
  };
  if (!profile || !profile.businessType) {
    return { ...w, tunedFor: null, methodology: [], locked: null, personalized: false };
  }
  const notes = [];
  let locked = null;
  const damp = profile.revenue === 'lt500k' ? 0.5 : 1; // trust defaults more for tiny orgs
  const bump = (obj, key, mult) => { if (obj[key] != null) obj[key] = obj[key] * (1 + (mult - 1) * damp); };

  // 1. Business type → cycle expectation
  if (profile.businessType === 'ecommerce' || profile.businessType === 'local') {
    bump(w.sales, 'speedToLead', 1.6); bump(w.sales, 'salesCycle', 1.3); bump(w.sales, 'dealStageConversion', 0.7);
    notes.push({ factor: 'Speed-to-lead', reason: 'Short, transactional sales - fast response drives revenue more than stage progression.' });
  } else if (profile.businessType === 'services' || profile.businessType === 'saas') {
    bump(w.sales, 'dealStageConversion', 1.4); bump(w.sales, 'salesCycle', 0.7); bump(w.sales, 'speedToLead', 0.85);
    notes.push({ factor: 'Deal-stage conversion', reason: 'Considered B2B sale - how deals move through stages predicts wins more than raw speed.' });
  }

  // 2. Hubs → split + which funnel is locked (blurred)
  if (profile.hubs === 'sales') { locked = 'marketing'; w.split = { marketing: 0, sales: 100 }; notes.push({ factor: 'Sales-only', reason: 'You run Sales Hub only - the Marketing grade is locked (unlock by adding Marketing Hub).' }); }
  else if (profile.hubs === 'marketing') { locked = 'sales'; w.split = { marketing: 100, sales: 0 }; notes.push({ factor: 'Marketing-only', reason: 'You run Marketing Hub only - the Sales grade is locked.' }); }

  // 3. Growth challenge → main weight booster
  const BOOST = 1.5;
  switch (profile.challenge) {
    case 'not_enough_leads': bump(w.marketing, 'leadToSql', BOOST); _tiltSplit(w.split, 'marketing', 10); notes.push({ factor: 'Lead generation', reason: 'Your biggest challenge is lead volume - the marketing funnel is weighted up.' }); break;
    case 'leads_dont_convert': bump(w.marketing, 'leadToSql', BOOST); bump(w.marketing, 'followUpCoverage', 1.3); notes.push({ factor: 'Lead → SQL conversion', reason: 'Your challenge is leads not converting - qualification is weighted up.' }); break;
    case 'deals_stall': bump(w.sales, 'dealStageConversion', BOOST); bump(w.sales, 'stalledDeals', 1.4); notes.push({ factor: 'Deal-stage & stalled deals', reason: 'Your challenge is deals stalling - pipeline movement is weighted up.' }); break;
    case 'slow_follow_up': bump(w.sales, 'speedToLead', BOOST); bump(w.marketing, 'followUpCoverage', 1.3); notes.push({ factor: 'Speed-to-lead', reason: 'Your challenge is follow-up speed - response time is weighted up.' }); break;
    case 'losing_competitors': bump(w.sales, 'winRate', BOOST); bump(w.sales, 'dealStageConversion', 1.2); notes.push({ factor: 'Win rate', reason: 'Your challenge is losing deals - close rate is weighted up.' }); break;
    default: break;
  }

  // 4. Primary goal → tilt the grade toward that funnel/factor
  switch (profile.goal) {
    case 'more_leads': _tiltSplit(w.split, 'marketing', 10); break;
    case 'higher_close': bump(w.sales, 'winRate', 1.2); _tiltSplit(w.split, 'sales', 10); break;
    case 'faster_cycle': bump(w.sales, 'salesCycle', 1.3); bump(w.sales, 'speedToLead', 1.2); break;
    default: break;
  }

  _normalize(w.marketing); _normalize(w.sales);
  if (!locked) _normalize(w.split);

  const tunedFor = [BT_LABEL[profile.businessType], HUB_LABEL[profile.hubs], profile.goal && `goal: ${GOAL_LABEL[profile.goal]}`].filter(Boolean).join(' · ');
  return { ...w, tunedFor, methodology: notes, locked, personalized: true };
}

// --- Data-driven drivers: what separates THIS portal's wins from losses ------
// Layered on top of the onboarding weights when there's enough closed-deal data
// to be meaningful. Explains itself with the portal's own numbers.
function computeDataDrivers(data) {
  const { contacts = [], dealsWithContacts = [], dealsWithHistory = [] } = data;
  const contactMap = {}; contacts.forEach(c => { contactMap[c.id] = c; });
  const wonSpeed = [], lostSpeed = [], wonTouch = [], lostTouch = [];
  for (const d of dealsWithContacts) {
    const won = d.properties.dealstage === 'closedwon', lost = d.properties.dealstage === 'closedlost';
    if (!won && !lost) continue;
    const c = (d._contactIds || []).map(id => contactMap[id]).find(Boolean);
    if (!c) continue;
    const cc = new Date(c.properties.createdate).getTime();
    const ft = c.properties.notes_last_contacted ? new Date(c.properties.notes_last_contacted).getTime() : null;
    let sp = null; if (ft && !isNaN(cc)) { const h = (ft - cc) / 3600000; if (h > 0 && h < 720) sp = h; }
    const t = c.properties.num_contacted_notes != null ? parseInt(c.properties.num_contacted_notes) : null;
    if (won) { if (sp != null) wonSpeed.push(sp); if (t != null) wonTouch.push(t); }
    else { if (sp != null) lostSpeed.push(sp); if (t != null) lostTouch.push(t); }
  }
  const wonStages = [], lostStages = [];
  for (const d of dealsWithHistory) {
    const n = (d._stagesEntered || []).length; if (!n) continue;
    if (d.properties.dealstage === 'closedwon') wonStages.push(n);
    else if (d.properties.dealstage === 'closedlost') lostStages.push(n);
  }
  const med = calc.median;
  const drivers = {}, notes = [];
  if (wonSpeed.length >= 5 && lostSpeed.length >= 5) {
    const w = med(wonSpeed), l = med(lostSpeed);
    if (w > 0 && l > w) {
      const ratio = l / w, strength = clamp((ratio - 1) / 2, 0, 1);
      drivers.speedToLead = strength;
      if (strength >= 0.3) notes.push({ factor: 'Speed-to-lead (from your data)', reason: `Your won deals were contacted ${Math.round(ratio * 10) / 10}× faster than the ones you lost - so speed is weighted up for you.` });
    }
  }
  if (wonTouch.length >= 5 && lostTouch.length >= 5) {
    const w = med(wonTouch), l = med(lostTouch);
    if (w > l) {
      const ratio = l > 0 ? w / l : 2, strength = clamp((ratio - 1) / 2, 0, 1);
      drivers.followUpCoverage = strength;
      if (strength >= 0.3) notes.push({ factor: 'Follow-up (from your data)', reason: `Won deals had ~${Math.round(w)} touches vs ~${Math.round(l)} on losses - follow-up is weighted up for you.` });
    }
  }
  if (wonStages.length >= 5 && lostStages.length >= 5) {
    const w = med(wonStages), l = med(lostStages);
    if (w > l) {
      const strength = clamp((w - l) / Math.max(l, 1), 0, 1);
      drivers.dealStageConversion = strength;
      if (strength >= 0.3) notes.push({ factor: 'Stage discipline (from your data)', reason: `Deals you won moved through more stages than deals you lost - stage discipline is weighted up for you.` });
    }
  }
  return { sufficient: Object.keys(drivers).length > 0, drivers, notes };
}

// --- The scorecard -----------------------------------------------------------
function buildScorecard(data, profile) {
  const { contacts = [], deals = [], dealsWithContacts = [], dealsWithHistory = [], pipelines = [] } = data;
  const W = resolveScoreProfile(profile);

  // Blend in data-driven drivers (what actually separates their wins from losses).
  const dd = computeDataDrivers({ contacts, dealsWithContacts, dealsWithHistory });
  if (dd.sufficient) {
    const MAX_BOOST = 0.8;
    const boost = (obj, key) => { if (dd.drivers[key] != null && obj[key] != null) obj[key] = obj[key] * (1 + dd.drivers[key] * MAX_BOOST); };
    boost(W.marketing, 'followUpCoverage');
    boost(W.sales, 'speedToLead');
    boost(W.sales, 'dealStageConversion');
    _normalize(W.marketing); _normalize(W.sales);
    W.methodology = [...(W.methodology || []), ...dd.notes];
    W.dataDriven = true;
  }

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

  const fmtHours = h => h == null ? null : h < 1 ? `${Math.round(h * 60)}m` : h < 24 ? `${Math.round(h)}h` : `${Math.round(h / 24)}d`;
  const fmtDays = d => d == null ? null : d < 7 ? `${Math.round(d)}d` : d < 60 ? `${Math.round(d / 7)}w` : `${Math.round(d / 30)}mo`;
  const fmtPct = v => v == null ? null : `${Math.round(v)}%`;

  // ---- Marketing dimensions (weights from resolved profile) ----
  const marketingDims = [
    { key: 'leadToSql', weight: W.marketing.leadToSql, score: leadToSql.value !== null ? scoreToPar(leadToSql.value, BENCHMARKS.leadToSql.par) : null,
      value: leadToSql.value, displayValue: fmtPct(leadToSql.value), ...BENCHMARKS.leadToSql, sample: leadToSql.sample },
    { key: 'followUpCoverage', weight: W.marketing.followUpCoverage, score: noTouch.total > 0 ? Math.round(clamp(100 - noTouch.pct)) : null,
      value: noTouch.total > 0 ? 100 - noTouch.pct : null, displayValue: noTouch.total > 0 ? fmtPct(100 - noTouch.pct) : null, ...BENCHMARKS.followUpCoverage, sample: noTouch.total },
    { key: 'sourceConcentration', weight: W.marketing.sourceConcentration, score: topSourceShare !== null ? Math.round(clamp(100 - Math.max(0, topSourceShare - BENCHMARKS.sourceConcentration.max) * 3)) : null,
      value: topSourceShare, displayValue: topSourceShare !== null ? `${topSourceShare}% top source` : null, ...BENCHMARKS.sourceConcentration, sample: totalSourceContacts },
  ];

  // ---- Sales dimensions (weights from resolved profile) ----
  const winRateNote = winRate.value === 100 && winRate.sample < 10 ? ` (${winRate.sample} closed, no losses yet)` : '';
  const salesDims = [
    { key: 'dealStageConversion', weight: W.sales.dealStageConversion, score: dealStageScore,
      value: dealStageScore, displayValue: dealStageScore !== null ? `${dealStageScore}% avg stage conversion` : null, ...BENCHMARKS.dealStageConversion, sample: primary?.dealCount || 0 },
    { key: 'winRate', weight: W.sales.winRate, score: winRate.value !== null ? scoreToPar(winRate.value, BENCHMARKS.winRate.par) : null,
      value: winRate.value, displayValue: winRate.value !== null ? `${Math.round(winRate.value)}%${winRateNote}` : null, ...BENCHMARKS.winRate, sample: winRate.sample },
    { key: 'stalledDeals', weight: W.sales.stalledDeals, score: stalledScore,
      value: stalledValue, displayValue: stuck.length > 0 ? `${stuck.length} stalled deal${stuck.length !== 1 ? 's' : ''}` : 'none stalled', ...BENCHMARKS.stalledDeals, sample: stuck.length },
    { key: 'speedToLead', weight: W.sales.speedToLead, score: scoreSpeedToLead(speed.value),
      value: speed.value, displayValue: fmtHours(speed.value) ? `${fmtHours(speed.value)} median` : null, ...BENCHMARKS.speedToLead, sample: speed.sample },
    { key: 'salesCycle', weight: W.sales.salesCycle, score: cycle.value !== null ? scoreSalesCycle(cycle.value, avgDealSize) : null,
      value: cycle.value, displayValue: fmtDays(cycle.value) ? `${fmtDays(cycle.value)} median` : null, ...BENCHMARKS.salesCycle, sample: cycle.sample },
  ];

  const marketingScore = blend(marketingDims);
  const salesScore = blend(salesDims);

  // Headline overall grade = funnels blended by the profile's split. A locked
  // funnel (weight 0) is excluded from the grade but still computed for display.
  const overall = blend([
    { score: marketingScore, weight: W.split.marketing },
    { score: salesScore, weight: W.split.sales },
  ]);

  const revenueImpact = estimateRevenueImpact({
    avgDealSize, winRate: winRate.value, closedDeals: winRate.sample || 0,
    leadToCustomer: leadToCustomer.value, noTouch, stalledValue,
  });

  return {
    overall: { score: overall, grade: letterGrade(overall) },
    marketing: { score: marketingScore, grade: letterGrade(marketingScore), dimensions: marketingDims, weight: W.split.marketing, locked: W.locked === 'marketing' },
    sales: { score: salesScore, grade: letterGrade(salesScore), dimensions: salesDims, weight: W.split.sales, locked: W.locked === 'sales' },
    dealStageConversion,
    revenueImpact,
    context: { avgDealSize },
    tunedFor: W.tunedFor,
    methodology: W.methodology,
    personalized: W.personalized,
    dataDriven: !!W.dataDriven,
    lifecycleMaintained: calc.isLifecycleMaintained(contacts),
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
  if (!avgDealSize) return { total: 0, items, note: 'No won deals yet - cannot estimate revenue impact.' };

  // 1. Win-rate gap -> extra wins on the deals you already close out.
  if (winRate !== null && winRate < BENCHMARKS.winRate.par && closedDeals >= 3) {
    const extraWins = (BENCHMARKS.winRate.par - winRate) / 100 * closedDeals;
    const recoverable = Math.round(extraWins * avgDealSize);
    if (recoverable > 0) items.push({
      key: 'winRate',
      title: `Win rate ${winRate}% vs ${BENCHMARKS.winRate.par}% benchmark`,
      amount: recoverable,
      how: `At a ${BENCHMARKS.winRate.par}% win rate instead of ${winRate}%, you'd win about ${Math.round(extraWins)} more of your ${closedDeals} closed deals, worth ${fmt(avgDealSize)} each.`,
    });
  }

  // 2. Uncontacted/slow leads -> leads that should have closed at your own rate.
  if (noTouch.value > 0 && leadToCustomer) {
    const recoverable = Math.round(noTouch.value * (leadToCustomer / 100) * avgDealSize);
    if (recoverable > 0) items.push({
      key: 'followUp',
      title: `${noTouch.value} un-touched leads`,
      amount: recoverable,
      how: `${noTouch.value} active leads have no logged touch. At your ${leadToCustomer}% lead-to-customer rate and ${fmt(avgDealSize)} average deal, that's the upside of working them.`,
    });
  }

  // 3. Stalled deals -> value recoverable at your own win rate.
  if (stalledValue > 0 && winRate !== null) {
    const recoverable = Math.round(stalledValue * (winRate / 100));
    if (recoverable > 0) items.push({
      key: 'stalled',
      title: `${fmt(stalledValue)} in stalled deals`,
      amount: recoverable,
      how: `${fmt(stalledValue)} of open deals are sitting past their stage window. At your ${winRate}% win rate, that's what's recoverable.`,
    });
  }

  const total = items.reduce((s, i) => s + i.amount, 0);
  return { total, items };
}

const fmt = n => '$' + Math.round(n).toLocaleString();

module.exports = { buildScorecard, calculateDealStageConversion, BENCHMARKS };
