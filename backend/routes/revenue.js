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

    // Filter deals by close date when days param is set
    const { days, startDate, endDate } = req.query;
    let filteredDeals = dealsWithContacts;
    if (startDate && endDate) {
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime() + 86400000;
      filteredDeals = dealsWithContacts.filter(d => { const t = new Date(d.properties.closedate || 0).getTime(); return t >= start && t <= end; });
    } else if (days && !isNaN(parseInt(days))) {
      const cutoff = Date.now() - parseInt(days) * 86400000;
      filteredDeals = dealsWithContacts.filter(d => new Date(d.properties.closedate || 0).getTime() >= cutoff);
    }

    const data = analyzeLTV(contacts, filteredDeals);

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
