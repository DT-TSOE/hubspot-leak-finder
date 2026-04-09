const express = require('express');
const router = express.Router();
const axios = require('axios');
const requireAuth = require('../middleware/requireAuth');
const { chatLimiter } = require('../middleware/security');
const { buildContext, LA_JEFA_SYSTEM_PROMPT } = require('../services/laJefaContext');
const HubSpotService = require('../services/hubspot');
const ActivityAnalyzer = require('../services/activityAnalysis');
const { analyzeFunnel } = require('../services/funnelAnalysis');
const { analyzeBySource, analyzeActivityLevels, analyzeSpeedToLead } = require('../services/behavioralAnalysis');
const { generateInsights } = require('../services/insightEngine');
const { scoreLeads } = require('../services/leadScoring');

router.post('/', requireAuth, chatLimiter, async (req, res) => {
  const { message, conversationHistory = [] } = req.body;
  if (!message || typeof message !== 'string' || message.length > 500) {
    return res.status(400).json({ error: 'Invalid message.' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'AI chat not configured. Add ANTHROPIC_API_KEY to your .env file.' });
  }

  try {
    const hs = new HubSpotService(req.session.tokens.access_token);
    const analyzer = new ActivityAnalyzer(req.session.tokens.access_token);

    // Fetch core data
    const [contacts, deals] = await Promise.all([hs.getContacts(), hs.getDeals()]);
    const dealsWithContacts = await Promise.all(
      deals.slice(0, 100).map(async d => ({ ...d, _contactIds: await hs.getDealAssociations(d.id) }))
    );

    // Run funnel analysis
    const funnelResult = analyzeFunnel(contacts);
    const funnelData = {
      funnel: funnelResult,
      behavioral: {
        bySource: analyzeBySource(contacts, dealsWithContacts),
        activityLevels: analyzeActivityLevels(contacts, dealsWithContacts),
        speedToLead: analyzeSpeedToLead(contacts, dealsWithContacts)
      },
      summary: { totalContacts: contacts.length, totalDeals: deals.length }
    };

    const insightsData = {
      insights: generateInsights(funnelResult, funnelData.behavioral.bySource, funnelData.behavioral.activityLevels, funnelData.behavioral.speedToLead)
    };

    const leadsScored = scoreLeads(contacts);
    const leadsData = { leads: leadsScored, total: leadsScored.length };

    // Fetch activity data (calls, emails, meetings, notes)
    let activityData = null;
    try {
      const wonDeals = deals.filter(d => d.properties.dealstage === 'closedwon');
      const lostDeals = deals.filter(d => d.properties.dealstage === 'closedlost');
      const sampleDeals = [...wonDeals.slice(0, 25), ...lostDeals.slice(0, 25)];

      if (sampleDeals.length > 0) {
        const activities = await analyzer.getActivitiesForDeals(sampleDeals.map(d => d.id));
        const comparison = analyzer.analyzeActivities(
          wonDeals.slice(0, 25).map(d => d.id),
          lostDeals.slice(0, 25).map(d => d.id),
          activities
        );
        const lossReasons = analyzer.analyzeLossReasons(deals);
        const notesContent = analyzer.getNotesContent(activities);

        activityData = { comparison, lossReasons, notesContent };
      }
    } catch (err) {
      console.log('Activity fetch partial failure (non-fatal):', err.message);
    }

    // Build context and call Anthropic
    const pipelineContext = buildContext(funnelData, insightsData, leadsData, activityData);
    const messages = [
      ...conversationHistory.slice(-6).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ];

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: `${LA_JEFA_SYSTEM_PROMPT}\n\n${pipelineContext}`,
        messages
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      }
    );

    res.json({ reply: response.data.content?.[0]?.text || 'Unable to generate response.' });

  } catch (err) {
    console.error('Chat error:', err.response?.data || err.message);
    if (err.response?.status === 429) return res.status(429).json({ error: 'AI service busy. Try again shortly.' });
    res.status(500).json({ error: 'Failed to get response. Please try again.' });
  }
});

router.get('/status', requireAuth, (req, res) => res.json({ available: true, limit: 50 }));

module.exports = router;
