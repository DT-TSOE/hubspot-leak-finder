const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const HubSpotService = require('../services/hubspot');
const { analyzeFunnel } = require('../services/funnelAnalysis');
const { analyzeBySource, analyzeActivityLevels, analyzeSpeedToLead } = require('../services/behavioralAnalysis');
const { generateInsights } = require('../services/insightEngine');

router.get('/', requireAuth, async (req, res) => {
  try {
    const hs = new HubSpotService(req.session.tokens.access_token);
    const { days } = req.query;
    const [contacts, deals] = await Promise.all([hs.getContacts(), hs.getDeals()]);
    let filtered = contacts;
    if (days && !isNaN(parseInt(days))) {
      const cutoff = Date.now() - parseInt(days)*86400000;
      filtered = contacts.filter(c => new Date(c.properties.createdate).getTime() >= cutoff);
    }
    const dealsWithContacts = await Promise.all(deals.slice(0,200).map(async d => ({ ...d, _contactIds: await hs.getDealAssociations(d.id) })));
    const funnelData = analyzeFunnel(filtered);
    const insights = generateInsights(funnelData, analyzeBySource(filtered, dealsWithContacts), analyzeActivityLevels(filtered, dealsWithContacts), analyzeSpeedToLead(filtered, dealsWithContacts), days ? parseInt(days) : null);
    res.json({ insights, generatedAt: new Date().toISOString() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
