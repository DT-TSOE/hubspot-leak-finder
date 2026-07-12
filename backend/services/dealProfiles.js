/**
 * "Your best deals look like this" - behavioral profiles of winning segments.
 *
 * Deliberately BEHAVIORAL only (source, speed-to-lead, touches, stage
 * discipline, value/cycle) - no personas / job titles / firmographics. Those
 * are held for the future customer-analysis app; here we surface an interest CTA.
 *
 * Statistically careful: percentile SEGMENTS (top ~25%, never the single top
 * deal), medians + IQR ranges (not means), modes for categories, sample gates.
 */

const MIN_WON = 12;      // don't profile below this many won deals
const MIN_SEGMENT = 5;   // don't describe a segment below this

const num = arr => arr.filter(v => v != null && !isNaN(v)).sort((a, b) => a - b);
function percentile(sorted, q) {
  if (!sorted.length) return null;
  const idx = (sorted.length - 1) * q;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}
const median = sorted => percentile(sorted, 0.5);

// Most common category value + its share.
function topShare(values) {
  const counts = {};
  for (const v of values) { const k = v || 'Unknown'; counts[k] = (counts[k] || 0) + 1; }
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return null;
  const [value, n] = entries[0];
  return { value, pct: Math.round((n / values.length) * 100), second: entries[1]?.[0] || null };
}

function fmtSrc(s) { return s ? String(s).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : s; }

function profileOf(subset) {
  const sample = subset.length;
  const speed = num(subset.map(d => d.speedHours));
  const touches = num(subset.map(d => d.touches));
  const stages = num(subset.map(d => d.stagesEntered));
  const amounts = num(subset.map(d => d.amount));
  const cycles = num(subset.map(d => d.cycleDays));
  const src = topShare(subset.map(d => d.source).filter(Boolean));

  return {
    sample,
    source: src ? { label: fmtSrc(src.value), pct: src.pct, second: src.second ? fmtSrc(src.second) : null } : null,
    speedHours: speed.length >= 3 ? { p25: Math.round(percentile(speed, 0.25) * 10) / 10, median: Math.round(median(speed) * 10) / 10, p75: Math.round(percentile(speed, 0.75) * 10) / 10 } : null,
    touches: touches.length >= 3 ? { p25: Math.round(percentile(touches, 0.25)), median: Math.round(median(touches)), p75: Math.round(percentile(touches, 0.75)) } : null,
    stagesEntered: stages.length >= 3 ? Math.round(median(stages)) : null,
    valueRange: amounts.length ? { p25: Math.round(percentile(amounts, 0.25)), median: Math.round(median(amounts)), p90: Math.round(percentile(amounts, 0.9)) } : null,
    cycleRange: cycles.length >= 3 ? { p25: Math.round(percentile(cycles, 0.25)), median: Math.round(median(cycles)), p75: Math.round(percentile(cycles, 0.75)) } : null,
  };
}

function buildDealProfiles(dealsWithContacts, contacts, stageHistoryById = {}) {
  const contactMap = {};
  (contacts || []).forEach(c => { contactMap[c.id] = c; });

  const won = [];
  for (const d of (dealsWithContacts || [])) {
    if (d.properties.dealstage !== 'closedwon') continue;
    const amount = parseFloat(d.properties.amount || '0');
    if (!(amount > 0)) continue;
    const created = new Date(d.properties.createdate).getTime();
    const closed = new Date(d.properties.closedate).getTime();
    const cycleDays = (!isNaN(created) && !isNaN(closed) && closed > created && (closed - created) < 730 * 86400000)
      ? Math.round((closed - created) / 86400000) : null;
    const c = (d._contactIds || []).map(id => contactMap[id]).find(Boolean);
    let speedHours = null, touches = null, source = null;
    if (c) {
      source = c.properties.hs_analytics_source || null;
      touches = c.properties.num_contacted_notes != null ? parseInt(c.properties.num_contacted_notes) : null;
      const cc = new Date(c.properties.createdate).getTime();
      const ft = c.properties.notes_last_contacted ? new Date(c.properties.notes_last_contacted).getTime() : null;
      if (ft && !isNaN(cc)) { const h = (ft - cc) / 3600000; if (h > 0 && h < 720) speedHours = Math.round(h * 10) / 10; }
    }
    const stagesEntered = stageHistoryById[d.id]?.length || null;
    won.push({ amount, cycleDays, source, speedHours, touches, stagesEntered });
  }

  if (won.length < MIN_WON) return { insufficient: true, wonCount: won.length, minWon: MIN_WON };

  // Highest-value: top quartile by amount (never a single deal).
  const byValue = [...won].sort((a, b) => b.amount - a.amount);
  const vN = Math.max(MIN_SEGMENT, Math.ceil(byValue.length * 0.25));
  const highestValue = profileOf(byValue.slice(0, vN));

  // Fastest closes: bottom quartile by cycle days.
  const withCycle = won.filter(d => d.cycleDays != null).sort((a, b) => a.cycleDays - b.cycleDays);
  const fastestClose = withCycle.length >= MIN_SEGMENT
    ? profileOf(withCycle.slice(0, Math.max(MIN_SEGMENT, Math.ceil(withCycle.length * 0.25))))
    : null;

  return { wonCount: won.length, highestValue, fastestClose };
}

module.exports = { buildDealProfiles };
