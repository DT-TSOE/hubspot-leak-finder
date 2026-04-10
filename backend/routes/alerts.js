const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const HubSpotService = require('../services/hubspot');
const { generateAlerts, buildEmailDigest } = require('../services/alertEngine');

// Get current alerts
router.get('/', requireAuth, async (req, res) => {
  try {
    const hs = new HubSpotService(req.session.tokens.access_token);
    const [contacts, deals] = await Promise.all([hs.getContacts(), hs.getDeals()]);
    const alerts = generateAlerts(contacts, deals);
    res.json({
      alerts,
      urgent: alerts.filter(a => a.severity === 'urgent').length,
      warnings: alerts.filter(a => a.severity === 'warning').length,
      total: alerts.length,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get email digest preview
router.get('/digest', requireAuth, async (req, res) => {
  try {
    const hs = new HubSpotService(req.session.tokens.access_token);
    const [contacts, deals] = await Promise.all([hs.getContacts(), hs.getDeals()]);
    const alerts = generateAlerts(contacts, deals);
    const digest = buildEmailDigest(alerts);
    res.json(digest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save email preferences
router.post('/preferences', requireAuth, (req, res) => {
  const { email, sendTime, frequency } = req.body;
  req.session.alertPrefs = { email, sendTime: sendTime || '08:00', frequency: frequency || 'daily', enabled: true };
  res.json({ success: true });
});

router.get('/preferences', requireAuth, (req, res) => {
  res.json(req.session.alertPrefs || { enabled: false });
});

module.exports = router;
