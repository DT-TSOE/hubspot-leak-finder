const MIN_SAMPLE = 3;

function analyzeBySource(contacts, deals) {
  const outcomes = {};
  for (const deal of deals) {
    if (!deal._contactIds) continue;
    const isWon = deal.properties.dealstage === 'closedwon';
    const isClosed = isWon || deal.properties.dealstage === 'closedlost';
    if (!isClosed) continue;
    for (const cId of deal._contactIds) {
      if (!outcomes[cId]) outcomes[cId] = { won: false, lost: false };
      if (isWon) outcomes[cId].won = true; else outcomes[cId].lost = true;
    }
  }

  const sourceStats = {};
  for (const c of contacts) {
    const o = outcomes[c.id];
    if (!o) continue;
    const source = c.properties.hs_analytics_source || 'Unknown';
    if (!sourceStats[source]) sourceStats[source] = { won: 0, lost: 0, total: 0 };
    sourceStats[source].total++;
    if (o.won) sourceStats[source].won++;
    if (o.lost && !o.won) sourceStats[source].lost++;
  }

  return Object.entries(sourceStats)
    .filter(([,s]) => s.total >= MIN_SAMPLE)
    .map(([source, s]) => ({ source, won: s.won, lost: s.lost, total: s.total, winRate: Math.round((s.won/s.total)*1000)/10 }))
    .sort((a,b) => b.winRate - a.winRate);
}

function analyzeActivityLevels(contacts, deals) {
  const outcomes = {};
  for (const deal of deals) {
    if (!deal._contactIds) continue;
    const isWon = deal.properties.dealstage === 'closedwon';
    const isClosed = isWon || deal.properties.dealstage === 'closedlost';
    if (!isClosed) continue;
    for (const cId of deal._contactIds) {
      if (!outcomes[cId]) outcomes[cId] = 'lost';
      if (isWon) outcomes[cId] = 'won';
    }
  }
  const wonT = [], lostT = [];
  for (const c of contacts) {
    const o = outcomes[c.id];
    if (!o) continue;
    const t = parseInt(c.properties.num_contacted_notes || '0', 10);
    if (o === 'won') wonT.push(t); else lostT.push(t);
  }
  const med = arr => { if (!arr.length) return null; const s=[...arr].sort((a,b)=>a-b); const m=Math.floor(s.length/2); return s.length%2!==0?s[m]:(s[m-1]+s[m])/2; };
  return {
    wonMedianTouches: wonT.length >= MIN_SAMPLE ? Math.round(med(wonT)*10)/10 : null,
    lostMedianTouches: lostT.length >= MIN_SAMPLE ? Math.round(med(lostT)*10)/10 : null,
    wonSampleSize: wonT.length, lostSampleSize: lostT.length
  };
}

function analyzeSpeedToLead(contacts, deals) {
  const outcomes = {};
  for (const deal of deals) {
    if (!deal._contactIds) continue;
    const isWon = deal.properties.dealstage === 'closedwon';
    const isClosed = isWon || deal.properties.dealstage === 'closedlost';
    if (!isClosed) continue;
    for (const cId of deal._contactIds) {
      if (!outcomes[cId]) outcomes[cId] = 'lost';
      if (isWon) outcomes[cId] = 'won';
    }
  }
  const wonS = [], lostS = [];
  for (const c of contacts) {
    const o = outcomes[c.id];
    if (!o) continue;
    const created = new Date(c.properties.createdate);
    const lc = c.properties.notes_last_contacted ? new Date(c.properties.notes_last_contacted) : null;
    if (!lc || isNaN(created)) continue;
    const hours = (lc - created) / 3600000;
    if (hours < 0 || hours > 720) continue;
    if (o === 'won') wonS.push(hours); else lostS.push(hours);
  }
  const med = arr => { if (!arr.length) return null; const s=[...arr].sort((a,b)=>a-b); const m=Math.floor(s.length/2); return s.length%2!==0?s[m]:(s[m-1]+s[m])/2; };
  return {
    wonMedianHours: wonS.length >= MIN_SAMPLE ? Math.round(med(wonS)*10)/10 : null,
    lostMedianHours: lostS.length >= MIN_SAMPLE ? Math.round(med(lostS)*10)/10 : null,
    wonSampleSize: wonS.length, lostSampleSize: lostS.length
  };
}

