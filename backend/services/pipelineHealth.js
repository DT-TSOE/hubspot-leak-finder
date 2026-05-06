/**
 * Pipeline Health Score & GM Dashboard
 * Composite 0-100 score across 5 dimensions
 */

const calc = require('./metricCalculations');

function calculatePipelineHealthScore(contacts, deals) {
  const dimensions = {};
  let total = 0;
  let weighted = 0;

  // 1. Conversion health (25%)
  const dropoff = calc.calculateBiggestDropoff(contacts);
  if (dropoff) {
    const score = Math.max(0, Math.min(100, dropoff.rate * 2));
    dimensions.conversion = { score: Math.round(score), weight: 25, detail: `Biggest stage: ${dropoff.from}→${dropoff.to} at ${dropoff.rate}%` };
    weighted += score * 25;
    total += 25;
  }

  // 2. Speed-to-lead (20%)
  const speed = calc.calculateTimeToFirstTouch(contacts);
  if (speed.value !== null) {
    let score;
    if (speed.value < 1) score = 100;
    else if (speed.value < 6) score = 90;
    else if (speed.value < 24) score = 70;
    else if (speed.value < 48) score = 40;
    else score = 20;
    dimensions.speed = { score, weight: 20, detail: `${speed.value}h median first touch` };
    weighted += score * 20;
    total += 20;
  }

  // 3. Activity level (20%) — % of active contacts with at least 1 touch
  const noTouch = calc.calculateNoTouchCount(contacts);
  if (noTouch.total > 0) {
    const score = Math.max(0, 100 - noTouch.pct);
    dimensions.activity = { score, weight: 20, detail: `${noTouch.pct}% of active contacts have no touches` };
    weighted += score * 20;
    total += 20;
  }

  // 4. Win rate (20%)
  const winRate = calc.calculateWinRate(deals);
  if (winRate.value !== null) {
    let score;
    if (winRate.value >= 30) score = 100;
    else if (winRate.value >= 20) score = 80;
    else if (winRate.value >= 15) score = 60;
    else if (winRate.value >= 10) score = 40;
    else score = 20;
    dimensions.winRate = { score, weight: 20, detail: `${winRate.value}% close rate` };
    weighted += score * 20;
    total += 20;
  }

  // 5. Stuck records (15%)
  const stuckCount = countStuckRecords(contacts, deals);
  if (contacts.length + deals.length > 0) {
    const stuckPct = ((stuckCount / Math.max(contacts.length + deals.length, 1)) * 100);
    const score = Math.max(0, 100 - stuckPct * 3);
    dimensions.flow = { score: Math.round(score), weight: 15, detail: `${stuckCount} stuck records` };
    weighted += score * 15;
    total += 15;
  }

  const overall = total > 0 ? Math.round(weighted / total) : null;
  let grade = 'F';
  if (overall >= 85) grade = 'A';
  else if (overall >= 70) grade = 'B';
  else if (overall >= 55) grade = 'C';
  else if (overall >= 40) grade = 'D';

  return { score: overall, grade, dimensions };
}

function countStuckRecords(contacts, deals) {
  const now = Date.now();
  const thresholds = { lead: 1, marketingqualifiedlead: 3, salesqualifiedlead: 7, opportunity: 14 };
  const stageProps = {
    lead: 'hs_lifecyclestage_lead_date',
    marketingqualifiedlead: 'hs_lifecyclestage_marketingqualifiedlead_date',
    salesqualifiedlead: 'hs_lifecyclestage_salesqualifiedlead_date',
    opportunity: 'hs_lifecyclestage_opportunity_date',
  };
  let count = 0;
  for (const c of contacts) {
    const stage = c.properties.lifecyclestage;
    if (!stage || stage === 'customer') continue;
    const threshold = thresholds[stage];
    if (!threshold) continue;
    const stageDate = c.properties[stageProps[stage]];
    if (!stageDate) continue;
    const days = (now - new Date(stageDate).getTime()) / 86400000;
    if (days > threshold * 2) count++;
  }
  return count;
}

