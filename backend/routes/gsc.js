const express = require('express');
const router = express.Router();
const axios = require('axios');
const requireAuth = require('../middleware/requireAuth');
const gscsvc = require('../services/gsc');

// Reuse the GA4 Google app credentials unless GSC-specific ones are provided.
const CID = () => process.env.GSC_CLIENT_ID || process.env.GA4_CLIENT_ID;
const CSEC = () => process.env.GSC_CLIENT_SECRET || process.env.GA4_CLIENT_SECRET;
const REDIR = () => process.env.GSC_REDIRECT_URI || 'http://localhost:3001/gsc/callback';

router.get('/connect', requireAuth, (req, res) => {
  if (!CID()) return res.status(503).json({ error: 'Search Console not configured.' });
  const state = req.session.id || ('gsc_' + Math.random().toString(36).slice(2));
  const params = new URLSearchParams({
    client_id: CID(), redirect_uri: REDIR(), response_type: 'code',
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    access_type: 'offline', prompt: 'consent', state,
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

router.get('/callback', requireAuth, async (req, res) => {
  const { code } = req.query;
  try {
    const r = await axios.post('https://oauth2.googleapis.com/token', {
      code, client_id: CID(), client_secret: CSEC(), redirect_uri: REDIR(), grant_type: 'authorization_code',
    });
    req.session.gscTokens = { access_token: r.data.access_token, refresh_token: r.data.refresh_token };
    res.redirect(`${process.env.FRONTEND_URL}?gsc_connected=true`);
  } catch (err) { res.redirect(`${process.env.FRONTEND_URL}?gsc_error=oauth_failed`); }
});

router.get('/status', requireAuth, (req, res) => res.json({
  connected: !!req.session.gscTokens,
  siteUrl: req.session.gscSiteUrl || null,
}));

router.get('/sites', requireAuth, async (req, res) => {
  if (!req.session.gscTokens) return res.status(401).json({ error: 'Search Console not connected' });
  try { res.json({ sites: await gscsvc.listSites(req.session) }); }
  catch (e) { res.status(500).json({ error: e.response?.data?.error?.message || e.message }); }
});

router.post('/select-site', requireAuth, (req, res) => {
  req.session.gscSiteUrl = req.body?.siteUrl || null;
  res.json({ success: true, siteUrl: req.session.gscSiteUrl });
});

router.get('/impressions', requireAuth, async (req, res) => {
  if (!req.session.gscTokens) return res.json({ connected: false });
  if (!req.session.gscSiteUrl) return res.json({ connected: true, needsSite: true });
  try {
    const d = await gscsvc.getImpressions(req.session, req.session.gscSiteUrl);
    res.json({ connected: true, siteUrl: req.session.gscSiteUrl, ...d });
  } catch (e) { res.status(500).json({ error: e.response?.data?.error?.message || e.message }); }
});

router.post('/disconnect', requireAuth, (req, res) => {
  delete req.session.gscTokens; delete req.session.gscSiteUrl;
  res.json({ success: true });
});

module.exports = router;
