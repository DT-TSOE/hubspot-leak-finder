const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const HubSpotService = require('../services/hubspot');
const { scoreLeads } = require('../services/leadScoring');

router.get('/scores', requireAuth, async (req, res) => {
  try {
    const hs = new HubSpotService(req.session.tokens.access_token);
    const contacts = await hs.getContacts();
    const leads = scoreLeads(contacts);
    res.json({ leads, total: leads.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