function findStuckRecords(contacts, deals) {
  const now = Date.now();
  const thresholds = { lead: 1, marketingqualifiedlead: 3, salesqualifiedlead: 7, opportunity: 14 };
  const stageProps = {
    lead: 'hs_lifecyclestage_lead_date',
    marketingqualifiedlead: 'hs_lifecyclestage_marketingqualifiedlead_date',
    salesqualifiedlead: 'hs_lifecyclestage_salesqualifiedlead_date',
    opportunity: 'hs_lifecyclestage_opportunity_date',
  };
  const labels = { lead: 'Lead', marketingqualifiedlead: 'MQL', salesqualifiedlead: 'SQL', opportunity: 'Opportunity' };
  const stuck = [];

  for (const c of contacts) {
    const stage = c.properties.lifecyclestage;
    if (!stage || stage === 'customer' || !thresholds[stage]) continue;
    const threshold = thresholds[stage];
    const stageDate = c.properties[stageProps[stage]];
    if (!stageDate) continue;
    const daysInStage = Math.floor((now - new Date(stageDate).getTime()) / 86400000);
    if (daysInStage <= threshold) continue;
    const lastActivity = c.properties.notes_last_contacted ? new Date(c.properties.notes_last_contacted).getTime() : null;
    const daysSinceActivity = lastActivity ? Math.floor((now - lastActivity) / 86400000) : null;
    const overFactor = daysInStage / threshold;
    const urgency = overFactor > 4 ? 'critical' : overFactor > 2.5 ? 'high' : 'medium';
    const name = [c.properties.firstname, c.properties.lastname].filter(Boolean).join(' ') || 'Unknown contact';

    stuck.push({
      id: c.id,
      type: 'contact',
      name,
      email: c.properties.email,
      stage: labels[stage],
      stageRaw: stage,
      owner: c.properties.hubspot_owner_id || null,
      daysInStage,
      threshold,
      overFactor: Math.round(overFactor * 10) / 10,
      lastActivityDays: daysSinceActivity,
      urgency,
      action: getStuckAction(stage, daysInStage, threshold),
      hubspotUrl: `https://app.hubspot.com/contacts/${c.id}`,
    });
  }

  // Stuck deals
  for (const d of deals) {
    const stage = d.properties.dealstage;
    if (['closedwon', 'closedlost'].includes(stage)) continue;
    const created = new Date(d.properties.createdate).getTime();
    const daysOpen = Math.floor((now - created) / 86400000);
    if (daysOpen < 14) continue;
    const amount = parseFloat(d.properties.amount || '0');
    const urgency = daysOpen > 60 ? 'critical' : daysOpen > 30 ? 'high' : 'medium';
    stuck.push({
      id: d.id,
      type: 'deal',
      name: d.properties.dealname || 'Unnamed deal',
      stage: stage || 'Unknown',
      daysInStage: daysOpen,
      threshold: 14,
      overFactor: Math.round((daysOpen / 14) * 10) / 10,
      amount: amount > 0 ? amount : null,
      revenueAtRisk: amount > 0 ? Math.round(amount) : null,
      urgency,
      action: `Deal open ${daysOpen} days. Move to next stage or close as lost.`,
      hubspotUrl: `https://app.hubspot.com/deals/${d.id}`,
    });
  }

  return stuck.sort((a, b) => b.overFactor - a.overFactor);
}

function getStuckAction(stage, days, threshold) {
  const actions = {
    lead: `Sat as Lead for ${days} days. Qualify or disqualify today — set lifecycle stage based on engagement.`,
    marketingqualifiedlead: `MQL for ${days} days vs ${threshold}-day target. Assign owner and trigger sales outreach now.`,
    salesqualifiedlead: `SQL for ${days} days. Schedule discovery call or move back to MQL with re-nurture sequence.`,
    opportunity: `Opportunity for ${days} days. Get a decision — close as won, lost, or push out timeline.`,
  };
  return actions[stage] || 'Review and update stage or close.';
}

