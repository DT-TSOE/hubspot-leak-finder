/**
 * PipeChamp Metric Calculations
 * Deterministic calculations for all metric tiles
 */

const median = arr => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 !== 0 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const mean = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

function calculateWinRate(deals) {
  const closed = deals.filter(d => ['closedwon', 'closedlost'].includes(d.properties.dealstage));
  const won = closed.filter(d => d.properties.dealstage === 'closedwon');
  if (closed.length < 3) return { value: null, sample: closed.length };
  return { value: Math.round((won.length / closed.length) * 1000) / 10, sample: closed.length };
}

function calculateAverageDealSize(deals) {
  const won = deals.filter(d => d.properties.dealstage === 'closedwon');
  const amounts = won.map(d => parseFloat(d.properties.amount || '0')).filter(a => a > 0);
  if (amounts.length < 3) return { value: null, sample: amounts.length };
  return { value: Math.round(mean(amounts)), sample: amounts.length };
}

function calculateSalesCycle(deals) {
  const won = deals.filter(d => d.properties.dealstage === 'closedwon');
  const cycles = won.map(d => {
    const created = new Date(d.properties.createdate).getTime();
    const closed = new Date(d.properties.closedate).getTime();
    if (isNaN(created) || isNaN(closed)) return null;
    const days = (closed - created) / 86400000;
    return days > 0 && days < 730 ? days : null;
  }).filter(d => d !== null);
  if (cycles.length < 3) return { value: null, sample: cycles.length };
  return { value: Math.round(median(cycles)), mean: Math.round(mean(cycles)), sample: cycles.length };
}

function calculateOpenPipelineValue(deals) {
  const open = deals.filter(d => !['closedwon', 'closedlost'].includes(d.properties.dealstage));
  const total = open.reduce((sum, d) => sum + parseFloat(d.properties.amount || '0'), 0);
  return { value: Math.round(total), sample: open.length };
}

function calculateNewDealsCount(deals, daysAgo = 30) {
  const cutoff = Date.now() - daysAgo * 86400000;
  const recent = deals.filter(d => new Date(d.properties.createdate).getTime() >= cutoff);
  return { value: recent.length, sample: recent.length, period: `last ${daysAgo}d` };
}

function calculateStageConversion(contacts, fromStage, toStage) {
  const stageProps = {
    lead: 'hs_lifecyclestage_lead_date',
    marketingqualifiedlead: 'hs_lifecyclestage_marketingqualifiedlead_date',
    salesqualifiedlead: 'hs_lifecyclestage_salesqualifiedlead_date',
    opportunity: 'hs_lifecyclestage_opportunity_date',
    customer: 'hs_lifecyclestage_customer_date',
  };
  const reachedFrom = contacts.filter(c => c.properties[stageProps[fromStage]]);
  const reachedTo = contacts.filter(c => c.properties[stageProps[toStage]]);
  if (reachedFrom.length < 3) return { value: null, sample: reachedFrom.length };
  return {
    value: Math.round((reachedTo.length / reachedFrom.length) * 1000) / 10,
    sample: reachedFrom.length,
    fromCount: reachedFrom.length,
    toCount: reachedTo.length,
  };
}

function calculateBiggestDropoff(contacts) {
  const stages = ['lead', 'marketingqualifiedlead', 'salesqualifiedlead', 'opportunity', 'customer'];
  const labels = { lead: 'Lead', marketingqualifiedlead: 'MQL', salesqualifiedlead: 'SQL', opportunity: 'Opportunity', customer: 'Customer' };
  let worst = null;
  for (let i = 1; i < stages.length; i++) {
    const conv = calculateStageConversion(contacts, stages[i - 1], stages[i]);
    if (conv.value === null) continue;
    if (!worst || conv.value < worst.rate) {
      worst = {
        from: labels[stages[i - 1]],
        to: labels[stages[i]],
        rate: conv.value,
        dropoffPct: Math.round((100 - conv.value) * 10) / 10,
        lost: conv.fromCount - conv.toCount,
      };
    }
  }
  return worst;
}

function calculateTimeToFirstTouch(contacts) {
  const times = contacts.map(c => {
    const created = new Date(c.properties.createdate).getTime();
    const firstTouch = c.properties.notes_last_contacted ? new Date(c.properties.notes_last_contacted).getTime() : null;
    if (!firstTouch || isNaN(created)) return null;
    const hours = (firstTouch - created) / 3600000;
    return hours > 0 && hours < 720 ? hours : null;
  }).filter(t => t !== null);
  if (times.length < 3) return { value: null, sample: times.length };
  return {
    value: Math.round(median(times) * 10) / 10,
    mean: Math.round(mean(times) * 10) / 10,
    sample: times.length,
    under1h: Math.round((times.filter(t => t < 1).length / times.length) * 100),
    under24h: Math.round((times.filter(t => t < 24).length / times.length) * 100),
    noTouch: contacts.filter(c => !c.properties.notes_last_contacted).length,
  };
}

function calculateNoTouchCount(contacts) {
  const active = contacts.filter(c => c.properties.lifecyclestage && c.properties.lifecyclestage !== 'customer');
  const noTouch = active.filter(c => !c.properties.notes_last_contacted || parseInt(c.properties.num_contacted_notes || '0') === 0);
  return { value: noTouch.length, total: active.length, pct: active.length ? Math.round((noTouch.length / active.length) * 100) : 0 };
}

