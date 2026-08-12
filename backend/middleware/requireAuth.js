const axios = require('axios');
const db = require('../services/db');

async function requireAuth(req, res, next) {
  if (!req.session?.tokens?.access_token) return res.status(401).json({ error: 'Not authenticated.' });

  const expiresAt = req.session.tokens.expires_at;
  if (expiresAt && Date.now() > expiresAt - 300000) {
    try {
      const r = await axios.post('https://api.hubapi.com/oauth/v1/token',
        new URLSearchParams({ grant_type:'refresh_token', client_id:process.env.HUBSPOT_CLIENT_ID, client_secret:process.env.HUBSPOT_CLIENT_SECRET, refresh_token:req.session.tokens.refresh_token }),
        { headers: { 'Content-Type':'application/x-www-form-urlencoded' } }
      );
      const tokens = { access_token:r.data.access_token, refresh_token:r.data.refresh_token, expires_at: Date.now() + (r.data.expires_in*1000) };
      req.session.tokens = tokens;
      // Keep the cache key aligned with the refreshed token, and persist the new
      // tokens for the active portal so the DB list stays current.
      req.session.id = 'cs_' + tokens.access_token.slice(-16);
      if (db.enabled() && req.session.sid && req.session.activePortalId) {
        db.updateConnectionTokens(req.session.sid, req.session.activePortalId, {
          accessToken: tokens.access_token, refreshToken: tokens.refresh_token, expiresAt: tokens.expires_at,
        }).catch(() => {});
      }
    } catch {
      // Refresh failed — tokens were revoked (user uninstalled the app in HubSpot) or expired.
      req.session = null; // cookie-session: null clears it (there is no .destroy())
      return res.status(401).json({ error: 'Session expired. Please reconnect.' });
    }
  }
  next();
}

module.exports = requireAuth;
