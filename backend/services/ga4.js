/**
 * Google Analytics 4 data access.
 * OAuth connect/callback live in routes/ga4.js; this fetches traffic once a user
 * has connected and selected a property. Access tokens are refreshed on 401
 * using the stored refresh_token (session-held, no DB).
 */
const axios = require('axios');

async function refreshAccessToken(tokens) {
  const r = await axios.post('https://oauth2.googleapis.com/token', {
    grant_type: 'refresh_token',
    refresh_token: tokens.refresh_token,
    client_id: process.env.GA4_CLIENT_ID,
    client_secret: process.env.GA4_CLIENT_SECRET,
  });
  tokens.access_token = r.data.access_token;
  return tokens.access_token;
}

// Call a Google API with the session's token; refresh + retry once on 401.
async function ga4Call(session, url, method = 'get', data) {
  const run = (token) => axios({ method, url, data, headers: { Authorization: `Bearer ${token}` } });
  try {
    return await run(session.ga4Tokens.access_token);
  } catch (e) {
    if (e.response?.status === 401 && session.ga4Tokens.refresh_token) {
      const t = await refreshAccessToken(session.ga4Tokens);
      return await run(t);
    }
    throw e;
  }
}

// All GA4 properties the connected Google account can read.
async function listProperties(session) {
  const r = await ga4Call(session, 'https://analyticsadmin.googleapis.com/v1beta/accountSummaries');
  const props = [];
  for (const acc of (r.data.accountSummaries || [])) {
    for (const p of (acc.propertySummaries || [])) {
      props.push({ id: String(p.property || '').replace('properties/', ''), name: p.displayName, account: acc.displayName });
    }
  }
  return props;
}

// Traffic totals + breakdown by default channel group for the last `days`.
async function getTraffic(session, propertyId, days = 30) {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;
  const body = {
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
    dimensions: [{ name: 'sessionDefaultChannelGroup' }],
    metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
    limit: 25,
  };
  const r = await ga4Call(session, url, 'post', body);
  const byChannel = (r.data.rows || []).map(row => ({
    channel: row.dimensionValues?.[0]?.value || 'Unknown',
    sessions: Number(row.metricValues?.[0]?.value || 0),
    users: Number(row.metricValues?.[1]?.value || 0),
  })).sort((a, b) => b.sessions - a.sessions);
  return {
    days,
    totalSessions: byChannel.reduce((s, r) => s + r.sessions, 0),
    totalUsers: byChannel.reduce((s, r) => s + r.users, 0),
    byChannel,
  };
}

module.exports = { listProperties, getTraffic };
