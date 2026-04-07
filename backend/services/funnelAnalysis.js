/**
 * Funnel Analysis Engine
 */

const LIFECYCLE_STAGES = ['lead', 'marketingqualifiedlead', 'salesqualifiedlead', 'opportunity', 'customer'];
const STAGE_LABELS = {
  lead: 'Lead',
  marketingqualifiedlead: 'MQL',
  salesqualifiedlead: 'SQL',
  opportunity: 'Opportunity',
  customer: 'Customer',
};

const STAGE_DATE_PROPS = {
  lead: 'hs_lifecyclestage_lead_date',
  marketingqualifiedlead: 'hs_lifecyclestage_marketingqualifiedlead_date',
  salesqualifiedlead: 'hs_lifecyclestage_salesqualifiedlead_date',
  opportunity: 'hs_lifecyclestage_opportunity_date',
  customer: 'hs_lifecyclestage_customer_date',
};

function buildContactHistory(contact) {
  const props = contact.properties || {};
  const history = {};
  for (const [stage, prop] of Object.entries(STAGE_DATE_PROPS)) {
    if (props[prop]) history[stage] = new Date(props[prop]).getTime();
  }

  // Fallback: if no date props found, use lifecyclestage + createdate
  if (Object.keys(history).length === 0 && props.lifecyclestage) {
    const currentStage = props.lifecyclestage.toLowerCase().replace(/\s+/g, '');
    const stageIndex = LIFECYCLE_STAGES.indexOf(currentStage);
    if (stageIndex !== -1) {
      const ts = props.createdate ? new Date(props.createdate).getTime() : Date.now();
      for (let i = 0; i <= stageIndex; i++) {
        history[LIFECYCLE_STAGES[i]] = ts;
      }
    }
  }

  return history;
}

function getFurthestStage(history) {
  for (const stage of [...LIFECYCLE_STAGES].reverse()) {
    if (history[stage]) return stage;
  }
  return null;
}

function median(arr) {
  if (!arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function calculateFunnel(contacts) {
  const stageCounts = {};
  const transitionTimes = {};
  for (const stage of LIFECYCLE_STAGES) stageCounts[stage] = 0;

  for (const contact of contacts) {
    const history = buildContactHistory(contact);
    const furthest = getFurthestStage(history);
    if (!furthest) continue;

    let reached = false;
    for (const stage of LIFECYCLE_STAGES) {
      if (history[stage] || stage === furthest) {
        stageCounts[stage]++;
        if (stage === furthest) reached = true;
      }
      if (reached && !history[stage]) break;
    }

    for (let i = 0; i < LIFECYCLE_STAGES.length - 1; i++) {
      const from = LIFECYCLE_STAGES[i];
      const to = LIFECYCLE_STAGES[i + 1];
      if (history[from] && history[to]) {
        const days = (history[to] - history[from]) / (1000 * 60 * 60 * 24);
        if (!transitionTimes[`${from}_to_${to}`]) transitionTimes[`${from}_to_${to}`] = [];
        if (days >= 0 && days < 1000) transitionTimes[`${from}_to_${to}`].push(days);
      }
    }
  }

  const funnelStages = LIFECYCLE_STAGES.map((stage, i) => {
    const count = stageCounts[stage];
    const prevCount = i > 0 ? stageCounts[LIFECYCLE_STAGES[i - 1]] : count;
    const conversionRate = prevCount > 0 ? (count / prevCount) * 100 : 0;
    const transitionKey = i > 0 ? `${LIFECYCLE_STAGES[i - 1]}_to_${stage}` : null;
    const times = transitionKey ? (transitionTimes[transitionKey] || []) : [];

    return {
      stage,
      label: STAGE_LABELS[stage],
      count,
      conversionRate: i === 0 ? 100 : Math.round(conversionRate * 10) / 10,
      dropOff: i === 0 ? 0 : prevCount - count,
      medianDaysInStage: times.length >= 3 ? Math.round(median(times) * 10) / 10 : null,
      avgDaysInStage: times.length >= 3
        ? Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 10) / 10 : null,
      sampleSize: times.length,
    };
  });

  const stagesWithPrev = funnelStages.slice(1);
  const biggestLeakByRate = stagesWithPrev.reduce((w, s) => s.conversionRate < w.conversionRate ? s : w);
  const biggestLeakByVolume = stagesWithPrev.reduce((w, s) => s.dropOff > w.dropOff ? s : w);
  const longestStage = stagesWithPrev
    .filter(s => s.medianDaysInStage !== null)
    .reduce((l, s) => (s.medianDaysInStage || 0) > (l.medianDaysInStage || 0) ? s : l, stagesWithPrev[0]);

  return {
    stages: funnelStages,
    totalContacts: stageCounts.lead,
    totalCustomers: stageCounts.customer,
    overallConversionRate: stageCounts.lead > 0
      ? Math.round((stageCounts.customer / stageCounts.lead) * 1000) / 10 : 0,
    biggestLeakByRate,
    biggestLeakByVolume,
    longestStage,
  };
}

function analyzeSourcePerformance(contacts) {
  const sourceData = {};
  for (const contact of contacts) {
    const props = contact.properties || {};
    const source = props.hs_analytics_source || 'unknown';
    const isCustomer = props.lifecyclestage === 'customer';
    if (!sourceData[source]) sourceData[source] = { total: 0, customers: 0 };
    sourceData[source].total++;
    if (isCustomer) sourceData[source].customers++;
  }
  return Object.entries(sourceData)
    .filter(([, d]) => d.total >= 5)
    .map(([source, d]) => ({
      source,
      total: d.total,
      customers: d.customers,
      conversionRate: Math.round((d.customers / d.total) * 1000) / 10,
    }))
    .sort((a, b) => b.conversionRate - a.conversionRate);
}

function analyzeSpeedToLead(contacts) {
  const fast = [], slow = [];
  for (const contact of contacts) {
    const props = contact.properties || {};
    const created = props.createdate ? new Date(props.createdate).getTime() : null;
    const firstContact = props.notes_last_contacted ? new Date(props.notes_last_contacted).getTime() : null;
    if (!created || !firstContact) { slow.push(contact); continue; }
    const hours = (firstContact - created) / (1000 * 60 * 60);
    (hours <= 6 && hours >= 0 ? fast : slow).push(contact);
  }
  const rate = arr => {
    if (!arr.length) return 0;
    const c = arr.filter(c => c.properties?.lifecyclestage === 'customer').length;
    return Math.round((c / arr.length) * 1000) / 10;
  };
  const fastRate = rate(fast), slowRate = rate(slow);
  return {
    fastCount: fast.length, slowCount: slow.length,
    fastConversionRate: fastRate, slowConversionRate: slowRate,
    speedMultiplier: slowRate > 0 ? Math.round((fastRate / slowRate) * 10) / 10 : null,
  };
}

module.exports = { calculateFunnel, analyzeSourcePerformance, analyzeSpeedToLead, LIFECYCLE_STAGES, STAGE_LABELS };
