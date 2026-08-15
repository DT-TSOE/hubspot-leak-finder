const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');
const HubSpotService = require('../services/hubspot');
const db = require('../services/db');
const plan = require('../services/plan');

// Read-only: PipeChamp only reads HubSpot data, never writes. Keep least-privilege for marketplace review.
const SCOPES = ['crm.objects.contacts.read','crm.objects.deals.read','crm.objects.owners.read'].join(' ');
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// ---- helpers ---------------------------------------------------------------

// Identify a portal from an access token: portalId + a friendly label + user email.
async function tokenInfo(accessToken) {
  try {
    const r = await axios.get(`https://api.hubapi.com/oauth/v1/access-tokens/${accessToken}`);
    return {
      portalId: r.data.hub_id != null ? String(r.data.hub_id) : null,
      portalName: r.data.hub_domain || null,
      userEmail: r.data.user || null,
    };
  } catch { return null; }
}

function makeTokens(data) {
  return { access_token: data.access_token, refresh_token: data.refresh_token, expires_at: Date.now() + (data.expires_in * 1000) };
}

// Fire-and-forget: push a signup/connect event to our internal CRM (a Google
// Apps Script → Sheet). No-op unless CRM_WEBHOOK_URL is set, and never blocks or
// fails the connect flow.
function notifyCrm(fields) {
  const url = process.env.CRM_WEBHOOK_URL;
  if (!url) return;
  const body = new URLSearchParams();
  Object.entries(fields).forEach(([k, v]) => { if (v != null && v !== '') body.append(k, String(v)); });
  axios.post(url, body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 8000,
  }).catch(() => { /* best-effort */ });
}

// Cache key for HubSpotService is derived from the ACTIVE token tail, so switching
// portals switches cache buckets automatically.
function setActive(req, tokens, portalId) {
  req.session.tokens = tokens;
  req.session.activePortalId = portalId || null;
  req.session.id = 'cs_' + tokens.access_token.slice(-16);
}

function ensureSid(req) {
  if (!req.session.sid) req.session.sid = crypto.randomUUID();
  return req.session.sid;
}

// Backfill: an already-connected user (tokens in cookie, no DB row yet) gets their
// current active connection written into the connections table so the list is complete.
async function migrateLegacy(req) {
  if (!db.enabled() || !req.session?.tokens?.access_token) return;
  const sid = ensureSid(req);
  const existing = await db.listConnections(sid);
  const activeId = req.session.activePortalId;
  if (activeId && existing.some(c => c.portal_id === activeId)) return; // already recorded
  const info = await tokenInfo(req.session.tokens.access_token);
  if (!info?.portalId) return;
  await db.upsertConnection(sid, {
    portalId: info.portalId, portalName: info.portalName, userEmail: info.userEmail,
    accessToken: req.session.tokens.access_token,
    refreshToken: req.session.tokens.refresh_token,
    expiresAt: req.session.tokens.expires_at,
  });
  req.session.activePortalId = info.portalId;
}

async function revokePortal(sid, portalId, refreshToken) {
  if (refreshToken) {
    await axios.delete(`https://api.hubapi.com/oauth/v1/refresh-tokens/${refreshToken}`).catch(() => {});
  }
  if (sid && portalId) await db.deleteConnection(sid, portalId);
  if (portalId) await db.deletePortal(portalId); // purge that portal's stored snapshots
}

// ---- OAuth flow ------------------------------------------------------------

router.get('/connect', (req, res) => {
  const params = new URLSearchParams({ client_id:process.env.HUBSPOT_CLIENT_ID, redirect_uri:process.env.HUBSPOT_REDIRECT_URI, scope:SCOPES, response_type:'code' });
  res.redirect(`https://app.hubspot.com/oauth/authorize?${params}`);
});

router.get('/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.redirect(`${FRONTEND_URL}?error=no_code`);
  try {
    const r = await axios.post('https://api.hubapi.com/oauth/v1/token',
      new URLSearchParams({ grant_type:'authorization_code', client_id:process.env.HUBSPOT_CLIENT_ID, client_secret:process.env.HUBSPOT_CLIENT_SECRET, redirect_uri:process.env.HUBSPOT_REDIRECT_URI, code }),
      { headers: { 'Content-Type':'application/x-www-form-urlencoded' } }
    );
    const tokens = makeTokens(r.data);

    // Without a DB we can only hold one connection (in the cookie) — keep the
    // original single-connection behaviour so local/no-DB setups still work.
    if (!db.enabled()) { setActive(req, tokens, null); return res.redirect(`${FRONTEND_URL}?connected=true`); }

    const info = await tokenInfo(tokens.access_token);
    if (!info?.portalId) { setActive(req, tokens, null); return res.redirect(`${FRONTEND_URL}?connected=true`); }

    const sid = ensureSid(req);
    const already = await db.getConnection(sid, info.portalId);

    // Gate: adding a NEW portal beyond the free limit requires Pro. Re-authing an
    // existing portal is always allowed (it just refreshes its tokens).
    if (!already) {
      const count = await db.countConnections(sid);
      if (count >= plan.FREE_MAX_CONNECTIONS) {
        const list = await db.listConnections(sid);
        const primaryId = list[0]?.portal_id || req.session.activePortalId;
        if (!(await plan.isPro(primaryId))) {
          return res.redirect(`${FRONTEND_URL}?error=upgrade_required`);
        }
      }
    }

    await db.upsertConnection(sid, {
      portalId: info.portalId, portalName: info.portalName, userEmail: info.userEmail,
      accessToken: tokens.access_token, refreshToken: tokens.refresh_token, expiresAt: tokens.expires_at,
    });
    // Log the signup/connect to our internal CRM (the Sheet decides new vs returning).
    notifyCrm({
      action: 'lead', portalId: info.portalId, company: info.portalName,
      email: info.userEmail, source: 'HubSpot connect', connected_at: new Date().toISOString(),
    });
    setActive(req, tokens, info.portalId);
    res.redirect(`${FRONTEND_URL}?connected=true`);
  } catch (err) {
    console.error('OAuth error:', err.response?.data || err.message);
    res.redirect(`${FRONTEND_URL}?error=oauth_failed`);
  }
});

