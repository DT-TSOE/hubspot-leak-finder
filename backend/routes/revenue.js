const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const HubSpotService = require('../services/hubspot');
const { analyzeLTV } = require('../services/ltvAnalysis');
const { calculateDealStageConversion } = require('../services/scoring');
const { lostReasonBreakdown, winLoseTiming, revenueByJobTitle } = require('../services/revenueInsights');

router.get('/', requireAuth, async (req, res) => {
  try {
    const hs = new HubSpotService(req.session.tokens.access_token, req.session.id);
    const [{ contacts, deals, dealsWithContacts, dealsWithHistory, pipelines }, owners] = await Promise.all([
      hs.getCachedData(),
      hs.getOwners(),
    ]);
    const ownerMap = Object.fromEntries(owners.map(o => [o.id, o.name]));

    // Filter deals by close date when a date param is set. Apply it to BOTH the
    // full deal set (for accurate closed-deal counts) and the associated subset
    // (for by-source / by-customer breakdowns).
    const { days, startDate, endDate } = req.query;
    const byClose = (list) => {
      if (startDate && endDate) {
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime() + 86400000;
        return list.filter(d => { const t = new Date(d.properties.closedate || 0).getTime(); return t >= start && t <= end; });
      }
      if (days && !isNaN(parseInt(days))) {
        const cutoff = Date.now() - parseInt(days) * 86400000;
        return list.filter(d => new Date(d.properties.closedate || 0).getTime() >= cutoff);
      }
      return list;
    };
    const filteredDeals = byClose(deals);
    const filteredAssoc = byClose(dealsWithContacts);

    const data = analyzeLTV(contacts, filteredDeals, pipelines, filteredAssoc);

    if (data.repPerformance) {
      data.repPerformance = data.repPerformance.map(r => ({
        ...r,
        name: ownerMap[String(r.ownerId)] || null,
      }));
    }

    // Forecasting + "aha" insights (all-time / not date-filtered):
    // deal-stage conversion, why deals lose, win-vs-lose timing, who buys.
    data.dealStageConversion = calculateDealStageConversion(dealsWithHistory, pipelines);
    data.lostReasons = lostReasonBreakdown(dealsWithContacts);
    data.winLoseTiming = winLoseTiming(dealsWithContacts);
    data.revenueByJobTitle = revenueByJobTitle(dealsWithContacts, contacts);

    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
