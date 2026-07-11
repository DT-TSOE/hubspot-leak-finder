const axios = require('axios');
const BASE_URL = 'https://api.hubapi.com';

// Session-level cache: { [sessionId]: { data, expiresAt } }
const _cache = new Map();
// In-flight loaders keyed by session, so concurrent routes on a cold cache
// share ONE fetch instead of each firing a full paginated load.
const _inflight = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

class HubSpotService {
  constructor(accessToken, sessionId) {
    this.client = axios.create({ baseURL: BASE_URL, headers: { Authorization: `Bearer ${accessToken}` } });
    this.sessionId = sessionId || null;
    // Retry on HubSpot rate limits (429). Respect the Retry-After header when
    // present, otherwise back off exponentially. Prevents the raw
    // "ten_secondly_rolling" / "status code 429" error reaching the UI.
    this.client.interceptors.response.use(null, async (error) => {
      const cfg = error.config;
      if (!cfg || error.response?.status !== 429) return Promise.reject(error);
      cfg._retryCount = (cfg._retryCount || 0) + 1;
      if (cfg._retryCount > 4) return Promise.reject(error);
      const retryAfter = Number(error.response.headers?.['retry-after']);
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : Math.min(1000 * 2 ** (cfg._retryCount - 1), 8000);
      await sleep(waitMs);
      return this.client(cfg);
    });
  }

  async paginate(url, params = {}) {
    const results = [];
    let after;
    while (true) {
      const r = await this.client.get(url, { params: { ...params, limit: 100, ...(after ? { after } : {}) } });
      results.push(...(r.data.results || []));
      const next = r.data.paging?.next?.after;
      if (!next) break;
      after = next;
    }
    return results;
  }

  async getContacts() {
    return this.paginate('/crm/v3/objects/contacts', {
      properties: ['firstname','lastname','email','company','jobtitle','createdate','lifecyclestage',
        'hs_lifecyclestage_lead_date','hs_lifecyclestage_marketingqualifiedlead_date',
        'hs_lifecyclestage_salesqualifiedlead_date','hs_lifecyclestage_opportunity_date',
        'hs_lifecyclestage_customer_date','hs_analytics_source','num_contacted_notes','notes_last_contacted'].join(',')
    });
  }

  async getDeals() {
    return this.paginate('/crm/v3/objects/deals', {
      properties: ['dealstage','closedate','createdate','dealname','amount','hubspot_owner_id','closed_lost_reason'].join(',')
    });
  }

  isDealClosedWon(d) { return (d.properties.dealstage || '') === 'closedwon'; }
  isDealClosed(d) { const s = d.properties.dealstage || ''; return s === 'closedwon' || s === 'closedlost'; }

  // Batch fetch associations for up to 200 deals in 2 API calls instead of 200
  async getDealAssociationsBatch(dealIds) {
    const map = {};
    const chunks = [];
    for (let i = 0; i < dealIds.length; i += 100) chunks.push(dealIds.slice(i, i + 100));
    await Promise.all(chunks.map(async (chunk) => {
      try {
        const r = await this.client.post('/crm/v3/associations/deals/contacts/batch/read', {
          inputs: chunk.map(id => ({ id: String(id) }))
        });
        for (const item of (r.data.results || [])) {
          map[item.from.id] = (item.to || []).map(t => t.id);
        }
      } catch { /* missing associations return empty */ }
    }));
    return map;
  }

  // Legacy single-deal fallback (kept for compatibility)
  async getDealAssociations(dealId) {
    try {
      const r = await this.client.get(`/crm/v3/objects/deals/${dealId}/associations/contacts`);
      return (r.data.results || []).map(r => r.id);
    } catch { return []; }
  }

  // Deal pipeline definitions: stage internal IDs, labels, order, and which
  // stages are "closed won". Needed to compute deal-stage conversion in order.
  async getDealPipelines() {
    try {
      const r = await this.client.get('/crm/v3/pipelines/deals');
      return (r.data.results || []).map(p => ({
        id: p.id,
        label: p.label,
        stages: (p.stages || [])
          .slice()
          .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
          .map(s => ({
            id: s.id,
            label: s.label,
            displayOrder: s.displayOrder ?? 0,
            isClosedWon: s.metadata?.isClosed === 'true' && Number(s.metadata?.probability) === 1,
            isClosed: s.metadata?.isClosed === 'true',
            probability: Number(s.metadata?.probability),
          })),
      }));
    } catch { return []; }
  }

  // Stage history: for each deal, the SET of dealstage values it has ever held
  // (via propertiesWithHistory). This is how we answer "did this deal EVER reach
  // stage X" — including stages it skipped past — the reliable modern approach.
  // Batched 100/call so it stays within rate limits.
  async getDealStageHistory(dealIds) {
    const history = {};
    const chunks = [];
    for (let i = 0; i < dealIds.length; i += 100) chunks.push(dealIds.slice(i, i + 100));
    await Promise.all(chunks.map(async (chunk) => {
      try {
        const r = await this.client.post('/crm/v3/objects/deals/batch/read', {
          propertiesWithHistory: ['dealstage'],
          inputs: chunk.map(id => ({ id: String(id) })),
        });
        for (const d of (r.data.results || [])) {
          const versions = d.propertiesWithHistory?.dealstage || [];
          history[d.id] = [...new Set(versions.map(v => v.value).filter(Boolean))];
        }
      } catch { /* history unavailable for chunk — leave empty */ }
    }));
    return history;
  }

