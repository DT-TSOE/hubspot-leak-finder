const axios = require('axios');

const BASE_URL = 'https://api.hubapi.com';

class HubSpotService {
  constructor(accessToken) {
    this.client = axios.create({
      baseURL: BASE_URL,
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  }

  // Paginate through all records
  async paginate(url, params = {}) {
    const results = [];
    let after = undefined;

    while (true) {
      const response = await this.client.get(url, {
        params: { ...params, limit: 100, ...(after ? { after } : {}) }
      });
      results.push(...(response.data.results || []));
      const next = response.data.paging?.next?.after;
      if (!next) break;
      after = next;
    }
    return results;
  }

  // Pull contacts with lifecycle stage history
  async getContacts() {
    return this.paginate('/crm/v3/objects/contacts', {
      properties: [
        'createdate',
        'lifecyclestage',
        'hs_lifecyclestage_lead_date',
        'hs_lifecyclestage_marketingqualifiedlead_date',
        'hs_lifecyclestage_salesqualifiedlead_date',
        'hs_lifecyclestage_opportunity_date',
        'hs_lifecyclestage_customer_date',
        'hs_lifecyclestage_evangelist_date',
        'hs_analytics_source',
        'hs_analytics_source_data_1',
        'num_contacted_notes',
        'notes_last_contacted'
      ].join(',')
    });
  }

  // Pull deals with stage info
  async getDeals() {
    return this.paginate('/crm/v3/objects/deals', {
      properties: [
        'dealstage',
        'closedate',
        'createdate',
        'hs_is_closed_won',
        'hs_is_closed',
        'dealname',
        'amount'
      ].join(',')
    });
  }

  // Get deal associations (contact IDs per deal)
  async getDealAssociations(dealId) {
    try {
      const res = await this.client.get(
        `/crm/v3/objects/deals/${dealId}/associations/contacts`
      );
      return (res.data.results || []).map(r => r.id);
    } catch {
      return [];
    }
  }

  // Get contact activities (calls, emails, meetings)
  async getContactActivities(contactId) {
    try {
      const [calls, emails, meetings] = await Promise.all([
        this.client.get(`/crm/v3/objects/calls`, {
          params: { 
            associations: `contact:${contactId}`,
            properties: 'hs_timestamp',
            limit: 50
          }
        }).catch(() => ({ data: { results: [] } })),
        this.client.get(`/crm/v3/objects/emails`, {
          params: {
            associations: `contact:${contactId}`,
            properties: 'hs_timestamp',
            limit: 50
          }
        }).catch(() => ({ data: { results: [] } })),
        this.client.get(`/crm/v3/objects/meetings`, {
          params: {
            associations: `contact:${contactId}`,
            properties: 'hs_timestamp',
            limit: 50
          }
        }).catch(() => ({ data: { results: [] } }))
      ]);

      return {
        calls: calls.data.results?.length || 0,
        emails: emails.data.results?.length || 0,
        meetings: meetings.data.results?.length || 0
      };
    } catch {
      return { calls: 0, emails: 0, meetings: 0 };
    }
  }

  // Get page view events for contacts
  async getPageViews(contactId) {
    try {
      const res = await this.client.get(
        `/events/v3/events`,
        { params: { objectType: 'contact', objectId: contactId, eventType: 'hs_pageview', limit: 50 } }
      );
      return (res.data.results || []).map(e => e.properties?.hs_url || '');
    } catch {
      return [];
    }
  }

  // Get portal info (for portal ID)
  async getPortalInfo() {
    try {
      const res = await this.client.get('/account-info/v3/details');
      return res.data;
    } catch {
      return null;
    }
  }
}

module.exports = HubSpotService;
