const express = require('express');
const router = express.Router();
const HubSpotService = require('../services/hubspot');
const { scoreLeads } = require('../services/leadScoring');

function requireAuth(req, res, next) {
  if (!req.session?.tokens?.access_token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

router.get('/scores', requireAuth, async (req, res) => {
  try {
    const hs = new HubSpotService(req.session.tokens.access_token);
    const contacts = await hs.getContacts();
    const scored = scoreLeads(contacts);
    res.json({ leads: scored, total: scored.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