router.get('/status', (req, res) => res.json({ connected: !!req.session.tokens }));

// ---- Connection management -------------------------------------------------

// List every connected HubSpot portal for this session + which is active.
router.get('/connections', async (req, res) => {
  if (!req.session?.tokens) return res.status(401).json({ error: 'Not authenticated.' });
  if (!db.enabled()) {
    // No DB: single connection only.
    return res.json({ connections: [{ portalId: req.session.activePortalId || null, portalName: null, active: true }], activePortalId: req.session.activePortalId || null, canAddMore: false });
  }
  await migrateLegacy(req);
  const sid = ensureSid(req);
  const rows = await db.listConnections(sid);
  const activeId = req.session.activePortalId;
  const primaryId = rows[0]?.portal_id || activeId;
  const canAddMore = await plan.isPro(primaryId);
  res.json({
    connections: rows.map(c => ({ portalId: c.portal_id, portalName: c.portal_name, userEmail: c.user_email, active: c.portal_id === activeId })),
    activePortalId: activeId || null,
    canAddMore,
  });
});

// Switch the active portal.
router.post('/connections/active', async (req, res) => {
  if (!req.session?.tokens) return res.status(401).json({ error: 'Not authenticated.' });
  if (!db.enabled()) return res.status(400).json({ error: 'Multiple connections require a database.' });
  const { portalId } = req.body || {};
  const sid = ensureSid(req);
  const conn = await db.getConnection(sid, String(portalId));
  if (!conn) return res.status(404).json({ error: 'Connection not found.' });
  setActive(req, { access_token: conn.access_token, refresh_token: conn.refresh_token, expires_at: Number(conn.expires_at) || 0 }, conn.portal_id);
  res.json({ success: true, activePortalId: conn.portal_id });
});

// Disconnect ONE portal. If it was active, promote another; if none remain, sign out.
router.post('/connections/:portalId/disconnect', async (req, res) => {
  if (!req.session?.tokens) return res.status(401).json({ error: 'Not authenticated.' });
  if (!db.enabled()) return res.status(400).json({ error: 'Multiple connections require a database.' });
  const sid = ensureSid(req);
  const portalId = String(req.params.portalId);
  const conn = await db.getConnection(sid, portalId);
  if (!conn) return res.status(404).json({ error: 'Connection not found.' });

  HubSpotService.invalidateCache('cs_' + conn.access_token.slice(-16));
  await revokePortal(sid, portalId, conn.refresh_token);

  const remaining = await db.listConnections(sid);
  if (remaining.length === 0) { req.session = null; return res.json({ success: true, remaining: 0 }); }

  if (req.session.activePortalId === portalId) {
    const next = remaining[0];
    setActive(req, { access_token: next.access_token, refresh_token: next.refresh_token, expires_at: Number(next.expires_at) || 0 }, next.portal_id);
  }
  res.json({ success: true, remaining: remaining.length, activePortalId: req.session.activePortalId });
});

// Full sign-out: revoke and purge every connected portal, then clear the session.
router.post('/disconnect', async (req, res) => {
  const sessionId = req.session?.id;
  const sid = req.session?.sid;
  try {
    if (db.enabled() && sid) {
      const rows = await db.listConnections(sid);
      // Fall back to the cookie's active token if the list is empty (no-DB legacy).
      if (rows.length === 0 && req.session?.tokens?.refresh_token) {
        await axios.delete(`https://api.hubapi.com/oauth/v1/refresh-tokens/${req.session.tokens.refresh_token}`).catch(() => {});
      }
      for (const c of rows) await revokePortal(sid, c.portal_id, c.refresh_token);
    } else if (req.session?.tokens?.refresh_token) {
      // No DB: revoke the single cookie connection and purge its data.
      try {
        const portalId = await new HubSpotService(req.session.tokens.access_token).getPortalId();
        if (portalId) await db.deletePortal(portalId);
      } catch { /* best-effort */ }
      await axios.delete(`https://api.hubapi.com/oauth/v1/refresh-tokens/${req.session.tokens.refresh_token}`).catch(() => {});
    }
  } finally {
    HubSpotService.invalidateCache(sessionId);
    req.session = null;
    res.json({ success: true });
  }
});

module.exports = router;
