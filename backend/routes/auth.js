const express = require('express');
const router = express.Router();
const axios = require('axios');

const SCOPES = [
  'crm.objects.contacts.read',
  'crm.objects.deals.read',
  'crm.objects.contacts.write'
].join(' ');

// Step 1: Redirect to HubSpot OAuth
router.get('/connect', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.HUBSPOT_CLIENT_ID,
    redirect_uri: process.env.HUBSPOT_REDIRECT_URI,
    scope: SCOPES,
    response_type: 'code'
  });
  res.redirect(`https://app.hubspot.com/oauth/authorize?${params}`);
});

// Step 2: Handle OAuth callback
router.get('/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.redirect(`${process.env.FRONTEND_URL}?error=no_code`);

  try {
    const tokenRes = await axios.post('https://api.hubapi.com/oauth/v1/token', 
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.HUBSPOT_CLIENT_ID,
        client_secret: process.env.HUBSPOT_CLIENT_SECRET,
        redirect_uri: process.env.HUBSPOT_REDIRECT_URI,
        code
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    req.session.tokens = {
      access_token: tokenRes.data.access_token,
      refresh_token: tokenRes.data.refresh_token,
      expires_at: Date.now() + (tokenRes.data.expires_in * 1000)
    };

    res.redirect(`${process.env.FRONTEND_URL}?connected=true`);
  } catch (err) {
    console.error('OAuth error:', err.response?.data || err.message);
    res.redirect(`${process.env.FRONTEND_URL}?error=oauth_failed`);
  }
});

// Refresh token if needed
router.get('/refresh', async (req, res) => {
  if (!req.session.tokens?.refresh_token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const tokenRes = await axios.post('https://api.hubapi.com/oauth/v1/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.HUBSPOT_CLIENT_ID,
        client_secret: process.env.HUBSPOT_CLIENT_SECRET,
        refresh_token: req.session.tokens.refresh_token
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    req.session.tokens = {
      access_token: tokenRes.data.access_token,
      refresh_token: tokenRes.data.refresh_token,
      expires_at: Date.now() + (tokenRes.data.expires_in * 1000)
    };

    res.json({ success: true });
  } catch (err) {
    res.status(401).json({ error: 'Token refresh failed' });
  }
});

router.get('/status', (req, res) => {
  res.json({ connected: !!req.session.tokens });
});

router.post('/disconnect', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

module.exports = router;
