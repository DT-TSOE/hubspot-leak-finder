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
    const dealsWithContacts = [];
    for (let i = 0; i < dealsToProcess.length; i += 5) {
      const batch = dealsToProcess.slice(i, i + 5);
      const results = await Promise.all(batch.map(async d => ({ ...d, _contactIds: await hs.getDealAssociations(d.id) })));
      dealsWithContacts.push(...results);
      if (i + 5 < dealsToProcess.length) await new Promise(r => setTimeout(r, 300));
    }
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
