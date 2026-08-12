/**
 * Postgres access for monthly scorecard snapshots.
 *
 * Gracefully no-ops when DATABASE_URL is not set, so the app runs fine before
 * the database is provisioned - snapshots simply don't record until then.
 * Stores ONLY aggregate scorecard numbers (grades, scores, metrics) - never
 * contact-level data or PII.
 */
const { Pool } = require('pg');

const url = process.env.DATABASE_URL;
const useSsl = url && (/sslmode=require/.test(url) || process.env.DATABASE_SSL === 'true');
const pool = url ? new Pool({ connectionString: url, ssl: useSsl ? { rejectUnauthorized: false } : false }) : null;

let ready = false;
async function init() {
  if (!pool || ready) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS scorecard_snapshots (
      id SERIAL PRIMARY KEY,
      portal_id TEXT NOT NULL,
      period TEXT NOT NULL,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE (portal_id, period)
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      portal_id TEXT PRIMARY KEY,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      plan TEXT,
      status TEXT,
      trial_end TIMESTAMPTZ,
      current_period_end TIMESTAMPTZ,
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  // Multiple HubSpot connections per browser session (sid). The ACTIVE portal's
  // tokens also live in the cookie for the hot path; this table is the source of
  // truth for the full list and the non-active portals' tokens.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS connections (
      sid TEXT NOT NULL,
      portal_id TEXT NOT NULL,
      portal_name TEXT,
      user_email TEXT,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      expires_at BIGINT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      PRIMARY KEY (sid, portal_id)
    );
  `);
  ready = true;
}

function currentPeriod(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const enabled = () => !!pool;

// Upsert this month's snapshot (latest view wins for the current period).
async function saveSnapshot(portalId, payload) {
  if (!pool || !portalId) return;
  try {
    await init();
    await pool.query(
      `INSERT INTO scorecard_snapshots (portal_id, period, payload)
       VALUES ($1, $2, $3)
       ON CONFLICT (portal_id, period) DO UPDATE SET payload = EXCLUDED.payload, created_at = now()`,
      [String(portalId), currentPeriod(), payload]
    );
  } catch (e) { console.error('saveSnapshot error:', e.message); }
}

// Most recent snapshot from a PRIOR month, for "vs last month" deltas.
async function getPreviousSnapshot(portalId) {
  if (!pool || !portalId) return null;
  try {
    await init();
    const r = await pool.query(
      `SELECT period, payload, created_at FROM scorecard_snapshots
       WHERE portal_id = $1 AND period < $2
       ORDER BY period DESC LIMIT 1`,
      [String(portalId), currentPeriod()]
    );
    return r.rows[0] || null;
  } catch (e) { console.error('getPreviousSnapshot error:', e.message); return null; }
}

// Full history (newest first) for a trend view.
async function getSnapshotHistory(portalId, limit = 12) {
  if (!pool || !portalId) return [];
  try {
    await init();
    const r = await pool.query(
      `SELECT period, payload, created_at FROM scorecard_snapshots
       WHERE portal_id = $1 ORDER BY period DESC LIMIT $2`,
      [String(portalId), limit]
    );
    return r.rows;
  } catch (e) { console.error('getSnapshotHistory error:', e.message); return []; }
}

// Delete all stored data for a portal (called on disconnect/uninstall).
async function deletePortal(portalId) {
  if (!pool || !portalId) return;
  try {
    await init();
    await pool.query(`DELETE FROM scorecard_snapshots WHERE portal_id = $1`, [String(portalId)]);
  } catch (e) { console.error('deletePortal error:', e.message); }
}

// ---- Subscriptions (Stripe billing) ----
async function upsertSubscription(portalId, f) {
  if (!pool || !portalId) return;
  try {
    await init();
    await pool.query(
      `INSERT INTO subscriptions (portal_id, stripe_customer_id, stripe_subscription_id, plan, status, trial_end, current_period_end, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7, now())
       ON CONFLICT (portal_id) DO UPDATE SET
         stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, subscriptions.stripe_customer_id),
         stripe_subscription_id = EXCLUDED.stripe_subscription_id,
         plan = EXCLUDED.plan, status = EXCLUDED.status,
         trial_end = EXCLUDED.trial_end, current_period_end = EXCLUDED.current_period_end,
         updated_at = now()`,
      [String(portalId), f.stripe_customer_id || null, f.stripe_subscription_id || null,
       f.plan || null, f.status || null, f.trial_end || null, f.current_period_end || null]
    );
  } catch (e) { console.error('upsertSubscription error:', e.message); }
}

async function getSubscription(portalId) {
  if (!pool || !portalId) return null;
  try {
    await init();
    const r = await pool.query(`SELECT * FROM subscriptions WHERE portal_id = $1`, [String(portalId)]);
    return r.rows[0] || null;
  } catch (e) { console.error('getSubscription error:', e.message); return null; }
}

// ---- HubSpot connections (multi-instance) ----

// All connections for a browser session, oldest first (first-connected = primary).
async function listConnections(sid) {
  if (!pool || !sid) return [];
  try {
    await init();
    const r = await pool.query(
      `SELECT sid, portal_id, portal_name, user_email, access_token, refresh_token, expires_at, created_at
       FROM connections WHERE sid = $1 ORDER BY created_at ASC`,
      [String(sid)]
    );
    return r.rows;
  } catch (e) { console.error('listConnections error:', e.message); return []; }
}

async function getConnection(sid, portalId) {
  if (!pool || !sid || !portalId) return null;
  try {
    await init();
    const r = await pool.query(
      `SELECT sid, portal_id, portal_name, user_email, access_token, refresh_token, expires_at, created_at
       FROM connections WHERE sid = $1 AND portal_id = $2`,
      [String(sid), String(portalId)]
    );
    return r.rows[0] || null;
  } catch (e) { console.error('getConnection error:', e.message); return null; }
}

async function countConnections(sid) {
  if (!pool || !sid) return 0;
  try {
    await init();
    const r = await pool.query(`SELECT COUNT(*)::int AS n FROM connections WHERE sid = $1`, [String(sid)]);
    return r.rows[0]?.n || 0;
  } catch (e) { console.error('countConnections error:', e.message); return 0; }
}

// Insert or refresh a connection (tokens + name). created_at is preserved on update.
async function upsertConnection(sid, c) {
  if (!pool || !sid || !c?.portalId) return;
  try {
    await init();
    await pool.query(
      `INSERT INTO connections (sid, portal_id, portal_name, user_email, access_token, refresh_token, expires_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7, now())
       ON CONFLICT (sid, portal_id) DO UPDATE SET
         portal_name = COALESCE(EXCLUDED.portal_name, connections.portal_name),
         user_email = COALESCE(EXCLUDED.user_email, connections.user_email),
         access_token = EXCLUDED.access_token,
         refresh_token = EXCLUDED.refresh_token,
         expires_at = EXCLUDED.expires_at,
         updated_at = now()`,
      [String(sid), String(c.portalId), c.portalName || null, c.userEmail || null,
       c.accessToken, c.refreshToken, c.expiresAt || null]
    );
  } catch (e) { console.error('upsertConnection error:', e.message); }
}

// Write refreshed tokens back for the active portal (called after a token refresh).
async function updateConnectionTokens(sid, portalId, t) {
  if (!pool || !sid || !portalId) return;
  try {
    await init();
    await pool.query(
      `UPDATE connections SET access_token = $3, refresh_token = $4, expires_at = $5, updated_at = now()
       WHERE sid = $1 AND portal_id = $2`,
      [String(sid), String(portalId), t.accessToken, t.refreshToken, t.expiresAt || null]
    );
  } catch (e) { console.error('updateConnectionTokens error:', e.message); }
}

async function deleteConnection(sid, portalId) {
  if (!pool || !sid || !portalId) return;
  try {
    await init();
    await pool.query(`DELETE FROM connections WHERE sid = $1 AND portal_id = $2`, [String(sid), String(portalId)]);
  } catch (e) { console.error('deleteConnection error:', e.message); }
}

module.exports = {
  enabled, saveSnapshot, getPreviousSnapshot, getSnapshotHistory, currentPeriod, deletePortal,
  upsertSubscription, getSubscription,
  listConnections, getConnection, countConnections, upsertConnection, updateConnectionTokens, deleteConnection,
};
