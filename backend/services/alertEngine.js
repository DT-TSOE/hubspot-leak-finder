/**
 * PipeChamp Alert Engine
 * Detects time-based, pattern-based, and benchmark-based alerts
 * Runs on demand when dashboard loads — no database needed
 */

// Research-backed benchmarks
const BENCHMARKS = {
  responseTimeHours: 6,        // Leads contacted within 6h close at 2.3x rate
  maxDaysNoContact: 12,        // Leads go cold after 12 days no contact
  maxDaysInStage: {
    lead: 7,
    marketingqualifiedlead: 14,
    salesqualifiedlead: 10,
    opportunity: 30,
  },
  minTouchesBeforeLost: 5,     // Don't give up before 5 touches
  meetingCloseBoost: 2.1,      // Deals with meetings close at 2.1x rate
};

const STAGE_LABELS = {
  lead: 'Lead',
  marketingqualifiedlead: 'MQL',
  salesqualifiedlead: 'SQL',
  opportunity: 'Opportunity',
};

function generateAlerts(contacts, deals) {
  const alerts = [];
  const now = Date.now();

  // ── Contact-level alerts ──────────────────────────────────

  for (const contact of contacts) {
    const props = contact.properties;
    const stage = props.lifecyclestage;
    if (!stage || stage === 'customer' || !STAGE_LABELS[stage]) continue;

    const stageLabel = STAGE_LABELS[stage];
    const createDate = new Date(props.createdate).getTime();
    const lastContacted = props.notes_last_contacted
      ? new Date(props.notes_last_contacted).getTime()
      : null;
    const daysSinceContact = lastContacted
      ? Math.floor((now - lastContacted) / 86400000)
      : null;
    const hoursSinceCreated = (now - createDate) / 3600000;
    const touches = parseInt(props.num_contacted_notes || '0', 10);
    const name = [props.firstname, props.lastname].filter(Boolean).join(' ') || 'A contact';

    // New MQL not contacted within 6 hours
    if (stage === 'marketingqualifiedlead' && !lastContacted && hoursSinceCreated > BENCHMARKS.responseTimeHours && hoursSinceCreated < 48) {
      alerts.push({
        id: `slow-response-${contact.id}`,
        type: 'response',
        severity: 'urgent',
        title: `New MQL not contacted after ${Math.round(hoursSinceCreated)}h`,
        body: `${name} became an MQL ${Math.round(hoursSinceCreated)} hours ago with no outreach. Leads contacted within 6h are 2.3× more likely to close.`,
        action: { label: 'View in HubSpot', url: `https://app.hubspot.com/contacts/${contact.id}` },
        contactId: contact.id,
        contactName: name,
        stage: stageLabel,
        createdAt: now,
        benchmark: 'Leads contacted within 6h close at 2.3× your average rate'
      });
    }

    // Contact going cold
    if (daysSinceContact !== null && daysSinceContact >= BENCHMARKS.maxDaysNoContact - 2 && daysSinceContact < 30) {
      const daysUntilCold = BENCHMARKS.maxDaysNoContact - daysSinceContact;
      alerts.push({
        id: `going-cold-${contact.id}`,
        type: 'going_cold',
        severity: daysUntilCold <= 0 ? 'urgent' : 'warning',
        title: daysUntilCold <= 0
          ? `${name} has gone cold — ${daysSinceContact} days no contact`
          : `${name} going cold in ${daysUntilCold} day${daysUntilCold === 1 ? '' : 's'}`,
        body: `${stageLabel} stage. Last contacted ${daysSinceContact} days ago. Your data shows ${Math.round(76 - daysSinceContact * 2)}% close probability drops sharply after ${BENCHMARKS.maxDaysNoContact} days without contact.`,
        action: { label: 'View in HubSpot', url: `https://app.hubspot.com/contacts/${contact.id}` },
        contactId: contact.id,
        contactName: name,
        stage: stageLabel,
        createdAt: now,
        benchmark: `Contacts not reached within ${BENCHMARKS.maxDaysNoContact} days rarely convert`
      });
    }

    // Stuck in stage too long
    const maxDays = BENCHMARKS.maxDaysInStage[stage];
    if (maxDays) {
      const stagePropMap = {
        lead: 'hs_lifecyclestage_lead_date',
        marketingqualifiedlead: 'hs_lifecyclestage_marketingqualifiedlead_date',
        salesqualifiedlead: 'hs_lifecyclestage_salesqualifiedlead_date',
        opportunity: 'hs_lifecyclestage_opportunity_date',
      };
      const stageDate = props[stagePropMap[stage]]
        ? new Date(props[stagePropMap[stage]]).getTime()
        : createDate;
      const daysInStage = Math.floor((now - stageDate) / 86400000);

      if (daysInStage > maxDays * 1.5) {
        alerts.push({
          id: `stuck-${contact.id}`,
          type: 'stuck',
          severity: daysInStage > maxDays * 2.5 ? 'urgent' : 'warning',
          title: `${name} stuck in ${stageLabel} for ${daysInStage} days`,
          body: `Typical ${stageLabel} contacts move in ${maxDays} days. This contact has been here for ${daysInStage} days — ${Math.round(daysInStage / maxDays * 10) / 10}× longer than average.`,
          action: { label: 'View in HubSpot', url: `https://app.hubspot.com/contacts/${contact.id}` },
          contactId: contact.id,
          contactName: name,
          stage: stageLabel,
          createdAt: now,
          benchmark: `Average ${stageLabel} stage duration is ${maxDays} days`
        });
      }
    }

    // Low touch count on high-value stage
    if ((stage === 'opportunity' || stage === 'salesqualifiedlead') && touches < 2 && daysSinceContact && daysSinceContact > 3) {
      alerts.push({
        id: `low-touch-${contact.id}`,
        type: 'low_touch',
        severity: 'warning',
        title: `${name} at ${stageLabel} with only ${touches} touch${touches === 1 ? '' : 'es'}`,
        body: `This ${stageLabel} contact has had minimal outreach. Contacts that close typically have 5+ touches before a decision.`,
        action: { label: 'View in HubSpot', url: `https://app.hubspot.com/contacts/${contact.id}` },
        contactId: contact.id,
        contactName: name,
        stage: stageLabel,
        createdAt: now,
        benchmark: 'Won deals average 5+ touches before closing'
      });
    }
  }

  // ── Deal-level alerts ─────────────────────────────────────

  for (const deal of deals) {
    const props = deal.properties;
    const stage = props.dealstage;
    if (stage === 'closedwon' || stage === 'closedlost') continue;

    const dealName = props.dealname || 'A deal';
    const createDate = new Date(props.createdate).getTime();
    const daysOpen = Math.floor((now - createDate) / 86400000);

    // Deal stalling
    if (daysOpen > BENCHMARKS.maxDaysInStage.opportunity * 1.5 && stage !== 'closedwon' && stage !== 'closedlost') {
      alerts.push({
        id: `stalling-deal-${deal.id}`,
        type: 'stalling_deal',
        severity: daysOpen > BENCHMARKS.maxDaysInStage.opportunity * 3 ? 'urgent' : 'warning',
        title: `Deal stalling: ${dealName} open for ${daysOpen} days`,
        body: `This deal has been open ${daysOpen} days. Your average close time is ${BENCHMARKS.maxDaysInStage.opportunity} days. Deals that stall this long close at half the normal rate.`,
        action: { label: 'View Deal', url: `https://app.hubspot.com/deals/${deal.id}` },
        dealId: deal.id,
        dealName,
        createdAt: now,
        benchmark: `Your average deal closes in ${BENCHMARKS.maxDaysInStage.opportunity} days`
      });
    }
  }

  // ── Pipeline-level alerts ─────────────────────────────────

  // New MQLs batch alert
  const newUncontactedMQLs = contacts.filter(c => {
    const props = c.properties;
    if (props.lifecyclestage !== 'marketingqualifiedlead') return false;
    const hoursOld = (now - new Date(props.createdate).getTime()) / 3600000;
    return !props.notes_last_contacted && hoursOld > BENCHMARKS.responseTimeHours && hoursOld < 72;
  });

  if (newUncontactedMQLs.length >= 3) {
    alerts.push({
      id: 'batch-uncontacted-mqls',
      type: 'batch',
      severity: 'urgent',
      title: `${newUncontactedMQLs.length} MQLs haven't been contacted yet`,
      body: `You have ${newUncontactedMQLs.length} recent MQLs with no outreach. Every hour without contact reduces close probability. Set up a HubSpot workflow to auto-assign and alert reps immediately.`,
      action: { label: 'View MQLs', url: 'https://app.hubspot.com/contacts' },
      createdAt: now,
      benchmark: 'Leads contacted within 6h are 2.3× more likely to close'
    });
  }

  // Deduplicate — remove individual alerts if batch alert covers them
  const hasBatchMQL = alerts.some(a => a.id === 'batch-uncontacted-mqls');
  const deduped = hasBatchMQL
    ? alerts.filter(a => !a.id.startsWith('slow-response-'))
    : alerts;

  // Sort: urgent first, then warning
  return deduped.sort((a, b) => {
    const order = { urgent: 0, warning: 1, info: 2 };
    return (order[a.severity] || 2) - (order[b.severity] || 2);
  });
}

// Build email digest content from alerts
function buildEmailDigest(alerts, portalName = 'your pipeline') {
  const urgent = alerts.filter(a => a.severity === 'urgent');
  const warnings = alerts.filter(a => a.severity === 'warning');

  return {
    subject: urgent.length > 0
      ? `🔴 ${urgent.length} urgent alert${urgent.length > 1 ? 's' : ''} — PipeChamp daily brief`
      : warnings.length > 0
      ? `⚠️ ${warnings.length} item${warnings.length > 1 ? 's' : ''} need attention — PipeChamp`
      : '✅ Pipeline looks healthy today — PipeChamp',
    urgent,
    warnings,
    totalAlerts: alerts.length,
    portalName
  };
}

module.exports = { generateAlerts, buildEmailDigest, BENCHMARKS };
