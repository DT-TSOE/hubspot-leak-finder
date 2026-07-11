/**
 * Revenue insights that go beyond LTV: why deals lose, how long win vs lose
 * takes, and which job titles actually close revenue (Dan's "aha" moments).
 */
const { median } = require('./metricCalculations');

const fmtLabel = s => s ? String(s).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : s;

// Why deals lose: breakdown of closed-lost deals by closed_lost_reason.
function lostReasonBreakdown(deals) {
  const lost = deals.filter(d => d.properties.dealstage === 'closedlost');
  if (lost.length < 3) return { total: lost.length, reasons: [], insufficient: true };
  const map = {};
  for (const d of lost) {
    const reason = d.properties.closed_lost_reason || 'No reason logged';
    const amount = parseFloat(d.properties.amount || '0') || 0;
    if (!map[reason]) map[reason] = { reason: fmtLabel(reason), count: 0, value: 0, hasReason: !!d.properties.closed_lost_reason };
    map[reason].count++;
    map[reason].value += amount;
  }
  const reasons = Object.values(map)
    .map(r => ({ ...r, value: Math.round(r.value), pct: Math.round((r.count / lost.length) * 100) }))
    .sort((a, b) => b.count - a.count);
  const logged = lost.filter(d => d.properties.closed_lost_reason).length;
  return { total: lost.length, reasons, loggedPct: Math.round((logged / lost.length) * 100) };
}

// Time to win vs time to lose: how long each outcome takes (median days).
function winLoseTiming(deals) {
  const cycle = (d) => {
    const created = new Date(d.properties.createdate).getTime();
    const closed = new Date(d.properties.closedate).getTime();
    if (isNaN(created) || isNaN(closed)) return null;
    const days = (closed - created) / 86400000;
    return days > 0 && days < 730 ? days : null;
  };
  const wonDays = deals.filter(d => d.properties.dealstage === 'closedwon').map(cycle).filter(v => v !== null);
  const lostDays = deals.filter(d => d.properties.dealstage === 'closedlost').map(cycle).filter(v => v !== null);
  return {
    winMedianDays: wonDays.length >= 3 ? Math.round(median(wonDays)) : null,
    loseMedianDays: lostDays.length >= 3 ? Math.round(median(lostDays)) : null,
    wonSample: wonDays.length,
    lostSample: lostDays.length,
  };
}

// Revenue by job title: which buyers actually close. Uses the primary contact
// on each won deal (via _contactIds) mapped to its jobtitle.
function revenueByJobTitle(deals, contacts) {
  const contactMap = {};
  contacts.forEach(c => { contactMap[c.id] = c; });
  const won = deals.filter(d => d.properties.dealstage === 'closedwon');
  const map = {};
  for (const d of won) {
    const cId = (d._contactIds || [])[0];
    const c = cId ? contactMap[cId] : null;
    const title = (c?.properties?.jobtitle || '').trim() || 'Not set';
    const amount = parseFloat(d.properties.amount || '0') || 0;
    if (!map[title]) map[title] = { title, deals: 0, revenue: 0 };
    map[title].deals++;
    map[title].revenue += amount;
  }
  const rows = Object.values(map)
    .map(r => ({ ...r, revenue: Math.round(r.revenue), avgDeal: r.deals ? Math.round(r.revenue / r.deals) : 0 }))
    .sort((a, b) => b.revenue - a.revenue);
  // Only worth showing if job titles are actually populated on some deals.
  const titled = rows.filter(r => r.title !== 'Not set');
  if (titled.length === 0) return { rows: [], hasTitles: false };
  return { rows: rows.slice(0, 8), hasTitles: true };
}

module.exports = { lostReasonBreakdown, winLoseTiming, revenueByJobTitle };
