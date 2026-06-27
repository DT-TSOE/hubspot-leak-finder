const axios = require('axios');
const BASE_URL = 'https://api.hubapi.com';

// Session-level cache: { [sessionId]: { contacts, deals, dealsWithContacts, expiresAt } }
const _cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

class HubSpotService {
  constructor(accessToken, sessionId) {
    this.client = axios.create({ baseURL: BASE_URL, headers: { Authorization: `Bearer ${accessToken}` } });
    this.sessionId = sessionId || null;
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
      properties: ['firstname','lastname','email','company','createdate','lifecyclestage',
        'hs_lifecyclestage_lead_date','hs_lifecyclestage_marketingqualifiedlead_date',
        'hs_lifecyclestage_salesqualifiedlead_date','hs_lifecyclestage_opportunity_date',
        'hs_lifecyclestage_customer_date','hs_analytics_source','num_contacted_notes','notes_last_contacted'].join(',')
    });
  }

  async getDeals() {
    return this.paginate('/crm/v3/objects/deals', {
      properties: ['dealstage','closedate','createdate','dealname','amount','hubspot_owner_id'].join(',')
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

  // Cached data loader — shared across all routes in the same session
  async getCachedData() {
    const key = this.sessionId || 'no-session';
    const cached = _cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    const [contacts, deals] = await Promise.all([this.getContacts(), this.getDeals()]);
    const sampleDeals = deals.slice(0, 200);
    const assocMap = await this.getDealAssociationsBatch(sampleDeals.map(d => d.id));
    const dealsWithContacts = sampleDeals.map(d => ({ ...d, _contactIds: assocMap[d.id] || [] }));

    const data = { contacts, deals, dealsWithContacts };
    _cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });

    // Prune stale entries
    for (const [k, v] of _cache.entries()) {
      if (v.expiresAt < Date.now()) _cache.delete(k);
    }
    return data;
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

  static invalidateCache(sessionId) {
    if (sessionId) _cache.delete(sessionId);
  }
}

module.exports = HubSpotService;
