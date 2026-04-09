/**
 * Activity Analysis Service
 * Fetches calls, emails, meetings, notes, and deal loss reasons
 * to give La Jefa full context on what's happening in the pipeline
 */

const axios = require('axios');

class ActivityAnalyzer {
  constructor(accessToken) {
    this.client = axios.create({
      baseURL: 'https://api.hubapi.com',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  }

  // Fetch activities for a list of deal IDs (sample to avoid rate limits)
  async getActivitiesForDeals(dealIds, limit = 50) {
    const sample = dealIds.slice(0, limit);
    const results = { calls: [], emails: [], meetings: [], notes: [] };

    await Promise.all(sample.map(async (dealId) => {
      try {
        const [calls, emails, meetings, notes] = await Promise.all([
          this.getAssociated('deals', dealId, 'calls', 'hs_call_status,hs_call_duration,hs_call_direction,hs_call_body').catch(() => []),
          this.getAssociated('deals', dealId, 'emails', 'hs_email_subject,hs_email_status,hs_email_direction,hs_email_opens_count,hs_email_clicked').catch(() => []),
          this.getAssociated('deals', dealId, 'meetings', 'hs_meeting_outcome,hs_meeting_title,hs_meeting_start_time').catch(() => []),
          this.getAssociated('deals', dealId, 'notes', 'hs_note_body,hs_timestamp').catch(() => []),
        ]);
        results.calls.push(...calls.map(c => ({ ...c, _dealId: dealId })));
        results.emails.push(...emails.map(e => ({ ...e, _dealId: dealId })));
        results.meetings.push(...meetings.map(m => ({ ...m, _dealId: dealId })));
        results.notes.push(...notes.map(n => ({ ...n, _dealId: dealId })));
      } catch {}
    }));

    return results;
  }

  async getAssociated(fromObject, fromId, toObject, properties) {
    try {
      // Get association IDs
      const assocRes = await this.client.get(`/crm/v3/objects/${fromObject}/${fromId}/associations/${toObject}`);
      const ids = (assocRes.data.results || []).map(r => r.id).slice(0, 20);
      if (!ids.length) return [];

      // Batch fetch the objects
      const res = await this.client.post(`/crm/v3/objects/${toObject}/batch/read`, {
        inputs: ids.map(id => ({ id })),
        properties: properties.split(',')
      });
      return res.data.results || [];
    } catch { return []; }
  }

  // Analyze activities for won vs lost deals
  analyzeActivities(wonDealIds, lostDealIds, activities) {
    const wonSet = new Set(wonDealIds);
    const lostSet = new Set(lostDealIds);

    const wonStats = { calls: 0, emails: 0, meetings: 0, notes: 0, callDuration: [], emailOpens: 0, meetingsCompleted: 0 };
    const lostStats = { calls: 0, emails: 0, meetings: 0, notes: 0, callDuration: [], emailOpens: 0, meetingsCompleted: 0 };

    for (const call of activities.calls) {
      const stats = wonSet.has(call._dealId) ? wonStats : lostSet.has(call._dealId) ? lostStats : null;
      if (!stats) continue;
      stats.calls++;
      const dur = parseInt(call.properties?.hs_call_duration || '0');
      if (dur > 0) stats.callDuration.push(dur / 1000 / 60); // convert to minutes
    }

    for (const email of activities.emails) {
      const stats = wonSet.has(email._dealId) ? wonStats : lostSet.has(email._dealId) ? lostStats : null;
      if (!stats) continue;
      stats.emails++;
      stats.emailOpens += parseInt(email.properties?.hs_email_opens_count || '0');
    }

    for (const meeting of activities.meetings) {
      const stats = wonSet.has(meeting._dealId) ? wonStats : lostSet.has(meeting._dealId) ? lostStats : null;
      if (!stats) continue;
      stats.meetings++;
      if (meeting.properties?.hs_meeting_outcome === 'COMPLETED') stats.meetingsCompleted++;
    }

    for (const note of activities.notes) {
      const stats = wonSet.has(note._dealId) ? wonStats : lostSet.has(note._dealId) ? lostStats : null;
      if (!stats) continue;
      stats.notes++;
    }

    const median = arr => { if (!arr.length) return 0; const s = [...arr].sort((a,b)=>a-b); return Math.round(s[Math.floor(s.length/2)]); };

    return {
      won: {
        avgCalls: wonDealIds.length ? Math.round(wonStats.calls / wonDealIds.length * 10) / 10 : 0,
        avgEmails: wonDealIds.length ? Math.round(wonStats.emails / wonDealIds.length * 10) / 10 : 0,
        avgMeetings: wonDealIds.length ? Math.round(wonStats.meetings / wonDealIds.length * 10) / 10 : 0,
        avgCallDuration: median(wonStats.callDuration),
        emailOpenRate: wonStats.emails > 0 ? Math.round((wonStats.emailOpens / wonStats.emails) * 100) : 0,
        meetingCompletionRate: wonStats.meetings > 0 ? Math.round((wonStats.meetingsCompleted / wonStats.meetings) * 100) : 0,
        sampleSize: wonDealIds.length
      },
      lost: {
        avgCalls: lostDealIds.length ? Math.round(lostStats.calls / lostDealIds.length * 10) / 10 : 0,
        avgEmails: lostDealIds.length ? Math.round(lostStats.emails / lostDealIds.length * 10) / 10 : 0,
        avgMeetings: lostDealIds.length ? Math.round(lostStats.meetings / lostDealIds.length * 10) / 10 : 0,
        avgCallDuration: median(lostStats.callDuration),
        emailOpenRate: lostStats.emails > 0 ? Math.round((lostStats.emailOpens / lostStats.emails) * 100) : 0,
        meetingCompletionRate: lostStats.meetings > 0 ? Math.round((lostStats.meetingsCompleted / lostStats.meetings) * 100) : 0,
        sampleSize: lostDealIds.length
      }
    };
  }

  // Get deal loss reasons
  analyzeLossReasons(deals) {
    const lostDeals = deals.filter(d => d.properties.dealstage === 'closedlost');
    const reasons = {};

    for (const deal of lostDeals) {
      const reason = deal.properties.closed_lost_reason || deal.properties.hs_closed_lost_reason || 'Not specified';
      reasons[reason] = (reasons[reason] || 0) + 1;
    }

    return Object.entries(reasons)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, count, pct: Math.round((count / lostDeals.length) * 100) }));
  }

  // Get recent notes content for pattern analysis
  getNotesContent(activities, limit = 20) {
    return activities.notes
      .slice(0, limit)
      .map(n => n.properties?.hs_note_body || '')
      .filter(Boolean)
      .map(note => note.substring(0, 200)); // truncate for context window
  }
}

module.exports = ActivityAnalyzer;
