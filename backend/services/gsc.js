/**
 * Google Search Console data access — fills the funnel's Impressions stage.
 * Reuses the same Google OAuth app as GA4 (GA4_CLIENT_ID/SECRET) unless GSC-
 * specific creds are set. Tokens + selected site live in the session (no DB).
 */
const axios = require('axios');

const CLIENT_ID = () => process.env.GSC_CLIENT_ID || process.env.GA4_CLIENT_ID;
const CLIENT_SECRET = () => process.env.GSC_CLIENT_SECRET || process.env.GA4_CLIENT_SECRET;

async function refreshAccessToken(tokens) {
  const r = await axios.post('https://oauth2.googleapis.com/token', {
    grant_type: 'refresh_token', refresh_token: tokens.refresh_token,
    client_id: CLIENT_ID(), client_secret: CLIENT_SECRET(),
  });
  tokens.access_token = r.data.access_token;
  return tokens.access_token;
}

async function gscCall(session, url, method = 'get', data) {
  const run = (token) => axios({ method, url, data, headers: { Authorization: `Bearer ${token}` } });
  try {
    return await run(session.gscTokens.access_token);
  } catch (e) {
    if (e.response?.status === 401 && session.gscTokens.refresh_token) {
      const t = await refreshAccessToken(session.gscTokens);
      return await run(t);
    }
    throw e;
  }
}

// Verified Search Console sites the account can read.
async function listSites(session) {
  const r = await gscCall(session, 'https://www.googleapis.com/webmasters/v3/sites');
  return (r.data.siteEntry || [])
    .filter(s => s.permissionLevel && s.permissionLevel !== 'siteUnverifiedUser')
    .map(s => ({ siteUrl: s.siteUrl, permission: s.permissionLevel }));
}

const ymd = d => d.toISOString().slice(0, 10);

// Impressions/clicks/CTR + top queries for the last `days` (GSC lags ~3 days).
async function getImpressions(session, siteUrl, days = 30) {
  const end = new Date(Date.now() - 3 * 86400000);
  const start = new Date(end.getTime() - days * 86400000);
  const base = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;

  const totals = await gscCall(session, base, 'post', { startDate: ymd(start), endDate: ymd(end), dimensions: ['date'] });
  const rows = totals.data.rows || [];
  const impressions = rows.reduce((s, r) => s + (r.impressions || 0), 0);
  const clicks = rows.reduce((s, r) => s + (r.clicks || 0), 0);

  let topQueries = [];
  try {
    const q = await gscCall(session, base, 'post', { startDate: ymd(start), endDate: ymd(end), dimensions: ['query'], rowLimit: 6 });
    topQueries = (q.data.rows || []).map(r => ({ query: r.keys[0], impressions: Math.round(r.impressions || 0), clicks: Math.round(r.clicks || 0) }));
  } catch { /* queries optional */ }

  return {
    days,
    impressions: Math.round(impressions),
    clicks: Math.round(clicks),
    ctr: impressions > 0 ? Math.round((clicks / impressions) * 1000) / 10 : 0,
    topQueries,
    startDate: ymd(start),
    endDate: ymd(end),
  };
}

module.exports = { listSites, getImpressions };