function findUncontactedLeads(contacts) {
  const now = Date.now();
  const uncontacted = [];
  for (const c of contacts) {
    const stage = c.properties.lifecyclestage;
    if (!stage || stage === 'customer') continue;
    const created = new Date(c.properties.createdate).getTime();
    const hoursSinceCreated = (now - created) / 3600000;
    if (hoursSinceCreated < 1 || hoursSinceCreated > 720) continue;
    const lastContacted = c.properties.notes_last_contacted ? new Date(c.properties.notes_last_contacted).getTime() : null;
    const touches = parseInt(c.properties.num_contacted_notes || '0');
    if (lastContacted && touches > 0) continue;

    const name = [c.properties.firstname, c.properties.lastname].filter(Boolean).join(' ') || 'Unknown';
    const labels = { lead: 'Lead', marketingqualifiedlead: 'MQL', salesqualifiedlead: 'SQL', opportunity: 'Opportunity' };
    let urgency = 'low';
    if (hoursSinceCreated > 48) urgency = 'critical';
    else if (hoursSinceCreated > 24) urgency = 'high';
    else if (hoursSinceCreated > 6) urgency = 'medium';

    uncontacted.push({
      id: c.id,
      name,
      email: c.properties.email,
      stage: labels[stage] || stage,
      source: c.properties.hs_analytics_source || 'Unknown',
      hoursSinceCreated: Math.round(hoursSinceCreated),
      urgency,
      action: hoursSinceCreated < 6 ? 'Contact within the next hour — best close window' :
              hoursSinceCreated < 24 ? 'Contact today — every hour reduces close probability' :
              'Contact immediately — likely already gone cold',
      hubspotUrl: `https://app.hubspot.com/contacts/${c.id}`,
    });
  }
  return uncontacted.sort((a, b) => b.hoursSinceCreated - a.hoursSinceCreated);
}

function buildFixThisFirst(contacts, deals, healthScore) {
  if (!healthScore || !healthScore.dimensions) return null;
  const lowest = Object.entries(healthScore.dimensions).sort(([, a], [, b]) => a.score - b.score)[0];
  if (!lowest) return null;
  const [dim, data] = lowest;

  const fixes = {
    speed: {
      title: 'Your response time is hurting close rates',
      description: data.detail,
      action: 'Set up a HubSpot task automation: when a new MQL is created, instantly assign a "Call within 2 hours" task to the owner.',
      steps: [
        'Go to Automation → Workflows → Create new (or use Saved View on Starter)',
        'On Pro: Trigger when Lifecycle Stage = MQL → Create task for owner',
        'On Starter: Create a Saved Contact View filtered to MQLs created today, no last-contact date — review every morning',
      ],
      starterSafe: true,
    },
    activity: {
      title: 'Too many active contacts have zero touches logged',
      description: data.detail,
      action: 'Build a "No-touch leads" Saved View in HubSpot and assign a daily review owner.',
      steps: [
        'Go to Contacts → Filters → Lifecycle stage is one of Lead, MQL, SQL',
        'Add filter: Last activity date is unknown',
        'Save view as "No-touch leads"',
        'Assign daily review owner — clear list each morning',
      ],
      starterSafe: true,
    },
    conversion: {
      title: `${data.detail.split(': ')[1] || 'Stage conversion'} is your biggest leak`,
      description: data.detail,
      action: 'Audit the qualification criteria at this stage — are reps moving contacts forward too fast or letting them stall?',
      steps: [
        'Pull your last 20 contacts that converted at this stage and your last 20 that didn\'t',
        'Identify what the 20 converters had in common — source, touches, demo attended, etc.',
        'Add those criteria as required fields/properties in HubSpot before stage advances',
      ],
      starterSafe: true,
    },
    winRate: {
      title: 'Your close rate is below benchmark',
      description: data.detail,
      action: 'Review your last 10 lost deals for common patterns — price, timing, competitor, fit.',
      steps: [
        'In HubSpot, filter Deals → Stage is Closed Lost → sorted by recent',
        'Make "Closed Lost Reason" a required field on close',
        'Run monthly review — what reason appears most? That\'s your sales playbook gap',
      ],
      starterSafe: true,
    },
    flow: {
      title: 'Records are stalling in stages too long',
      description: data.detail,
      action: 'Set stage-aging thresholds and review stuck records weekly.',
      steps: [
        'Create Saved Views for each stage: "MQLs > 3 days", "SQLs > 7 days", "Opportunities > 14 days"',
        'Review weekly in pipeline meeting — every record either moves or closes lost',
      ],
      starterSafe: true,
    },
  };
  return fixes[dim] || null;
}

module.exports = {
  calculatePipelineHealthScore,
  findStuckRecords,
  findUncontactedLeads,
  buildFixThisFirst,
};
