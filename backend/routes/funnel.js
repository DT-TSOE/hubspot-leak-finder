const express = require('express');
const router = express.Router();
const HubSpotService = require('../services/hubspot');
const { calculateFunnel: analyzeFunnel } = require('../services/funnelAnalysis');
const { analyzeBySource, analyzeActivityLevels, analyzeSpeedToLead } = require('../services/behavioralAnalysis');

function requireAuth(req, res, next) {
  if (!req.session?.tokens?.access_token) {
    return res.status(401).json({ error: 'Not authenticated. Please connect HubSpot.' });
  }
  next();
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const hs = new HubSpotService(req.session.tokens.access_token);
    const { days } = req.query; // date range filter: 30, 60, 90, or undefined = all time

    const [contacts, deals] = await Promise.all([
      hs.getContacts(),
      hs.getDeals()
    ]);

    // Apply date range filter if specified
    let filteredContacts = contacts;
    if (days && !isNaN(parseInt(days))) {
      const cutoff = Date.now() - parseInt(days) * 24 * 60 * 60 * 1000;
      filteredContacts = contacts.filter(c => {
        const created = new Date(c.properties.createdate).getTime();
        return created >= cutoff;
      });
    }

    const dealsWithContacts = await Promise.all(
      deals.slice(0, 200).map(async (deal) => {
        const contactIds = await hs.getDealAssociations(deal.id);
        return { ...deal, _contactIds: contactIds };
      })
    );

    const funnelData = analyzeFunnel(filteredContacts);
    const sourceData = analyzeBySource(filteredContacts, dealsWithContacts);
    const activityData = analyzeActivityLevels(filteredContacts, dealsWithContacts);
    const speedData = analyzeSpeedToLead(filteredContacts, dealsWithContacts);

    res.json({
      funnel: funnelData,
      behavioral: { bySource: sourceData, activityLevels: activityData, speedToLead: speedData },
      summary: {
        totalContacts: contacts.length,
        filteredContacts: filteredContacts.length,
        totalDeals: deals.length,
        dateRange: days ? parseInt(days) : null
      }
    });
  } catch (err) {
    console.error('Funnel analysis error:', err.response?.data || err.message);
    res.status(500).json({
      error: 'Failed to analyze funnel',
      details: err.response?.data?.message || err.message
    });
  }
});

module.exports = router;
