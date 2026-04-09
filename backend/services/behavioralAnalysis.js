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

module.exports = { analyzeBySource, analyzeActivityLevels, analyzeSpeedToLead };
