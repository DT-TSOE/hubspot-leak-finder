const axios = require('axios');
const db = require('../services/db');
const HubSpotService = require('../services/hubspot');

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
      // Refresh failed → the token was revoked (the user uninstalled PipeChamp in
      // HubSpot, or revoked it in Connected Apps) or it expired. HubSpot sends no
      // uninstall webhook — a failed refresh IS the uninstall signal — so treat it
      // as an uninstall of the active account and purge that account's stored data.
      const sid = req.session?.sid;
      const deadPortal = req.session?.activePortalId;
      HubSpotService.invalidateCache(req.session?.id);
      if (deadPortal) {
        db.deletePortal(deadPortal).catch(() => {});           // aggregate snapshots
        if (sid) await db.deleteConnection(sid, deadPortal).catch(() => {}); // connection + token
      }
      // If the user has other HubSpot accounts still connected, fall back to one
      // and keep them signed in; otherwise end the session.
      if (db.enabled() && sid) {
        const remaining = await db.listConnections(sid).catch(() => []);
        const fallback = remaining.find(c => c.portal_id !== deadPortal);
        if (fallback) {
          req.session.tokens = { access_token: fallback.access_token, refresh_token: fallback.refresh_token, expires_at: Number(fallback.expires_at) || 0 };
          req.session.activePortalId = fallback.portal_id;
          req.session.id = 'cs_' + fallback.access_token.slice(-16);
          return next();
        }
      }
      req.session = null; // cookie-session: null clears it (there is no .destroy())
      return res.status(401).json({ error: 'Session expired. Please reconnect.' });
    }
  }
  next();
}

module.exports = requireAuth;
