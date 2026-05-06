const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const HubSpotService = require('../services/hubspot');
const calc = require('../services/metricCalculations');
const health = require('../services/pipelineHealth');

async function loadData(req) {
  const hs = new HubSpotService(req.session.tokens.access_token);
  const [contacts, deals] = await Promise.all([hs.getContacts(), hs.getDeals()]);
  const dealsWithContacts = await Promise.all(
    deals.slice(0, 200).map(async d => ({ ...d, _contactIds: await hs.getDealAssociations(d.id) }))
  );
  return { contacts, deals: dealsWithContacts };
}

// GM Dashboard
router.get('/gm-dashboard', requireAuth, async (req, res) => {
  try {
    const { contacts, deals } = await loadData(req);

    const healthScore = health.calculatePipelineHealthScore(contacts, deals);
    const biggestLeak = calc.calculateBiggestDropoff(contacts);
    const winRate = calc.calculateWinRate(deals);
    const salesCycle = calc.calculateSalesCycle(deals);
    const speed = calc.calculateTimeToFirstTouch(contacts);
    const noTouch = calc.calculateNoTouchCount(contacts);
    const revenueBySource = calc.calculateRevenueBySource(contacts, deals).slice(0, 5);
    const stuckRecords = health.findStuckRecords(contacts, deals);
    const uncontacted = health.findUncontactedLeads(contacts);
    const fixThisFirst = health.buildFixThisFirst(contacts, deals, healthScore);

    const sourceQuality = calc.calculateSourceQuality(contacts, deals);
    const worstSource = sourceQuality.length > 0
      ? [...sourceQuality].sort((a, b) => a.conversionRate - b.conversionRate)[0]
      : null;

    res.json({
      pipelineHealthScore: healthScore,
      metricCards: [
        { id: 'health', label: 'Pipeline Health', value: healthScore.score !== null ? `${healthScore.score}/100` : 'N/A', sub: healthScore.grade ? `Grade ${healthScore.grade}` : null, trend: null },
        { id: 'biggest_leak', label: 'Biggest Leak', value: biggestLeak ? `${biggestLeak.from}→${biggestLeak.to}` : 'N/A', sub: biggestLeak ? `${biggestLeak.dropoffPct}% drop-off` : null },
        { id: 'win_rate', label: 'Win Rate', value: winRate.value !== null ? `${winRate.value}%` : 'N/A', sub: winRate.value !== null ? `${winRate.sample} closed deals` : null },
        { id: 'sales_cycle', label: 'Avg Sales Cycle', value: salesCycle.value !== null ? `${salesCycle.value}d` : 'N/A', sub: salesCycle.value !== null ? `Median across ${salesCycle.sample} deals` : null },
        { id: 'at_risk', label: 'At-Risk Records', value: stuckRecords.length, sub: stuckRecords.filter(r => r.urgency === 'critical').length + ' critical' },
        { id: 'speed', label: 'Speed to Lead', value: speed.value !== null ? `${speed.value}h` : 'N/A', sub: speed.value !== null ? `${speed.under1h}% under 1h` : null },
        { id: 'top_revenue_source', label: 'Top Revenue Source', value: revenueBySource[0]?.source || 'N/A', sub: revenueBySource[0] ? `$${revenueBySource[0].revenue.toLocaleString()}` : null },
        { id: 'worst_source', label: 'Worst Conversion Source', value: worstSource?.source || 'N/A', sub: worstSource ? `${worstSource.conversionRate}% conversion` : null },
      ],
      biggestLeak,
      uncontactedCount: uncontacted.length,
      stuckCount: stuckRecords.length,
      fixThisFirst,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('GM dashboard error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Metric tiles — comprehensive metric grid
router.get('/metric-tiles', requireAuth, async (req, res) => {
  try {
    const { contacts, deals } = await loadData(req);

    const tiles = {
      sales: [
        { id: 'win_rate', label: 'Win Rate', ...calc.calculateWinRate(deals), unit: '%' },
        { id: 'avg_deal', label: 'Avg Deal Size', ...calc.calculateAverageDealSize(deals), unit: '$' },
        { id: 'cycle', label: 'Sales Cycle', ...calc.calculateSalesCycle(deals), unit: 'days' },
        { id: 'open_pipeline', label: 'Open Pipeline Value', ...calc.calculateOpenPipelineValue(deals), unit: '$' },
        { id: 'new_deals', label: 'New Deals (30d)', ...calc.calculateNewDealsCount(deals, 30) },
        { id: 'closed_won_30', label: 'Closed Won (30d)', value: deals.filter(d => d.properties.dealstage === 'closedwon' && new Date(d.properties.closedate || 0).getTime() > Date.now() - 30 * 86400000).length },
        { id: 'closed_lost_30', label: 'Closed Lost (30d)', value: deals.filter(d => d.properties.dealstage === 'closedlost' && new Date(d.properties.closedate || 0).getTime() > Date.now() - 30 * 86400000).length },
      ],
      lifecycle: [
        { id: 'lead_mql', label: 'Lead → MQL', ...calc.calculateStageConversion(contacts, 'lead', 'marketingqualifiedlead'), unit: '%' },
        { id: 'mql_sql', label: 'MQL → SQL', ...calc.calculateStageConversion(contacts, 'marketingqualifiedlead', 'salesqualifiedlead'), unit: '%' },
        { id: 'sql_opp', label: 'SQL → Opportunity', ...calc.calculateStageConversion(contacts, 'salesqualifiedlead', 'opportunity'), unit: '%' },
        { id: 'opp_customer', label: 'Opportunity → Customer', ...calc.calculateStageConversion(contacts, 'opportunity', 'customer'), unit: '%' },
      ],
      activity: [
        { id: 'first_touch', label: 'Time to First Touch', ...calc.calculateTimeToFirstTouch(contacts), unit: 'h' },
        { id: 'no_touch', label: 'No-Touch Leads', ...calc.calculateNoTouchCount(contacts) },
        { id: 'touches_won', label: 'Touches per Won Deal', ...calc.calculateTouchesPerDeal(deals, contacts, 'won') },
        { id: 'touches_lost', label: 'Touches per Lost Deal', ...calc.calculateTouchesPerDeal(deals, contacts, 'lost') },
      ],
      source: calc.calculateSourceQuality(contacts, deals).slice(0, 8).map(s => ({
        id: 'src_' + s.source,
        label: s.source,
        winRate: s.winRate,
        avgDealSize: s.avgDealSize,
        revenue: s.revenue,
        deals: s.deals,
      })),
    };

    res.json(tiles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Source quality report
router.get('/source-quality', requireAuth, async (req, res) => {
  try {
    const { contacts, deals } = await loadData(req);
    const sourceProperty = req.query.property || 'hs_analytics_source';

    const sources = calc.calculateSourceQuality(contacts, deals, sourceProperty);
    const availableProperties = calc.detectSourceProperties(contacts);

    const byRevenue = [...sources].sort((a, b) => b.revenue - a.revenue);
    const byWinRate = [...sources].filter(s => s.deals >= 3).sort((a, b) => b.winRate - a.winRate);
    const byCycle = [...sources].filter(s => s.avgSalesCycle !== null).sort((a, b) => a.avgSalesCycle - b.avgSalesCycle);
    const byConversion = [...sources].sort((a, b) => b.conversionRate - a.conversionRate);

    res.json({
      sources,
      availableProperties,
      currentProperty: sourceProperty,
      bestRevenue: byRevenue[0] || null,
      bestWinRate: byWinRate[0] || null,
      fastestCycle: byCycle[0] || null,
      bestConversion: byConversion[0] || null,
      worstHighVolume: sources.filter(s => s.contacts >= 10).sort((a, b) => a.conversionRate - b.conversionRate)[0] || null,
      worstWinRate: byWinRate[byWinRate.length - 1] || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stage aging
router.get('/stage-aging', requireAuth, async (req, res) => {
  try {
    const { contacts, deals } = await loadData(req);
    const stuck = health.findStuckRecords(contacts, deals);

    const byStage = {};
    for (const r of stuck) {
      if (!byStage[r.stage]) byStage[r.stage] = { stage: r.stage, count: 0, totalDays: 0, revenueAtRisk: 0 };
      byStage[r.stage].count++;
      byStage[r.stage].totalDays += r.daysInStage;
      if (r.revenueAtRisk) byStage[r.stage].revenueAtRisk += r.revenueAtRisk;
    }

    const stageBreakdown = Object.values(byStage).map(s => ({
      ...s,
      avgDays: Math.round(s.totalDays / s.count),
    }));

    res.json({
      stuckRecords: stuck,
      total: stuck.length,
      critical: stuck.filter(r => r.urgency === 'critical').length,
      high: stuck.filter(r => r.urgency === 'high').length,
      medium: stuck.filter(r => r.urgency === 'medium').length,
      stageBreakdown,
      totalRevenueAtRisk: stuck.reduce((sum, r) => sum + (r.revenueAtRisk || 0), 0),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Speed-to-lead monitor
router.get('/speed-to-lead', requireAuth, async (req, res) => {
  try {
    const { contacts, deals } = await loadData(req);

    const speed = calc.calculateTimeToFirstTouch(contacts);
    const uncontacted = health.findUncontactedLeads(contacts);

    // Won vs lost speed comparison
    const contactMap = {};
    contacts.forEach(c => { contactMap[c.id] = c; });

    const wonSpeeds = [];
    const lostSpeeds = [];
    for (const deal of deals) {
      const isWon = deal.properties.dealstage === 'closedwon';
      const isLost = deal.properties.dealstage === 'closedlost';
      if (!isWon && !isLost) continue;
      if (!deal._contactIds) continue;
      for (const cId of deal._contactIds) {
        const c = contactMap[cId];
        if (!c) continue;
        const created = new Date(c.properties.createdate).getTime();
        const firstTouch = c.properties.notes_last_contacted ? new Date(c.properties.notes_last_contacted).getTime() : null;
        if (!firstTouch) continue;
        const hours = (firstTouch - created) / 3600000;
        if (hours <= 0 || hours > 720) continue;
        if (isWon) wonSpeeds.push(hours);
        else lostSpeeds.push(hours);
      }
    }

    const wonMedian = wonSpeeds.length >= 3 ? Math.round(calc.median(wonSpeeds) * 10) / 10 : null;
    const lostMedian = lostSpeeds.length >= 3 ? Math.round(calc.median(lostSpeeds) * 10) / 10 : null;

    res.json({
      summary: speed,
      uncontactedQueue: uncontacted,
      uncontactedCount: uncontacted.length,
      criticalCount: uncontacted.filter(u => u.urgency === 'critical').length,
      wonVsLost: {
        wonMedian, lostMedian,
        wonSample: wonSpeeds.length, lostSample: lostSpeeds.length,
        ratio: (wonMedian && lostMedian) ? Math.round((lostMedian / wonMedian) * 10) / 10 : null,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