// For each lifecycle stage, compare contacts that advanced vs those that dropped off
// Returns behavioral patterns that predict advancement
function analyzeStageInsights(contacts) {
  const now = Date.now();
  const STAGES = [
    { key: 'lead',                   label: 'Lead',        nextLabel: 'MQL',         dateField: 'hs_lifecyclestage_lead_date',                    nextField: 'hs_lifecyclestage_marketingqualifiedlead_date' },
    { key: 'marketingqualifiedlead', label: 'MQL',         nextLabel: 'SQL',         dateField: 'hs_lifecyclestage_marketingqualifiedlead_date',    nextField: 'hs_lifecyclestage_salesqualifiedlead_date' },
    { key: 'salesqualifiedlead',     label: 'SQL',         nextLabel: 'Opportunity', dateField: 'hs_lifecyclestage_salesqualifiedlead_date',        nextField: 'hs_lifecyclestage_opportunity_date' },
    { key: 'opportunity',            label: 'Opportunity', nextLabel: 'Customer',    dateField: 'hs_lifecyclestage_opportunity_date',               nextField: 'hs_lifecyclestage_customer_date' },
  ];

  const med = arr => { if (!arr.length) return null; const s=[...arr].sort((a,b)=>a-b); const m=Math.floor(s.length/2); return s.length%2!==0?s[m]:(s[m-1]+s[m])/2; };
  const avg = arr => arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length*10)/10 : null;

  const insights = [];
  for (const stage of STAGES) {
    const entered = contacts.filter(c => c.properties[stage.dateField]);
    if (entered.length < MIN_SAMPLE) continue;

    const advanced = entered.filter(c => c.properties[stage.nextField]);
    const dropped  = entered.filter(c => !c.properties[stage.nextField]);
    if (advanced.length < MIN_SAMPLE && dropped.length < MIN_SAMPLE) continue;

    const getDays = (c, endField) => {
      const start = new Date(c.properties[stage.dateField]).getTime();
      const end = endField && c.properties[endField] ? new Date(c.properties[endField]).getTime() : now;
      const d = (end - start) / 86400000;
      return d > 0 && d < 730 ? d : null;
    };
    const getTouches = c => parseInt(c.properties.num_contacted_notes || '0', 10);

    const advDays    = advanced.map(c => getDays(c, stage.nextField)).filter(Boolean);
    const dropDays   = dropped.map(c => getDays(c, null)).filter(Boolean);
    const advTouches = advanced.map(getTouches);
    const dropTouches= dropped.map(getTouches);

    const advMedianDays    = med(advDays);
    const dropMedianDays   = med(dropDays);
    const advMedianTouches = med(advTouches);
    const dropMedianTouches= med(dropTouches);

    // Generate a plain-English predictor message
    let predictor = null;
    if (advMedianTouches != null && dropMedianTouches != null && advMedianTouches > dropMedianTouches * 1.5) {
      const ratio = Math.round((advMedianTouches / Math.max(dropMedianTouches, 0.5)) * 10) / 10;
      predictor = `Contacts that advance to ${stage.nextLabel} receive ${ratio}x more outreach touches (${advMedianTouches} vs ${dropMedianTouches} median). More consistent follow-up is the strongest predictor of advancement here.`;
    } else if (advMedianDays != null && dropMedianDays != null && advMedianDays < dropMedianDays * 0.6) {
      predictor = `Contacts that advance to ${stage.nextLabel} do so in a median ${Math.round(advMedianDays)} days. Contacts sitting beyond ${Math.round(advMedianDays * 2)} days are very unlikely to progress without intervention.`;
    } else if (advMedianTouches != null && dropMedianTouches != null) {
      predictor = `Advanced contacts have ${advMedianTouches} median touches vs ${dropMedianTouches} for those who stalled. Touch frequency is a leading indicator at this stage.`;
    }

    insights.push({
      stage: stage.key, label: stage.label, nextLabel: stage.nextLabel,
      total: entered.length,
      advanced: { count: advanced.length, medianDaysToAdvance: advMedianDays ? Math.round(advMedianDays) : null, medianTouches: advMedianTouches },
      dropped:  { count: dropped.length,  medianDaysStuck: dropMedianDays ? Math.round(dropMedianDays) : null, medianTouches: dropMedianTouches },
      predictor,
    });
  }
  return insights;
}

// Compare first half vs second half of the selected period to detect trends
function analyzePipelineTrend(contacts, days) {
  if (!days || contacts.length < 6) return null;
  const daysInt = parseInt(days);
  const now = Date.now();
  const periodStart = now - daysInt * 86400000;
  const midpoint = periodStart + (daysInt / 2) * 86400000;

  const inPeriod = contacts.filter(c => {
    const created = new Date(c.properties.createdate).getTime();
    return created >= periodStart;
  });
  if (inPeriod.length < 6) return null;

  const firstHalf  = inPeriod.filter(c => new Date(c.properties.createdate).getTime() < midpoint);
  const secondHalf = inPeriod.filter(c => new Date(c.properties.createdate).getTime() >= midpoint);
  if (firstHalf.length < 3 || secondHalf.length < 3) return null;

  const mqlRate = arr => {
    const mqls = arr.filter(c => c.properties.hs_lifecyclestage_marketingqualifiedlead_date).length;
    return arr.length > 0 ? Math.round((mqls / arr.length) * 1000) / 10 : 0;
  };
  const customerRate = arr => {
    const customers = arr.filter(c => c.properties.lifecyclestage === 'customer').length;
    return arr.length > 0 ? Math.round((customers / arr.length) * 1000) / 10 : 0;
  };

  const firstMQL  = mqlRate(firstHalf);
  const secondMQL = mqlRate(secondHalf);
  const change    = Math.round((secondMQL - firstMQL) * 10) / 10;

  return {
    periodDays: daysInt,
    firstHalf:  { count: firstHalf.length,  mqlRate: firstMQL },
    secondHalf: { count: secondHalf.length, mqlRate: secondMQL },
    change,
    direction: Math.abs(change) < 2 ? 'stable' : change > 0 ? 'improving' : 'declining',
  };
}

module.exports = { analyzeBySource, analyzeActivityLevels, analyzeSpeedToLead, analyzeStageInsights, analyzePipelineTrend };
