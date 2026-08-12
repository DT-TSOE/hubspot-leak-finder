/**
 * Server-side plan / entitlement checks.
 *
 * Minimal for now: a portal is "Pro" if it has an entitled Stripe subscription,
 * or if BETA_ALL_ACCESS is on (open beta). When the full reverse-trial
 * entitlement resolver lands, swap the body of isPro() for it — callers won't
 * change.
 */
const db = require('./db');

const BETA_ALL_ACCESS = process.env.BETA_ALL_ACCESS === 'true';
const ENTITLED = ['trialing', 'active', 'past_due'];

// Does this account get Pro capabilities (unlimited HubSpot connections)?
async function isPro(portalId) {
  if (BETA_ALL_ACCESS) return true;
  if (!portalId) return false;
  const sub = await db.getSubscription(portalId);
  return ENTITLED.includes(sub?.status);
}

// Free = 1 HubSpot connection. Pro/trial = unlimited.
const FREE_MAX_CONNECTIONS = 1;

module.exports = { isPro, BETA_ALL_ACCESS, FREE_MAX_CONNECTIONS };
