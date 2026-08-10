const express = require('express');
const router = express.Router();
const axios = require('axios');
const HubSpotService = require('../services/hubspot');
const db = require('../services/db');

// Read-only: PipeChamp only reads HubSpot data, never writes. Keep least-privilege for marketplace review.
const SCOPES = ['crm.objects.contacts.read','crm.objects.deals.read','crm.objects.owners.read'].join(' ');

router.get('/connect', (req, res) => {
  const params = new URLSearchParams({ client_id:process.env.HUBSPOT_CLIENT_ID, redirect_uri:process.env.HUBSPOT_REDIRECT_URI, scope:SCOPES, response_type:'code' });
  res.redirect(`https://app.hubspot.com/oauth/authorize?${params}`);
});

router.get('/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.redirect(`${process.env.FRONTEND_URL}?error=no_code`);
  try {
    const r = await axios.post('https://api.hubapi.com/oauth/v1/token',
      new URLSearchParams({ grant_type:'authorization_code', client_id:process.env.HUBSPOT_CLIENT_ID, client_secret:process.env.HUBSPOT_CLIENT_SECRET, redirect_uri:process.env.HUBSPOT_REDIRECT_URI, code }),
      { headers: { 'Content-Type':'application/x-www-form-urlencoded' } }
    );
    req.session.tokens = { access_token:r.data.access_token, refresh_token:r.data.refresh_token, expires_at: Date.now()+(r.data.expires_in*1000) };
    res.redirect(`${process.env.FRONTEND_URL}?connected=true`);
  } catch (err) {
    console.error('OAuth error:', err.response?.data || err.message);
    res.redirect(`${process.env.FRONTEND_URL}?error=oauth_failed`);
  }
});

router.get('/status', (req, res) => res.json({ connected: !!req.session.tokens }));

// Disconnect: revoke the token on HubSpot's side (so PipeChamp is removed from the
// account's Connected Apps) and purge that portal's stored data. HubSpot has no
// uninstall webhook — revoking the refresh token is the supported disconnect path.
router.post('/disconnect', async (req, res) => {
  const tokens = req.session?.tokens;
  const sessionId = req.session?.id;
  try {
    if (tokens?.access_token) {
      try {
        const portalId = await new HubSpotService(tokens.access_token).getPortalId();
        if (portalId) await db.deletePortal(portalId);
      } catch { /* best-effort data purge */ }
    }
    if (tokens?.refresh_token) {
      await axios.delete(`https://api.hubapi.com/oauth/v1/refresh-tokens/${tokens.refresh_token}`)
        .catch(() => { /* already revoked / network — nothing to do */ });
    }
  } finally {
    HubSpotService.invalidateCache(sessionId);
    req.session = null;
    res.json({ success: true });
  }
});

module.exports = router;
