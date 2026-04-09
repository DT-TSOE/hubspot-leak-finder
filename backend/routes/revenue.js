const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const HubSpotService = require('../services/hubspot');
const { analyzeLTV } = require('../services/ltvAnalysis');

router.get('/', requireAuth, async (req, res) => {
  try {
    const hs = new HubSpotService(req.session.tokens.access_token);
    const [contacts, deals] = await Promise.all([hs.getContacts(), hs.getDeals()]);
    const dealsWithContacts = await Promise.all(deals.slice(0,300).map(async d => ({ ...d, _contactIds: await hs.getDealAssociations(d.id) })));
    res.json(analyzeLTV(contacts, dealsWithContacts));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
