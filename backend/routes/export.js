const express = require('express');
const router = express.Router();
const HubSpotService = require('../services/hubspot');
const { analyzeFunnel } = require('../services/funnelAnalysis');
const { analyzeBySource, analyzeActivityLevels, analyzeSpeedToLead } = require('../services/behavioralAnalysis');
const { generateInsights } = require('../services/insightEngine');
const { scoreLeads } = require('../services/leadScoring');

function requireAuth(req, res, next) {
  if (!req.session?.tokens?.access_token) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

// CSV export of lead scores
router.get('/leads-csv', requireAuth, async (req, res) => {
  try {
    const hs = new HubSpotService(req.session.tokens.access_token);
    const contacts = await hs.getContacts();
    const scored = scoreLeads(contacts);

    const headers = ['Name', 'Email', 'Stage', 'Risk Score', 'Risk Level', 'Days in Stage', 'Touches', 'Days Since Contact', 'Flags'];
    const rows = scored.map(l => [
      `"${l.name}"`,
      `"${l.email}"`,
      l.stage,
      l.score,
      l.risk,
      l.daysInStage,
      l.touches,
      l.daysSinceContact ?? 'Never',
      `"${l.flags.join('; ')}"`,
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="lead-risk-scores.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CSV export of funnel data
router.get('/funnel-csv', requireAuth, async (req, res) => {
  try {
    const hs = new HubSpotService(req.session.tokens.access_token);
    const contacts = await hs.getContacts();
    const funnel = analyzeFunnel(contacts);

    const headers = ['Stage', 'Contacts', 'Conversion Rate (%)', 'Drop-Off', 'Drop-Off Rate (%)'];
    const rows = funnel.funnelStages.map(s => [
      s.label, s.count, s.conversionRate, s.dropOff, s.dropOffRate
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="funnel-analysis.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Insights export as plain text (for email digest)
router.get('/insights-text', requireAuth, async (req, res) => {
  try {
    const hs = new HubSpotService(req.session.tokens.access_token);
    const [contacts, deals] = await Promise.all([hs.getContacts(), hs.getDeals()]);

    const dealsWithContacts = await Promise.all(
      deals.slice(0, 200).map(async d => ({ ...d, _contactIds: await hs.getDealAssociations(d.id) }))
    );

    const funnelData = analyzeFunnel(contacts);
    const sourceData = analyzeBySource(contacts, dealsWithContacts);
    const activityData = analyzeActivityLevels(contacts, dealsWithContacts);
    const speedData = analyzeSpeedToLead(contacts, dealsWithContacts);
    const insights = generateInsights(funnelData, sourceData, activityData, speedData);

    const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    let text = `LIFECYCLE LEAK FINDER — Weekly Digest\n${date}\n${'='.repeat(50)}\n\n`;
    text += `SUMMARY\nTotal Contacts: ${contacts.length} | Total Deals: ${deals.length}\n\n`;
    text += `TOP INSIGHTS\n${'-'.repeat(50)}\n\n`;

    insights.forEach((ins, i) => {
      text += `${i + 1}. [${ins.type.toUpperCase()}] ${ins.title}\n`;
      text += `   Data: ${ins.dataPoint}\n`;
      text += `   Action: ${ins.action}\n\n`;
    });

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename="insights-digest.txt"');
    res.send(text);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
