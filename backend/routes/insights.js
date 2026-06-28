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
    const hs = new HubSpotService(req.session.tokens.access_token, req.session.id);
    const analyzer = new ActivityAnalyzer(req.session.tokens.access_token);
    const { days, startDate, endDate } = req.query;

    const { contacts, deals, dealsWithContacts } = await hs.getCachedData();
    let filtered = contacts;
    if (startDate && endDate) {
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime() + 86400000;
      filtered = contacts.filter(c => { const t = new Date(c.properties.createdate).getTime(); return t >= start && t <= end; });
    } else if (days && !isNaN(parseInt(days))) {
      const cutoff = Date.now() - parseInt(days) * 86400000;
      filtered = contacts.filter(c => new Date(c.properties.createdate).getTime() >= cutoff);
    }

    const funnelData = analyzeFunnel(filtered);
    const sourceData = analyzeBySource(filtered, dealsWithContacts);
    const activityLevels = analyzeActivityLevels(filtered, dealsWithContacts);
    const speedData = analyzeSpeedToLead(filtered, dealsWithContacts);
    const ltvData = analyzeLTV(contacts, dealsWithContacts);

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
