const express = require('express');
const router = express.Router();
const axios = require('axios');

const SCOPES = ['crm.objects.contacts.read','crm.objects.deals.read'].join(' ');

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
router.post('/disconnect', (req, res) => { req.session.destroy(); res.json({ success: true }); });

module.exports = router;
