const express = require('express');
const router = express.Router();
const axios = require('axios');
const requireAuth = require('../middleware/requireAuth');

router.get('/connect', requireAuth, (req, res) => {
  if (!process.env.GA4_CLIENT_ID) return res.status(503).json({ error: 'GA4 not configured.' });
  const params = new URLSearchParams({ client_id:process.env.GA4_CLIENT_ID, redirect_uri:process.env.GA4_REDIRECT_URI||'http://localhost:3001/ga4/callback', response_type:'code', scope:'https://www.googleapis.com/auth/analytics.readonly', access_type:'offline', prompt:'consent', state:req.session.id });
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

router.get('/status', requireAuth, (req, res) => res.json({ connected: !!req.session.ga4Tokens }));
router.post('/disconnect', requireAuth, (req, res) => { delete req.session.ga4Tokens; res.json({ success: true }); });

module.exports = router;
