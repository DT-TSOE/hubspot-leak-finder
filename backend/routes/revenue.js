const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const HubSpotService = require('../services/hubspot');
const { analyzeLTV } = require('../services/ltvAnalysis');

router.get('/', requireAuth, async (req, res) => {
  try {
    const hs = new HubSpotService(req.session.tokens.access_token, req.session.id);
    const [{ contacts, dealsWithContacts }, owners] = await Promise.all([
      hs.getCachedData(),
      hs.getOwners(),
    ]);
    const ownerMap = Object.fromEntries(owners.map(o => [o.id, o.name]));
    const data = analyzeLTV(contacts, dealsWithContacts);

    // Enrich rep performance with real names
    if (data.repPerformance) {
      data.repPerformance = data.repPerformance.map(r => ({
        ...r,
        name: ownerMap[String(r.ownerId)] || null,
      }));
    }

    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
