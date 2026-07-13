const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const HubSpotService = require('../services/hubspot');
const calc = require('../services/metricCalculations');
const health = require('../services/pipelineHealth');
const { buildScorecard } = require('../services/scoring');
const { buildRecommendations } = require('../services/recommendations');
const { buildDealProfiles } = require('../services/dealProfiles');
const db = require('../services/db');

function applyDateFilter(items, days, dateField = 'createdate', startDate, endDate) {
  if (startDate && endDate) {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime() + 86400000; // inclusive end date
    return items.filter(i => {
      const t = new Date(i.properties[dateField] || 0).getTime();
      return t >= start && t <= end;
    });
  }
  if (!days || isNaN(parseInt(days))) return items;
  const cutoff = Date.now() - parseInt(days) * 86400000;
  return items.filter(i => new Date(i.properties[dateField] || 0).getTime() >= cutoff);
}

async function loadData(req) {
  const hs = new HubSpotService(req.session.tokens.access_token, req.session.id);
  const { contacts, dealsWithContacts } = await hs.getCachedData();
  return { contacts, deals: dealsWithContacts };
}

// Per-session spam marks. In-memory (resets on redeploy / not shared across
// instances) - durable persistence arrives with the snapshot DB. Lets a user
// flag junk form-fills so they don't drag down response-time metrics.
const _spam = new Map(); // sessionId -> Set(contactId)
function spamSet(req) {
  const key = req.session.id || 'no-session';
  if (!_spam.has(key)) _spam.set(key, new Set());
  return _spam.get(key);
}

// Mark/unmark contacts as spam
router.post('/spam', requireAuth, (req, res) => {
  const set = spamSet(req);
  const { contactIds = [], action = 'add' } = req.body || {};
  for (const id of contactIds) {
    if (action === 'remove') set.delete(String(id));
    else set.add(String(id));
  }
  res.json({ spamIds: [...set], spamCount: set.size });
});

