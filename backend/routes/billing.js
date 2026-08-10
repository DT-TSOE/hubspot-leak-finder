const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const HubSpotService = require('../services/hubspot');
const db = require('../services/db');
// Use a harmless placeholder if the key isn't set yet, so requiring this module
// never throws at boot (an empty string makes the Stripe constructor throw).
// Real API calls only run when routes are hit, and are guarded by CONFIGURED.
const CONFIGURED = !!process.env.STRIPE_SECRET_KEY;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_placeholder_not_configured');

// The $99/mo Pro price (test-mode default; override with STRIPE_PRICE_PRO in live).
const PRICE_PRO = process.env.STRIPE_PRICE_PRO || 'price_1U2kKJ7a4D8UVT0JPu2KfRpn';
const APP_URL = (process.env.FRONTEND_URL || 'https://www.pipechamp.app').replace(/\/$/, '');
const ACTIVE = ['trialing', 'active', 'past_due'];

// Resolve the HubSpot portal id for the current session (used as our account key).
async function getPortal(req) {
  if (req.session.portalId) return req.session.portalId;
  const hs = new HubSpotService(req.session.tokens.access_token);
  const pid = await hs.getPortalId();
  req.session.portalId = pid;
  return pid;
}

// Persist a Stripe subscription against a portal.
async function saveSub(portalId, customerId, sub) {
  await db.upsertSubscription(String(portalId), {
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    plan: 'pro',
    status: sub.status, // trialing | active | past_due | canceled | unpaid | incomplete...
    trial_end: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
    current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
  });
}

// Start a Pro subscription: Checkout Session, 14-day trial, no card required to start.
router.post('/checkout', requireAuth, async (req, res) => {
  if (!CONFIGURED) return res.status(503).json({ error: 'Billing is not configured yet.' });
  try {
    const portalId = await getPortal(req);
    const existing = await db.getSubscription(portalId);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: PRICE_PRO, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
        metadata: { portalId: String(portalId) },
      },
      payment_method_collection: 'if_required', // trial starts without a card
      client_reference_id: String(portalId),
      metadata: { portalId: String(portalId) },
      allow_promotion_codes: true,
      ...(existing?.stripe_customer_id ? { customer: existing.stripe_customer_id } : {}),
      success_url: `${APP_URL}/?billing=success`,
      cancel_url: `${APP_URL}/?billing=cancel`,
    });
    res.json({ url: session.url });
  } catch (e) {
    console.error('billing/checkout error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Current plan/status for this portal.
router.get('/status', requireAuth, async (req, res) => {
  try {
    const portalId = await getPortal(req);
    const sub = await db.getSubscription(portalId);
    const active = !!sub && ACTIVE.includes(sub.status);
    res.json({
      plan: active ? 'pro' : 'free',
      status: sub?.status || 'none',
      trialEnd: sub?.trial_end || null,
      currentPeriodEnd: sub?.current_period_end || null,
      hasCustomer: !!sub?.stripe_customer_id,
    });
  } catch (e) {
    console.error('billing/status error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Stripe Billing Portal — self-serve manage/cancel/update card.
router.post('/portal', requireAuth, async (req, res) => {
  if (!CONFIGURED) return res.status(503).json({ error: 'Billing is not configured yet.' });
  try {
    const portalId = await getPortal(req);
    const sub = await db.getSubscription(portalId);
    if (!sub?.stripe_customer_id) return res.status(400).json({ error: 'No billing account yet.' });
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${APP_URL}/`,
    });
    res.json({ url: session.url });
  } catch (e) {
    console.error('billing/portal error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Webhook — mounted in server.js with express.raw() BEFORE express.json().
async function webhookHandler(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.error('Stripe webhook signature verification failed:', e.message);
    return res.status(400).send(`Webhook Error: ${e.message}`);
  }
  try {
    const obj = event.data.object;
    switch (event.type) {
      case 'checkout.session.completed': {
        const portalId = obj.metadata?.portalId || obj.client_reference_id;
        if (portalId && obj.subscription) {
          const sub = await stripe.subscriptions.retrieve(obj.subscription);
          await saveSub(portalId, obj.customer, sub);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const portalId = obj.metadata?.portalId;
        if (portalId) await saveSub(portalId, obj.customer, obj);
        break;
      }
      // invoice.payment_failed surfaces as subscription.updated -> status past_due; no extra work.
    }
    res.json({ received: true });
  } catch (e) {
    console.error('Stripe webhook handler error:', e.message);
    res.status(500).json({ error: e.message });
  }
}

module.exports = { router, webhookHandler };
