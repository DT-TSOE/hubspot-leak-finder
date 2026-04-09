const axios = require('axios');

async function requireAuth(req, res, next) {
  if (!req.session?.tokens?.access_token) return res.status(401).json({ error: 'Not authenticated.' });

  const expiresAt = req.session.tokens.expires_at;
  if (expiresAt && Date.now() > expiresAt - 300000) {
    try {
      const r = await axios.post('https://api.hubapi.com/oauth/v1/token',
        new URLSearchParams({ grant_type:'refresh_token', client_id:process.env.HUBSPOT_CLIENT_ID, client_secret:process.env.HUBSPOT_CLIENT_SECRET, refresh_token:req.session.tokens.refresh_token }),
        { headers: { 'Content-Type':'application/x-www-form-urlencoded' } }
      );
      req.session.tokens = { access_token:r.data.access_token, refresh_token:r.data.refresh_token, expires_at: Date.now() + (r.data.expires_in*1000) };
    } catch {
      req.session.destroy();
      return res.status(401).json({ error: 'Session expired. Please reconnect.' });
    }
  }
  next();
}

module.exports = requireAuth;
