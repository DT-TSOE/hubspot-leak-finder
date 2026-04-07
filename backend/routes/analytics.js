const express = require('express');
const router = express.Router();
const { fetchContacts, fetchDeals, fetchDealAssociations } = require('../services/hubspot');
const { calculateFunnel, analyzeSourcePerformance, analyzeSpeedToLead } = require('../services/funnelAnalysis');
const { generateInsights } = require('../services/insightEngine');

// Auth middleware
function requireAuth(req, res, next) {
  if (!req.session.accessToken) {
    return res.status(401).json({ error: 'Not authenticated. Connect HubSpot first.' });
  }
  next();
}

/**
 * GET /api/funnel
 * Returns full funnel analysis + insights
 */
router.get('/funnel', requireAuth, async (req, res) => {
  const startTime = Date.now();

  try {
    const accessToken = req.session.accessToken;

    // Fetch contacts and deals in parallel
    const [contacts, deals] = await Promise.all([
      fetchContacts(accessToken),
      fetchDeals(accessToken),
    ]);

    if (!contacts.length) {
      return res.json({
        empty: true,
        message: 'No contacts found in your HubSpot account.',
      });
    }

    // Run all analyses
    const funnel = calculateFunnel(contacts);
    const sourcePerformance = analyzeSourcePerformance(contacts);
    const speedToLead = analyzeSpeedToLead(contacts);

    // Deal analysis: win/loss rates by stage
    const closedWon = deals.filter(d => d.properties?.hs_is_closed_won === 'true');
    const closedLost = deals.filter(d =>
      d.properties?.hs_is_closed === 'true' && d.properties?.hs_is_closed_won !== 'true'
    );

    // Generate insights
    const insights = generateInsights({ funnel, sourcePerformance, speedToLead });

    const elapsed = Date.now() - startTime;

    res.json({
      meta: {
        contactsAnalyzed: contacts.length,
        dealsAnalyzed: deals.length,
        generatedAt: new Date().toISOString(),
        elapsedMs: elapsed,
      },
      funnel,
      sourcePerformance,
      speedToLead,
      deals: {
        total: deals.length,
        closedWon: closedWon.length,
        closedLost: closedLost.length,
        winRate: deals.length > 0
          ? Math.round((closedWon.length / Math.max(closedWon.length + closedLost.length, 1)) * 1000) / 10
          : 0,
      },
      insights,
    });
  } catch (err) {
    console.error('Funnel analysis error:', err.response?.data || err.message);

    // Handle HubSpot API errors gracefully
    if (err.response?.status === 401) {
      req.session.destroy();
      return res.status(401).json({ error: 'HubSpot token expired. Please reconnect.' });
    }

    if (err.response?.status === 403) {
      return res.status(403).json({
        error: 'Missing HubSpot permissions. Ensure your app has CRM read access.',
      });
    }

    res.status(500).json({ error: 'Analysis failed. Please try again.' });
  }
});

/**
 * GET /api/contacts/sample
 * Returns a small sample of contacts for debugging/preview
 */
router.get('/contacts/sample', requireAuth, async (req, res) => {
  try {
    const contacts = await fetchContacts(req.session.accessToken);
    res.json({
      total: contacts.length,
      sample: contacts.slice(0, 5).map(c => ({
        id: c.id,
        properties: c.properties,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
