const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const HubSpotService = require('../services/hubspot');
const { analyzeFunnel } = require('../services/funnelAnalysis');
const { generateInsights } = require('../services/insightEngine');
const { analyzeBySource, analyzeActivityLevels, analyzeSpeedToLead } = require('../services/behavioralAnalysis');
const { scoreLeads } = require('../services/leadScoring');

router.get('/leads-csv', requireAuth, async (req, res) => {
  try {
    const hs = new HubSpotService(req.session.tokens.access_token);
    const contacts = await hs.getContacts();
    const scored = scoreLeads(contacts);
    const headers = ['Name','Email','Stage','Risk Score','Risk Level','Days in Stage','Touches','Days Since Contact','Flags'];
    const rows = scored.map(l => [`"${l.name}"`,`"${l.email}"`,l.stage,l.score,l.risk,l.daysInStage,l.touches,l.daysSinceContact??'Never',`"${l.flags.join('; ')}"`]);
    const csv = [headers.join(','),...rows.map(r=>r.join(','))].join('\n');
    res.setHeader('Content-Type','text/csv');
    res.setHeader('Content-Disposition','attachment; filename="lead-risk-scores.csv"');
    res.send(csv);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/funnel-csv', requireAuth, async (req, res) => {
  try {
    const hs = new HubSpotService(req.session.tokens.access_token);
    const contacts = await hs.getContacts();
    const funnel = analyzeFunnel(contacts);
    const headers = ['Stage','Contacts','Conversion Rate (%)','Drop-Off','Drop-Off Rate (%)'];
    const rows = funnel.funnelStages.map(s => [s.label,s.count,s.conversionRate,s.dropOff,s.dropOffRate]);
    const csv = [headers.join(','),...rows.map(r=>r.join(','))].join('\n');
    res.setHeader('Content-Type','text/csv');
    res.setHeader('Content-Disposition','attachment; filename="funnel-analysis.csv"');
    res.send(csv);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/insights-text', requireAuth, async (req, res) => {
  try {
    const hs = new HubSpotService(req.session.tokens.access_token);
    const [contacts, deals] = await Promise.all([hs.getContacts(), hs.getDeals()]);
    const dealsWithContacts = await Promise.all(deals.slice(0,200).map(async d => ({ ...d, _contactIds: await hs.getDealAssociations(d.id) })));
    const funnelData = analyzeFunnel(contacts);
    const insights = generateInsights(funnelData, analyzeBySource(contacts,dealsWithContacts), analyzeActivityLevels(contacts,dealsWithContacts), analyzeSpeedToLead(contacts,dealsWithContacts));
    const date = new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
    let text = `PIPECHAMP — Revenue Intelligence Digest\n${date}\n${'='.repeat(50)}\n\nSUMMARY\nTotal Contacts: ${contacts.length} | Total Deals: ${deals.length}\n\nINSIGHTS\n${'-'.repeat(50)}\n\n`;
    insights.forEach((ins,i) => { text += `${i+1}. [${ins.type}] ${ins.title}\n   Data: ${ins.dataPoint}\n   Action: ${ins.action}\n\n`; });
    res.setHeader('Content-Type','text/plain');
    res.setHeader('Content-Disposition','attachment; filename="insights-digest.txt"');
    res.send(text);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
