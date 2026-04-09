const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const HubSpotService = require('../services/hubspot');
const { analyzeFunnel } = require('../services/funnelAnalysis');
const { analyzeBySource, analyzeActivityLevels, analyzeSpeedToLead } = require('../services/behavioralAnalysis');

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
    const dealsToProcess = deals.slice(0, 200);
    const assocMap = await hs.getBatchDealAssociations(dealsToProcess.map(d => d.id));
    const dealsWithContacts = dealsToProcess.map(d => ({ ...d, _contactIds: assocMap[d.id] || [] }));
    res.json({
      funnel: analyzeFunnel(filtered),
      behavioral: { bySource: analyzeBySource(filtered, dealsWithContacts), activityLevels: analyzeActivityLevels(filtered, dealsWithContacts), speedToLead: analyzeSpeedToLead(filtered, dealsWithContacts) },
      summary: { totalContacts: contacts.length, filteredContacts: filtered.length, totalDeals: deals.length, dateRange: days ? parseInt(days) : null }
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to analyze funnel', details: err.response?.data?.message || err.message });
  }
});

module.exports = router;