// Two-funnel scorecard: overall grade + marketing/sales sub-scores +
// deal-stage conversion + revenue impact. All-time (stage history spans time).
router.get('/scorecard', requireAuth, async (req, res) => {
  try {
    const hs = new HubSpotService(req.session.tokens.access_token, req.session.id);
    const { contacts: allContacts, deals: allDeals, dealsWithContacts: allDWC, dealsWithHistory: allDWH, pipelines } = await hs.getCachedData();
    const { days, startDate, endDate } = req.query;

    const contacts = applyDateFilter(allContacts, days, 'createdate', startDate, endDate);
    const deals = applyDateFilter(allDeals, days, 'closedate', startDate, endDate);
    const filteredIds = new Set(deals.map(d => d.id));
    const dealsWithContacts = allDWC.filter(d => filteredIds.has(d.id));
    const dealsWithHistory = allDWH.filter(d => filteredIds.has(d.id));

    // Previous-period lead count: same window length, shifted back one period
    const filterActive = !!(days || startDate);
    let prevPeriodLeads = null;
    if (filterActive) {
      if (days) {
        const daysMs = parseInt(days) * 86400000;
        const periodStart = Date.now() - daysMs;
        prevPeriodLeads = allContacts.filter(c => {
          const t = new Date(c.properties?.createdate || 0).getTime();
          return t >= periodStart - daysMs && t < periodStart;
        }).length;
      } else if (startDate && endDate) {
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime() + 86400000;
        const duration = end - start;
        prevPeriodLeads = allContacts.filter(c => {
          const t = new Date(c.properties?.createdate || 0).getTime();
          return t >= start - duration && t < start;
        }).length;
      }
    }

    const scorecard = buildScorecard({ contacts, deals, dealsWithContacts, dealsWithHistory, pipelines, allDealsWithContacts: allDWC, prevPeriodLeads, filterActive }, req.session.onboarding);
    scorecard.recommendations = buildRecommendations(scorecard);

    // Winning-deal profiles (behavioral). Stage discipline needs history keyed by deal id.
    const stageHistoryById = Object.fromEntries((dealsWithHistory || []).map(d => [d.id, d._stagesEntered || []]));
    scorecard.dealProfiles = buildDealProfiles(dealsWithContacts, contacts, stageHistoryById);

    // Monthly snapshot + "vs last month" trend -- only on unfiltered (all-time) view.
    let trend = null;
    if (db.enabled() && !days && !startDate && !endDate) {
      if (!req.session.portalId) req.session.portalId = await hs.getPortalId();
      const portalId = req.session.portalId;
      if (portalId) {
        // Store only aggregate numbers - never contacts/PII.
        const snap = {
          overall: scorecard.overall,
          marketing: { score: scorecard.marketing.score, grade: scorecard.marketing.grade },
          sales: { score: scorecard.sales.score, grade: scorecard.sales.grade },
          revenueOpportunity: scorecard.revenueImpact?.total || 0,
        };
        const prevRow = await db.getPreviousSnapshot(portalId);
        await db.saveSnapshot(portalId, snap);
        if (prevRow?.payload) {
          const p = prevRow.payload;
          const delta = (a, b) => (a == null || b == null) ? null : a - b;
          trend = {
            period: prevRow.period,
            overallScoreDelta: delta(scorecard.overall.score, p.overall?.score),
            previousGrade: p.overall?.grade || null,
            marketingScoreDelta: delta(scorecard.marketing.score, p.marketing?.score),
            salesScoreDelta: delta(scorecard.sales.score, p.sales?.score),
            revenueOpportunityDelta: delta(scorecard.revenueImpact?.total || 0, p.revenueOpportunity || 0),
          };
        }
      }
    }

    res.json({ ...scorecard, trend, generatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('Scorecard error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Lightweight interest signal for the future customer-analysis app (demand test).
router.post('/interest', requireAuth, (req, res) => {
  const feature = (req.body?.feature || 'unknown').slice(0, 60);
  console.log(`[interest] portal=${req.session.portalId || '?'} feature=${feature} at=${new Date().toISOString()}`);
  res.json({ ok: true });
});

// User-defined performance targets -- stored in session, drive goal-based meters.
router.get('/goals', requireAuth, (req, res) => {
  res.json(req.session.goals || {});
});
router.post('/goals', requireAuth, (req, res) => {
  const allowed = ['followUpCoverage', 'winRate', 'speedToLead', 'salesCycle', 'leadToDeal', 'leadsCapt'];
  const goals = {};
  for (const k of allowed) {
    const v = parseFloat(req.body?.[k]);
    if (!isNaN(v) && v > 0) goals[k] = v;
  }
  req.session.goals = goals;
  res.json({ ok: true, goals });
});

// Onboarding profile (business type, hubs, revenue, challenge, goal) - used to
// tune the scorecard weights. Stored in the signed session cookie (no DB).
router.get('/onboarding', requireAuth, (req, res) => {
  res.json({ onboarding: req.session.onboarding || null });
});
router.post('/onboarding', requireAuth, (req, res) => {
  const { businessType, hubs, revenue, challenge, goal } = req.body || {};
  req.session.onboarding = { businessType, hubs, revenue, challenge, goal };
  res.json({ onboarding: req.session.onboarding });
});

// GM Dashboard
router.get('/gm-dashboard', requireAuth, async (req, res) => {
  try {
    const { contacts: allContacts, deals: allDeals } = await loadData(req);
    const { days, startDate, endDate } = req.query;
    const contacts = applyDateFilter(allContacts, days, 'createdate', startDate, endDate);
    const deals = applyDateFilter(allDeals, days, 'closedate', startDate, endDate);

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
    const topOpportunities = health.buildTopOpportunities(contacts, deals, healthScore, uncontacted, stuckRecords, biggestLeak);
    const totalRevenueAtRisk = stuckRecords.reduce((s, r) => s + (r.revenueAtRisk || 0), 0);

    const sourceQuality = calc.calculateSourceQuality(contacts, deals);
    const worstSource = sourceQuality.length > 0
      ? [...sourceQuality].sort((a, b) => a.conversionRate - b.conversionRate)[0]
      : null;

    res.json({
      pipelineHealthScore: healthScore,
      totalRevenueAtRisk: Math.round(totalRevenueAtRisk),
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
      topOpportunities,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('GM dashboard error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Metric tiles - comprehensive metric grid
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
    const { contacts: allContacts, deals: allDeals } = await loadData(req);
    const { days, property, startDate, endDate } = req.query;
    const contacts = applyDateFilter(allContacts, days, 'createdate', startDate, endDate);
    const deals = applyDateFilter(allDeals, days, 'closedate', startDate, endDate);
    const sourceProperty = property || 'hs_analytics_source';

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
      worstHighVolume: sources.filter(s => s.contacts >= 10 && s.deals >= 2).sort((a, b) => a.winRate - b.winRate)[0] || null,
      worstWinRate: byWinRate[byWinRate.length - 1] || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stage aging
router.get('/stage-aging', requireAuth, async (req, res) => {
  try {
    const hs = new HubSpotService(req.session.tokens.access_token, req.session.id);
    const { contacts: allContacts, deals: allDeals } = await hs.getCachedData();
    const { days, startDate, endDate } = req.query;
    const contacts = applyDateFilter(allContacts, days, 'createdate', startDate, endDate);
    // Stuck deals are currently open — they have no closedate, so filtering by
    // closedate would exclude all of them. Pass all deals unfiltered; findStuckRecords
    // already skips closed/won/lost deals internally.
    const stuck = health.findStuckRecords(contacts, allDeals);

    // Attribute at-risk records to their owner so a manager can see who's on top
    // of theirs and who's letting deals rot.
    const owners = await hs.getOwners().catch(() => []);
    const ownerMap = Object.fromEntries(owners.map(o => [String(o.id), o.name]));
    const ownerAgg = {};
    for (const r of stuck) {
      const id = r.owner ? String(r.owner) : 'unassigned';
      if (!ownerAgg[id]) ownerAgg[id] = { ownerId: id, name: id === 'unassigned' ? 'Unassigned' : (ownerMap[id] || `Owner ${id}`), count: 0, critical: 0, revenueAtRisk: 0 };
      ownerAgg[id].count++;
      if (r.urgency === 'critical') ownerAgg[id].critical++;
      ownerAgg[id].revenueAtRisk += r.revenueAtRisk || 0;
    }
    const byOwner = Object.values(ownerAgg)
      .map(o => ({ ...o, revenueAtRisk: Math.round(o.revenueAtRisk) }))
      .sort((a, b) => b.count - a.count);

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
      byOwner,
      totalRevenueAtRisk: stuck.reduce((sum, r) => sum + (r.revenueAtRisk || 0), 0),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Speed-to-lead monitor
router.get('/speed-to-lead', requireAuth, async (req, res) => {
  try {
    const hs = new HubSpotService(req.session.tokens.access_token, req.session.id);
    const { contacts: allContacts, deals: allDeals } = await loadData(req);
    const { days, startDate, endDate } = req.query;
    const dateContacts = applyDateFilter(allContacts, days, 'createdate', startDate, endDate);
    const deals = applyDateFilter(allDeals, days, 'closedate', startDate, endDate);

    // Exclude contacts the user has flagged as spam so junk form-fills don't
    // skew response-time metrics (Dan: form contacts are mostly garbage).
    const spam = spamSet(req);
    const contacts = dateContacts.filter(c => !spam.has(c.id));

    const speed = calc.calculateTimeToFirstTouch(contacts);
    const uncontacted = health.findUncontactedLeads(contacts);

    // Triage list: score every contact for spam signals, sort worst first.
    const stageLbl = { lead: 'Lead', marketingqualifiedlead: 'MQL', salesqualifiedlead: 'SQL', opportunity: 'Opportunity', customer: 'Customer' };
    const CONSUMER_DOMAINS = new Set(['gmail.com','yahoo.com','hotmail.com','outlook.com','icloud.com','me.com','aol.com','live.com','msn.com','protonmail.com','mail.com']);
    const SUSPICIOUS_PAT = /^(test|fake|asdf|qwerty|admin|noreply|no-reply|info|hello|user|demo|sample|spam|junk|temp|null|undefined|\d+)[^@]*@/i;

    const triageCandidates = [...dateContacts]
      .map(c => {
        const email = c.properties.email || null;
        const firstName = c.properties.firstname || '';
        const lastName = c.properties.lastname || '';
        const name = [firstName, lastName].filter(Boolean).join(' ') || '(no name)';
        const created = new Date(c.properties.createdate).getTime();
        const firstTouch = c.properties.notes_last_contacted ? new Date(c.properties.notes_last_contacted).getTime() : null;
        const respHours = firstTouch && !isNaN(created) ? Math.round(((firstTouch - created) / 3600000) * 10) / 10 : null;
        const touched = parseInt(c.properties.num_contacted_notes || '0') > 0;
        const domain = email ? email.split('@')[1]?.toLowerCase() : null;

        const signals = [];
        if (!email) signals.push('noEmail');
        if (name === '(no name)') signals.push('noName');
        if (email && SUSPICIOUS_PAT.test(email)) signals.push('suspiciousEmail');
        if (domain && CONSUMER_DOMAINS.has(domain)) signals.push('consumerEmail');
        if (!touched) signals.push('neverTouched');
        if (!c.properties.hs_analytics_source || c.properties.hs_analytics_source === 'UNKNOWN') signals.push('unknownSource');

        return {
          id: c.id,
          name,
          email,
          source: c.properties.hs_analytics_source || null,
          stage: stageLbl[c.properties.lifecyclestage] || c.properties.lifecyclestage || '-',
          createdAt: c.properties.createdate || null,
          respHours,
          touched,
          signals,
          spamScore: signals.length,
          isSpam: spam.has(c.id),
        };
      })
      .sort((a, b) => b.spamScore - a.spamScore || new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 200);

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

    // Response time distribution for histogram + per-bucket contact lists
    const stageLabels = { lead: 'Lead', marketingqualifiedlead: 'MQL', salesqualifiedlead: 'SQL', opportunity: 'Opportunity' };
    const contactedLeads = contacts.map(c => {
      const created = new Date(c.properties.createdate).getTime();
      const firstTouch = c.properties.notes_last_contacted ? new Date(c.properties.notes_last_contacted).getTime() : null;
      if (!firstTouch) return null;
      const hours = (firstTouch - created) / 3600000;
      if (hours <= 0 || hours > 720) return null;
      return {
        id: c.id,
        name: [c.properties.firstname, c.properties.lastname].filter(Boolean).join(' ') || 'Unknown',
        email: c.properties.email,
        hours: Math.round(hours * 10) / 10,
        stage: stageLabels[c.properties.lifecyclestage] || c.properties.lifecyclestage,
        source: c.properties.hs_analytics_source,
        hubspotUrl: `https://app.hubspot.com/contacts/${c.id}`,
      };
    }).filter(Boolean);

    const buckets = {
      under1h: contactedLeads.filter(c => c.hours < 1),
      h1to6:   contactedLeads.filter(c => c.hours >= 1 && c.hours < 6),
      h6to24:  contactedLeads.filter(c => c.hours >= 6 && c.hours < 24),
      over24h: contactedLeads.filter(c => c.hours >= 24),
    };

    const distribution = contactedLeads.length > 0 ? [
      { label: 'Under 1h',   key: 'under1h', count: buckets.under1h.length, color: '#10B981' },
      { label: '1-6 hours',  key: 'h1to6',   count: buckets.h1to6.length,   color: '#34D399' },
      { label: '6-24 hours', key: 'h6to24',  count: buckets.h6to24.length,  color: '#F59E0B' },
      { label: 'Over 24h',   key: 'over24h', count: buckets.over24h.length,  color: '#EF4444' },
    ] : [];

    // Activity summary - calls, emails, meetings in last 30 days + week-over-week
    const activitySummary = await hs.getActivitySummary(30).catch(() => ({}));
    const activityComparison = await hs.getActivityComparison().catch(() => ({}));

    res.json({
      summary: speed,
      distribution,
      contactsByBucket: buckets,
      activitySummary,
      activityComparison,
      triageCandidates,
      spamCount: spam.size,
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
