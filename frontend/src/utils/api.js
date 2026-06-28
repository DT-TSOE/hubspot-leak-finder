const BASE = process.env.REACT_APP_API_URL || '';

// Convert a dateFilter value (null | number | {start,end}) to query params
function dateParams(filter) {
  if (!filter) return {};
  if (typeof filter === 'number') return { days: filter };
  if (filter.start && filter.end) return { startDate: filter.start, endDate: filter.end };
  return {};
}

function qs(params) {
  const p = Object.entries(params).filter(([,v]) => v != null).map(([k,v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  return p ? `?${p}` : '';
}

async function apiFetch(path, opts = {}) {
  const res = await fetch(BASE + path, { credentials:'include', headers:{'Content-Type':'application/json'}, ...opts });
  if (!res.ok) { const err = await res.json().catch(()=>({})); throw new Error(err.error||`HTTP ${res.status}`); }
  return res.json();
}

async function apiDownload(path) {
  const res = await fetch(BASE + path, { credentials:'include' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const match = (res.headers.get('Content-Disposition')||'').match(/filename="?([^"]+)"?/);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=match?match[1]:'export'; a.click(); URL.revokeObjectURL(url);
}

export const api = {
  authStatus: () => apiFetch('/auth/status'),
  disconnect: () => apiFetch('/auth/disconnect', {method:'POST'}),
  getFunnel:       (f) => apiFetch(`/api/funnel${qs(dateParams(f))}`),
  getInsights:     (f) => apiFetch(`/api/insights${qs(dateParams(f))}`),
  getLeadScores:   (f) => apiFetch(`/api/leads/scores${qs(dateParams(f))}`),
  getRevenue:      (f) => apiFetch(`/api/revenue${qs(dateParams(f))}`),
  getAlerts: () => apiFetch('/api/alerts'),
  saveAlertPrefs: (prefs) => apiFetch('/api/alerts/preferences', {method:'POST', body:JSON.stringify(prefs)}),
  sendChat: (message, history) => apiFetch('/api/chat', {method:'POST', body:JSON.stringify({message, conversationHistory:history})}),
  exportLeadsCSV: () => apiDownload('/api/export/leads-csv'),
  exportFunnelCSV: () => apiDownload('/api/export/funnel-csv'),
  exportInsightsText: () => apiDownload('/api/export/insights-text'),
  ga4Status: () => apiFetch('/ga4/status'),
  getGmDashboard:  (f) => apiFetch(`/api/reports/gm-dashboard${qs(dateParams(f))}`),
  getMetricTiles:  (f) => apiFetch(`/api/reports/metric-tiles${qs(dateParams(f))}`),
  getSourceQuality:(property, f) => apiFetch(`/api/reports/source-quality${qs({property, ...dateParams(f)})}`),
  getStageAging:   (f) => apiFetch(`/api/reports/stage-aging${qs(dateParams(f))}`),
  getSpeedToLead:  (f) => apiFetch(`/api/reports/speed-to-lead${qs(dateParams(f))}`),
};
