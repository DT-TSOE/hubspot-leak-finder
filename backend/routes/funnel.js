const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const HubSpotService = require('../services/hubspot');
const { analyzeFunnel } = require('../services/funnelAnalysis');
const { analyzeBySource, analyzeActivityLevels, analyzeSpeedToLead } = require('../services/behavioralAnalysis');

router.get('/', requireAuth, async (req, res) => {
  try {
    const hs = new HubSpotService(req.session.tokens.access_token, req.session.id);
    const { days } = req.query;
    const { contacts, deals, dealsWithContacts } = await hs.getCachedData();
    let filtered = contacts;
    if (days && !isNaN(parseInt(days))) {
      const cutoff = Date.now() - parseInt(days) * 86400000;
      filtered = contacts.filter(c => new Date(c.properties.createdate).getTime() >= cutoff);
    }
    res.json({
      funnel: analyzeFunnel(filtered),
      behavioral: { bySource: analyzeBySource(filtered, dealsWithContacts), activityLevels: analyzeActivityLevels(filtered, dealsWithContacts), speedToLead: analyzeSpeedToLead(filtered, dealsWithContacts) },
      summary: { totalContacts: contacts.length, filteredContacts: filtered.length, totalDeals: deals.length, dateRange: days ? parseInt(days) : null }
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

module.exports = router;
