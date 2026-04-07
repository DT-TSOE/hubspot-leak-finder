const express = require('express');
const router = express.Router();
const HubSpotService = require('../services/hubspot');
const { calculateFunnel: analyzeFunnel } = require('../services/funnelAnalysis');
const { analyzeBySource, analyzeActivityLevels, analyzeSpeedToLead } = require('../services/behavioralAnalysis');
const { generateInsights } = require('../services/insightEngine');

function requireAuth(req, res, next) {
  if (!req.session?.tokens?.access_token) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const hs = new HubSpotService(req.session.tokens.access_token);
    const { days } = req.query;

    const [contacts, deals] = await Promise.all([hs.getContacts(), hs.getDeals()]);

    let filteredContacts = contacts;
    if (days && !isNaN(parseInt(days))) {
      const cutoff = Date.now() - parseInt(days) * 24 * 60 * 60 * 1000;
      filteredContacts = contacts.filter(c => new Date(c.properties.createdate).getTime() >= cutoff);
    }

    const dealsWithContacts = await Promise.all(
      deals.slice(0, 200).map(async d => ({ ...d, _contactIds: await hs.getDealAssociations(d.id) }))
    );

    const funnelData = analyzeFunnel(filteredContacts);
    const sourceData = analyzeBySource(filteredContacts, dealsWithContacts);
    const activityData = analyzeActivityLevels(filteredContacts, dealsWithContacts);
    const speedData = analyzeSpeedToLead(filteredContacts, dealsWithContacts);
    const insights = generateInsights(funnelData, sourceData, activityData, speedData, days ? parseInt(days) : null);

    res.json({ insights, generatedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