function calculateTouchesPerDeal(deals, contacts, outcome = 'all') {
  const contactMap = {};
  contacts.forEach(c => { contactMap[c.id] = c; });
  const filtered = deals.filter(d => {
    if (outcome === 'won') return d.properties.dealstage === 'closedwon';
    if (outcome === 'lost') return d.properties.dealstage === 'closedlost';
    return ['closedwon', 'closedlost'].includes(d.properties.dealstage);
  });
  const touches = [];
  for (const deal of filtered) {
    if (!deal._contactIds) continue;
    for (const cId of deal._contactIds) {
      const c = contactMap[cId];
      if (c) touches.push(parseInt(c.properties.num_contacted_notes || '0'));
    }
  }
  if (touches.length < 3) return { value: null, sample: touches.length };
  return { value: Math.round(median(touches) * 10) / 10, sample: touches.length };
}

function calculateRevenueBySource(contacts, deals, sourceProperty = 'hs_analytics_source') {
  const wonDeals = deals.filter(d => d.properties.dealstage === 'closedwon');
  const sourceMap = {};
  for (const deal of wonDeals) {
    if (!deal._contactIds) continue;
    const cId = deal._contactIds[0];
    const c = contacts.find(x => x.id === cId);
    const source = c?.properties?.[sourceProperty] || 'Unknown';
    const amount = parseFloat(deal.properties.amount || '0');
    if (!sourceMap[source]) sourceMap[source] = { revenue: 0, count: 0 };
    sourceMap[source].revenue += amount;
    sourceMap[source].count++;
  }
  return Object.entries(sourceMap)
    .filter(([, s]) => s.count >= 1)
    .map(([source, s]) => ({ source, revenue: Math.round(s.revenue), deals: s.count }))
    .sort((a, b) => b.revenue - a.revenue);
}

function calculateSourceQuality(contacts, deals, sourceProperty = 'hs_analytics_source') {
  const stageProps = {
    marketingqualifiedlead: 'hs_lifecyclestage_marketingqualifiedlead_date',
    salesqualifiedlead: 'hs_lifecyclestage_salesqualifiedlead_date',
    opportunity: 'hs_lifecyclestage_opportunity_date',
    customer: 'hs_lifecyclestage_customer_date',
  };
  const contactBySource = {};
  for (const c of contacts) {
    const source = c.properties[sourceProperty] || 'Unknown';
    if (!contactBySource[source]) {
      contactBySource[source] = { contacts: 0, mqls: 0, sqls: 0, opportunities: 0, customers: 0, deals: 0, won: 0, revenue: 0, cycles: [] };
    }
    contactBySource[source].contacts++;
    if (c.properties[stageProps.marketingqualifiedlead]) contactBySource[source].mqls++;
    if (c.properties[stageProps.salesqualifiedlead]) contactBySource[source].sqls++;
    if (c.properties[stageProps.opportunity]) contactBySource[source].opportunities++;
    if (c.properties[stageProps.customer]) contactBySource[source].customers++;
  }
  for (const deal of deals) {
    if (!deal._contactIds) continue;
    const cId = deal._contactIds[0];
    const c = contacts.find(x => x.id === cId);
    if (!c) continue;
    const source = c.properties[sourceProperty] || 'Unknown';
    if (!contactBySource[source]) continue;
    contactBySource[source].deals++;
    if (deal.properties.dealstage === 'closedwon') {
      contactBySource[source].won++;
      contactBySource[source].revenue += parseFloat(deal.properties.amount || '0');
      const created = new Date(deal.properties.createdate).getTime();
      const closed = new Date(deal.properties.closedate).getTime();
      if (!isNaN(created) && !isNaN(closed)) {
        const days = (closed - created) / 86400000;
        if (days > 0 && days < 730) contactBySource[source].cycles.push(days);
      }
    }
  }
  return Object.entries(contactBySource)
    .filter(([, s]) => s.contacts >= 3)
    .map(([source, s]) => ({
      source,
      contacts: s.contacts,
      mqls: s.mqls,
      sqls: s.sqls,
      opportunities: s.opportunities,
      customers: s.customers,
      deals: s.deals,
      won: s.won,
      revenue: Math.round(s.revenue),
      conversionRate: s.contacts > 0 ? Math.round((s.customers / s.contacts) * 1000) / 10 : 0,
      winRate: s.deals > 0 ? Math.round((s.won / s.deals) * 1000) / 10 : 0,
      avgDealSize: s.won > 0 ? Math.round(s.revenue / s.won) : 0,
      avgSalesCycle: s.cycles.length >= 2 ? Math.round(median(s.cycles)) : null,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

function detectSourceProperties(contacts) {
  const properties = ['hs_analytics_source', 'hs_analytics_source_data_1', 'hs_analytics_source_data_2'];
  const available = [];
  for (const prop of properties) {
    const hasValues = contacts.some(c => c.properties[prop]);
    if (hasValues) available.push(prop);
  }
  return available;
}

module.exports = {
  calculateWinRate, calculateAverageDealSize, calculateSalesCycle, calculateOpenPipelineValue,
  calculateNewDealsCount, calculateStageConversion, calculateBiggestDropoff,
  calculateTimeToFirstTouch, calculateNoTouchCount, calculateTouchesPerDeal,
  calculateRevenueBySource, calculateSourceQuality, detectSourceProperties, median, mean,
};