  // Cached data loader — shared across all routes in the same session
  async getCachedData() {
    const key = this.sessionId || 'no-session';
    const cached = _cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    // Coalesce concurrent cold-cache callers (e.g. funnel + insights firing
    // together on page load) onto a single fetch to avoid duplicate paginated
    // loads that trip HubSpot's 100 req/10s limit.
    const existing = _inflight.get(key);
    if (existing) return existing;

    const loader = (async () => {
      const [contacts, deals, pipelines] = await Promise.all([
        this.getContacts(), this.getDeals(), this.getDealPipelines(),
      ]);
      const sampleDeals = deals.slice(0, 200);
      // Stage history over a bounded set of deals (100/call) to keep within rate
      // limits; STAGE_HISTORY_LIMIT deals = STAGE_HISTORY_LIMIT/100 calls.
      const STAGE_HISTORY_LIMIT = 500;
      const historyDeals = deals.slice(0, STAGE_HISTORY_LIMIT);
      const [assocMap, stageHistory] = await Promise.all([
        this.getDealAssociationsBatch(sampleDeals.map(d => d.id)),
        this.getDealStageHistory(historyDeals.map(d => d.id)),
      ]);
      const dealsWithContacts = sampleDeals.map(d => ({ ...d, _contactIds: assocMap[d.id] || [] }));
      // Attach the set of stages each deal ever entered (empty array if unknown).
      const dealsWithHistory = historyDeals.map(d => ({ ...d, _stagesEntered: stageHistory[d.id] || [] }));

      const data = { contacts, deals, dealsWithContacts, pipelines, dealsWithHistory };
      _cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });

      // Prune stale entries
      for (const [k, v] of _cache.entries()) {
        if (v.expiresAt < Date.now()) _cache.delete(k);
      }
      return data;
    })();

    _inflight.set(key, loader);
    try {
      return await loader;
    } finally {
      _inflight.delete(key);
    }
  }

  async getActivitySummary(days = 30) {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const counts = {};
    const types = [
      { key: 'calls', url: '/crm/v3/objects/calls', dateField: 'hs_timestamp' },
      { key: 'emails', url: '/crm/v3/objects/emails', dateField: 'hs_timestamp' },
      { key: 'meetings', url: '/crm/v3/objects/meetings', dateField: 'hs_timestamp' },
    ];
    await Promise.all(types.map(async ({ key, url, dateField }) => {
      try {
        const r = await this.client.post(`${url}/search`, {
          filterGroups: [{ filters: [{ propertyName: dateField, operator: 'GTE', value: since }] }],
          limit: 1, properties: [dateField],
        });
        counts[key] = r.data.total || 0;
      } catch { counts[key] = null; }
    }));
    return counts;
  }

  // Week-over-week activity counts (calls / emails / meetings booked).
  async getActivityComparison() {
    const now = Date.now(), wk = 7 * 86400000;
    const thisStart = new Date(now - wk).toISOString();
    const lastStart = new Date(now - 2 * wk).toISOString();
    const lastEnd = new Date(now - wk).toISOString();
    const types = [
      { key: 'calls', url: '/crm/v3/objects/calls', dateField: 'hs_timestamp' },
      { key: 'emails', url: '/crm/v3/objects/emails', dateField: 'hs_timestamp' },
      { key: 'meetings', url: '/crm/v3/objects/meetings', dateField: 'hs_timestamp' },
    ];
    const result = {};
    await Promise.all(types.map(async ({ key, url, dateField }) => {
      try {
        const [thisWk, lastWk] = await Promise.all([
          this.client.post(`${url}/search`, { filterGroups: [{ filters: [{ propertyName: dateField, operator: 'GTE', value: thisStart }] }], limit: 1, properties: [dateField] }),
          this.client.post(`${url}/search`, { filterGroups: [{ filters: [{ propertyName: dateField, operator: 'GTE', value: lastStart }, { propertyName: dateField, operator: 'LT', value: lastEnd }] }], limit: 1, properties: [dateField] }),
        ]);
        result[key] = { thisWeek: thisWk.data.total || 0, lastWeek: lastWk.data.total || 0 };
      } catch { result[key] = { thisWeek: null, lastWeek: null }; }
    }));
    return result;
  }

  async getOwners() {
    try {
      const r = await this.client.get('/crm/v3/owners', { params: { limit: 100 } });
      return (r.data.results || []).map(o => ({
        id: String(o.id),
        name: [o.firstName, o.lastName].filter(Boolean).join(' ') || o.email || `Owner ${o.id}`,
        email: o.email,
      }));
    } catch { return []; }
  }

  // HubSpot portal (account) id — stable per connected account. Used to key
  // monthly snapshots so they follow the account, not the browser session.
  async getPortalId() {
    try {
      const r = await this.client.get('/account-info/v3/details');
      return r.data?.portalId ? String(r.data.portalId) : null;
    } catch { return null; }
  }

  static invalidateCache(sessionId) {
    if (sessionId) _cache.delete(sessionId);
  }
}

module.exports = HubSpotService;
