const axios = require('axios');
const BASE_URL = 'https://api.hubapi.com';

class HubSpotService {
  constructor(accessToken) {
    this.client = axios.create({ baseURL: BASE_URL, headers: { Authorization: `Bearer ${accessToken}` } });
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

  async getDealAssociations(dealId) {
    try {
      const r = await this.client.get(`/crm/v3/objects/deals/${dealId}/associations/contacts`);
      return (r.data.results || []).map(r => r.id);
    } catch { return []; }
  }

  async getBatchDealAssociations(dealIds) {
    const map = {};
    for (let i = 0; i < dealIds.length; i += 100) {
      const batch = dealIds.slice(i, i + 100);
      try {
        const r = await this.client.post('/crm/v3/associations/deals/contacts/batch/read', {
          inputs: batch.map(id => ({ id }))
        });
        for (const result of (r.data.results || [])) {
          map[result.from.id] = (result.to || []).map(t => t.id);
        }
      } catch { /* leave missing ones as empty */ }
    }
    return map;
  }
}

module.exports = HubSpotService;
