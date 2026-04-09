const BASE = process.env.REACT_APP_API_URL || '';
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
  getFunnel: (days) => apiFetch(`/api/funnel${days?`?days=${days}`:''}`),
  getInsights: (days) => apiFetch(`/api/insights${days?`?days=${days}`:''}`),
  getLeadScores: () => apiFetch('/api/leads/scores'),
  getRevenue: () => apiFetch('/api/revenue'),
  sendChat: (message, history) => apiFetch('/api/chat', {method:'POST', body:JSON.stringify({message, conversationHistory:history})}),
  exportLeadsCSV: () => apiDownload('/api/export/leads-csv'),
  exportFunnelCSV: () => apiDownload('/api/export/funnel-csv'),
  exportInsightsText: () => apiDownload('/api/export/insights-text'),
  ga4Status: () => apiFetch('/ga4/status'),
};
