/**
 * Recommendations engine — the "so what do I do?" layer.
 *
 * Turns each weak scorecard dimension into a gap → what's happening → fix card,
 * where the fix is tiered: a DIY step, and the HubSpot upgrade that removes the
 * problem. This is what makes PipeChamp a sales tool for HubSpot upgrades.
 */

const fmtHours = h => h == null ? '—' : h < 1 ? `${Math.round(h * 60)} min` : h < 24 ? `${Math.round(h)} hours` : `${Math.round(h / 24)} days`;
const fmt$ = n => '$' + Math.round(n || 0).toLocaleString();

// dimensionKey -> builder(value) => { whatsHappening, diy, upgrade }
const REC = {
  speedToLead: (v) => ({
    whatsHappening: `Your median first response is ${fmtHours(v)}. Leads contacted within an hour convert far better — every hour after that, close rates drop.`,
    diy: 'Build a saved view of new leads with no logged contact and clear it every morning; assign one owner to own the first response.',
    upgrade: { tier: 'Sales Hub Pro', feature: 'Workflow automation + sequences', why: 'Auto-rotate every new lead to a rep and fire an instant follow-up task and email, so nothing sits uncontacted.' },
  }),
  leadToSql: (v) => ({
    whatsHappening: `Only ${v}% of your leads reach sales-qualified. Either lead quality is low or nurturing is leaking them before sales sees them.`,
    diy: 'Tighten what "qualified" means and review where leads stall between Lead and SQL.',
    upgrade: { tier: 'Marketing Hub Pro', feature: 'Lead scoring + automated nurture', why: 'Score leads by fit/behavior and auto-nurture the warm ones until they’re sales-ready, so more leads reach SQL.' },
  }),
  followUpCoverage: (v) => ({
    whatsHappening: `A large share of your active contacts have no logged touch. Leads are falling through the cracks unworked.`,
    diy: 'Create a "no-touch leads" saved view and assign a daily owner to work it down.',
    upgrade: { tier: 'Sales Hub Pro', feature: 'Sequences', why: 'Auto-enroll new contacts into a multi-step follow-up sequence so every lead gets worked without manual effort.' },
  }),
  sourceConcentration: (v) => ({
    whatsHappening: `Your leads are heavily concentrated in one source. If that channel dips, your pipeline dips with it.`,
    diy: 'Test one new channel this quarter and track its lead quality against your main source.',
    upgrade: { tier: 'Marketing Hub Pro', feature: 'Campaigns + ad management', why: 'Run and measure campaigns across channels in one place to diversify where your pipeline comes from.' },
  }),
  dealStageConversion: (v) => ({
    whatsHappening: `Deals are converting weakly through your pipeline stages — the forecast you’re working from is softer than it looks.`,
    diy: 'Add required properties before a deal can advance a stage, so only real opportunities move forward.',
    upgrade: { tier: 'Sales Hub Pro', feature: 'Deal-stage automation', why: 'Automate stage gates, required fields, and rotting-deal alerts so the pipeline reflects reality and stalls surface early.' },
  }),
  winRate: (v) => ({
    whatsHappening: `Your win rate is ${v}%, below a healthy benchmark. Deals are being lost that similar teams close.`,
    diy: 'Make "closed-lost reason" required and review your last 10 losses for the common pattern.',
    upgrade: { tier: 'Sales Hub Pro', feature: 'Playbooks + guided selling', why: 'Give reps in-deal playbooks and battlecards at each stage to lift win rate on the deals you already have.' },
  }),
  stalledDeals: (v) => ({
    whatsHappening: `${fmt$(v)} of open pipeline is sitting past its expected stage window — quietly aging toward lost.`,
    diy: 'Review stuck deals weekly; every one either moves a stage or gets closed lost.',
    upgrade: { tier: 'Sales Hub Pro', feature: 'Deal automation + task queues', why: 'Auto-flag rotting deals and queue the next action so nothing stalls unnoticed.' },
  }),
  salesCycle: (v) => ({
    whatsHappening: `Your sales cycle is longer than ideal for your deal size — cash and rep capacity are tied up longer than they need to be.`,
    diy: 'Find the single slowest stage transition and attack that handoff first.',
    upgrade: { tier: 'Sales Hub Pro', feature: 'Sequences + meeting scheduling', why: 'Cut back-and-forth with automated follow-ups and one-click booking to compress time-to-close.' },
  }),
};

function buildRecommendations(scorecard) {
  if (!scorecard) return [];
  const impactByKey = {};
  for (const it of (scorecard.revenueImpact?.items || [])) impactByKey[it.key] = it.amount;
  // Revenue-impact keys -> dimension keys
  if (impactByKey.followUp != null) impactByKey.followUpCoverage = impactByKey.followUp;
  if (impactByKey.stalled != null) impactByKey.stalledDeals = impactByKey.stalled;

  const funnels = [
    { name: 'Marketing', data: scorecard.marketing },
    { name: 'Sales', data: scorecard.sales },
  ];

  const recs = [];
  for (const f of funnels) {
    if (f.data?.locked) continue; // don't advise on a locked/blurred funnel
    for (const dim of (f.data?.dimensions || [])) {
      if (dim.score == null || dim.score >= 70) continue;
      const build = REC[dim.key];
      if (!build) continue;
      const body = build(dim.value);
      recs.push({
        key: dim.key,
        funnel: f.name,
        label: dim.label,
        score: dim.score,
        severity: dim.score < 40 ? 'critical' : dim.score < 55 ? 'high' : 'medium',
        impact: impactByKey[dim.key] || null,
        ...body,
        // Prewritten prompt so "Ask PipeCoach" opens with useful context.
        coachMessage: `My ${dim.label} is weak (scored ${dim.score}/100). ${body.whatsHappening} What are the exact steps to fix this in HubSpot?`,
      });
    }
  }
  return recs.sort((a, b) => a.score - b.score).slice(0, 6);
}

module.exports = { buildRecommendations };
