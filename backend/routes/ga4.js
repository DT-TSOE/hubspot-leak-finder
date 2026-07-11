const express = require('express');
const router = express.Router();
const axios = require('axios');
const requireAuth = require('../middleware/requireAuth');
const ga4svc = require('../services/ga4');

router.get('/connect', requireAuth, (req, res) => {
  if (!process.env.GA4_CLIENT_ID) return res.status(503).json({ error: 'GA4 not configured.' });
  const state = req.session.id || ('ga4_' + Math.random().toString(36).slice(2));
  const params = new URLSearchParams({ client_id:process.env.GA4_CLIENT_ID, redirect_uri:process.env.GA4_REDIRECT_URI||'http://localhost:3001/ga4/callback', response_type:'code', scope:'https://www.googleapis.com/auth/analytics.readonly', access_type:'offline', prompt:'consent', state });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

router.get('/callback', requireAuth, async (req, res) => {
  const { code } = req.query;
  try {
    const r = await axios.post('https://oauth2.googleapis.com/token', { code, client_id:process.env.GA4_CLIENT_ID, client_secret:process.env.GA4_CLIENT_SECRET, redirect_uri:process.env.GA4_REDIRECT_URI||'http://localhost:3001/ga4/callback', grant_type:'authorization_code' });
    req.session.ga4Tokens = { access_token:r.data.access_token, refresh_token:r.data.refresh_token };
    res.redirect(`${process.env.FRONTEND_URL}?ga4_connected=true`);
  } catch (err) { res.redirect(`${process.env.FRONTEND_URL}?ga4_error=oauth_failed`); }
});

router.get('/status', requireAuth, (req, res) => res.json({
  connected: !!req.session.ga4Tokens,
  propertyId: req.session.ga4PropertyId || null,
  propertyName: req.session.ga4PropertyName || null,
}));

// GA4 properties the connected account can read (for the picker).
router.get('/properties', requireAuth, async (req, res) => {
  if (!req.session.ga4Tokens) return res.status(401).json({ error: 'GA4 not connected' });
  try { res.json({ properties: await ga4svc.listProperties(req.session) }); }
  catch (e) { res.status(500).json({ error: e.response?.data?.error?.message || e.message }); }
});

router.post('/select-property', requireAuth, (req, res) => {
  req.session.ga4PropertyId = req.body?.propertyId || null;
  req.session.ga4PropertyName = req.body?.propertyName || null;
  res.json({ success: true, propertyId: req.session.ga4PropertyId });
});

// Traffic totals + channel breakdown for the selected property.
router.get('/traffic', requireAuth, async (req, res) => {
  if (!req.session.ga4Tokens) return res.json({ connected: false });
  if (!req.session.ga4PropertyId) return res.json({ connected: true, needsProperty: true });
  try {
    const t = await ga4svc.getTraffic(req.session, req.session.ga4PropertyId);
    res.json({ connected: true, propertyName: req.session.ga4PropertyName, ...t });
  } catch (e) { res.status(500).json({ error: e.response?.data?.error?.message || e.message }); }
});

router.post('/disconnect', requireAuth, (req, res) => {
  delete req.session.ga4Tokens; delete req.session.ga4PropertyId; delete req.session.ga4PropertyName;
  res.json({ success: true });
});

module.exports = router;
