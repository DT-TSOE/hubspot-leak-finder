/**
 * Behavioral Analysis Service
 * Compares won vs lost contacts to surface behavioral differences.
 */

const MIN_SAMPLE = 5;

function analyzeBySource(contacts, deals) {
  // Map deal outcomes to contacts
  const contactOutcomes = {};

  for (const deal of deals) {
    if (!deal._contactIds) continue;
    const isWon = deal.properties.hs_is_closed_won === 'true';
    const isClosed = deal.properties.hs_is_closed === 'true';
    if (!isClosed) continue;

    for (const cId of deal._contactIds) {
      if (!contactOutcomes[cId]) contactOutcomes[cId] = { won: false, lost: false };
      if (isWon) contactOutcomes[cId].won = true;
      else contactOutcomes[cId].lost = true;
    }
  }

  // Group by source
  const sourceStats = {};

  for (const contact of contacts) {
    const outcome = contactOutcomes[contact.id];
    if (!outcome) continue;
    const source = contact.properties.hs_analytics_source || 'Unknown';

    if (!sourceStats[source]) {
      sourceStats[source] = { won: 0, lost: 0, total: 0 };
    }
    sourceStats[source].total++;
    if (outcome.won) sourceStats[source].won++;
    if (outcome.lost && !outcome.won) sourceStats[source].lost++;
  }

  // Calculate win rates per source
  const sourceResults = Object.entries(sourceStats)
    .filter(([, s]) => s.total >= MIN_SAMPLE)
    .map(([source, s]) => ({
      source,
      won: s.won,
      lost: s.lost,
      total: s.total,
      winRate: Math.round((s.won / s.total) * 1000) / 10
    }))
    .sort((a, b) => b.winRate - a.winRate);

  return sourceResults;
}

function analyzeActivityLevels(contacts, deals) {
  // Map outcomes
  const contactOutcomes = {};
  for (const deal of deals) {
    if (!deal._contactIds) continue;
    const isWon = deal.properties.hs_is_closed_won === 'true';
    const isClosed = deal.properties.hs_is_closed === 'true';
    if (!isClosed) continue;
    for (const cId of deal._contactIds) {
      if (!contactOutcomes[cId]) contactOutcomes[cId] = 'lost';
      if (isWon) contactOutcomes[cId] = 'won';
    }
  }

  const wonTouches = [];
  const lostTouches = [];

  for (const contact of contacts) {
    const outcome = contactOutcomes[contact.id];
    if (!outcome) continue;
    const touches = parseInt(contact.properties.num_contacted_notes || '0', 10);
    if (outcome === 'won') wonTouches.push(touches);
    else lostTouches.push(touches);
  }

  function median(arr) {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 !== 0 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  return {
    wonMedianTouches: wonTouches.length >= MIN_SAMPLE ? Math.round(median(wonTouches) * 10) / 10 : null,
    lostMedianTouches: lostTouches.length >= MIN_SAMPLE ? Math.round(median(lostTouches) * 10) / 10 : null,
    wonSampleSize: wonTouches.length,
    lostSampleSize: lostTouches.length
  };
}

function analyzeSpeedToLead(contacts, deals) {
  // Speed to lead: time from createdate to first contact
  const contactOutcomes = {};
  for (const deal of deals) {
    if (!deal._contactIds) continue;
    const isWon = deal.properties.hs_is_closed_won === 'true';
    const isClosed = deal.properties.hs_is_closed === 'true';
    if (!isClosed) continue;
    for (const cId of deal._contactIds) {
      if (!contactOutcomes[cId]) contactOutcomes[cId] = 'lost';
      if (isWon) contactOutcomes[cId] = 'won';
    }
  }

  const wonSpeeds = [];
  const lostSpeeds = [];

  for (const contact of contacts) {
    const outcome = contactOutcomes[contact.id];
    if (!outcome) continue;
    const created = new Date(contact.properties.createdate);
    const lastContacted = contact.properties.notes_last_contacted
      ? new Date(contact.properties.notes_last_contacted)
      : null;

    if (!lastContacted || isNaN(created)) continue;
    const hoursToContact = (lastContacted - created) / (1000 * 60 * 60);
    if (hoursToContact < 0 || hoursToContact > 30 * 24) continue; // ignore outliers

    if (outcome === 'won') wonSpeeds.push(hoursToContact);
    else lostSpeeds.push(hoursToContact);
  }

  function median(arr) {
    if (!arr.length) return null;
    const s = [...arr].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 !== 0 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  return {
    wonMedianHours: wonSpeeds.length >= MIN_SAMPLE ? Math.round(median(wonSpeeds) * 10) / 10 : null,
    lostMedianHours: lostSpeeds.length >= MIN_SAMPLE ? Math.round(median(lostSpeeds) * 10) / 10 : null,
    wonSampleSize: wonSpeeds.length,
    lostSampleSize: lostSpeeds.length
  };
}

module.exports = { analyzeBySource, analyzeActivityLevels, analyzeSpeedToLead };
