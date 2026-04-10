const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const HubSpotService = require('../services/hubspot');
const { analyzeFunnel } = require('../services/funnelAnalysis');
const { analyzeBySource, analyzeActivityLevels, analyzeSpeedToLead } = require('../services/behavioralAnalysis');
const { generateInsights } = require('../services/insightEngine');
const { analyzeLTV } = require('../services/ltvAnalysis');
const ActivityAnalyzer = require('../services/activityAnalysis');

router.get('/', requireAuth, async (req, res) => {
  try {
    const hs = new HubSpotService(req.session.tokens.access_token);
    const analyzer = new ActivityAnalyzer(req.session.tokens.access_token);
    const { days } = req.query;

    const [contacts, deals] = await Promise.all([hs.getContacts(), hs.getDeals()]);
    let filtered = contacts;
    if (days && !isNaN(parseInt(days))) {
      const cutoff = Date.now() - parseInt(days) * 86400000;
      filtered = contacts.filter(c => new Date(c.properties.createdate).getTime() >= cutoff);
    }

    const dealsWithContacts = await Promise.all(
      deals.slice(0, 200).map(async d => ({ ...d, _contactIds: await hs.getDealAssociations(d.id) }))
    );

    const funnelData = analyzeFunnel(filtered);
    const sourceData = analyzeBySource(filtered, dealsWithContacts);
    const activityLevels = analyzeActivityLevels(filtered, dealsWithContacts);
    const speedData = analyzeSpeedToLead(filtered, dealsWithContacts);
    const ltvData = analyzeLTV(contacts, dealsWithContacts);

    // Activity comparison (calls, emails, meetings)
    let activityComparison = null;
    try {
      const wonDeals = deals.filter(d => d.properties.dealstage === 'closedwon');
      const lostDeals = deals.filter(d => d.properties.dealstage === 'closedlost');
      if (wonDeals.length + lostDeals.length > 0) {
        const sampleDeals = [...wonDeals.slice(0, 20), ...lostDeals.slice(0, 20)];
        const activities = await analyzer.getActivitiesForDeals(sampleDeals.map(d => d.id));
        activityComparison = analyzer.analyzeActivities(
          wonDeals.slice(0, 20).map(d => d.id),
          lostDeals.slice(0, 20).map(d => d.id),
          activities
        );
      }
    } catch (err) {
      console.log('Activity fetch skipped:', err.message);
    }

    const insights = generateInsights(funnelData, sourceData, activityLevels, speedData, ltvData, activityComparison);

    res.json({ insights, total: insights.length, generatedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
