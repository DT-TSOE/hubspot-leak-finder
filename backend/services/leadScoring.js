/**
 * Lead Risk Scoring Service
 * Scores active (non-customer) contacts on conversion risk.
 * Returns a score 0-100 where higher = more at risk of going cold.
 */

const RISK_WEIGHTS = {
  noContactIn7Days: 25,
  noContactIn3Days: 10,
  zeroTouches: 30,
  lowTouches: 15,
  stuckInStageOver30Days: 20,
  stuckInStageOver14Days: 10,
  unknownSource: 5,
};

const LIFECYCLE_ORDER = ['lead', 'marketingqualifiedlead', 'salesqualifiedlead', 'opportunity'];

function scoreLeads(contacts) {
  const now = Date.now();
  const scored = [];

  for (const contact of contacts) {
    const props = contact.properties;

    // Only score active (non-customer) contacts
    const stage = props.lifecyclestage;
    if (!stage || stage === 'customer' || stage === 'evangelist') continue;
    if (!LIFECYCLE_ORDER.includes(stage)) continue;

    let score = 0;
    const flags = [];

    // --- Last contacted ---
    const lastContacted = props.notes_last_contacted
      ? new Date(props.notes_last_contacted).getTime()
      : null;
    const daysSinceContact = lastContacted
      ? Math.floor((now - lastContacted) / (1000 * 60 * 60 * 24))
      : null;

    if (daysSinceContact === null || daysSinceContact > 7) {
      score += RISK_WEIGHTS.noContactIn7Days;
      flags.push(daysSinceContact === null ? 'Never contacted' : `No contact in ${daysSinceContact} days`);
    } else if (daysSinceContact > 3) {
      score += RISK_WEIGHTS.noContactIn3Days;
      flags.push(`No contact in ${daysSinceContact} days`);
    }

    // --- Touch count ---
    const touches = parseInt(props.num_contacted_notes || '0', 10);
    if (touches === 0) {
      score += RISK_WEIGHTS.zeroTouches;
      flags.push('No touches recorded');
    } else if (touches < 3) {
      score += RISK_WEIGHTS.lowTouches;
      flags.push(`Only ${touches} touch${touches === 1 ? '' : 'es'}`);
    }

    // --- Time stuck in current stage ---
    const stageDateProp = getStageDateProp(stage);
    const stageEnteredDate = props[stageDateProp]
      ? new Date(props[stageDateProp]).getTime()
      : new Date(props.createdate).getTime();
    const daysInStage = Math.floor((now - stageEnteredDate) / (1000 * 60 * 60 * 24));

    if (daysInStage > 30) {
      score += RISK_WEIGHTS.stuckInStageOver30Days;
      flags.push(`Stuck in ${formatStage(stage)} for ${daysInStage} days`);
    } else if (daysInStage > 14) {
      score += RISK_WEIGHTS.stuckInStageOver14Days;
      flags.push(`In ${formatStage(stage)} for ${daysInStage} days`);
    }

    // --- Unknown source ---
    if (!props.hs_analytics_source || props.hs_analytics_source === 'OFFLINE') {
      score += RISK_WEIGHTS.unknownSource;
    }

    // Cap at 100
    score = Math.min(score, 100);

    scored.push({
      id: contact.id,
      name: [props.firstname, props.lastname].filter(Boolean).join(' ') || 'Unknown',
      email: props.email || '',
      stage: formatStage(stage),
      stageRaw: stage,
      score,
      risk: score >= 60 ? 'high' : score >= 35 ? 'medium' : 'low',
      flags,
      daysInStage,
      touches,
      daysSinceContact,
      source: props.hs_analytics_source || 'Unknown',
    });
  }

  // Sort by risk score descending
  return scored.sort((a, b) => b.score - a.score);
}

function getStageDateProp(stage) {
  const map = {
    lead: 'hs_lifecyclestage_lead_date',
    marketingqualifiedlead: 'hs_lifecyclestage_marketingqualifiedlead_date',
    salesqualifiedlead: 'hs_lifecyclestage_salesqualifiedlead_date',
    opportunity: 'hs_lifecyclestage_opportunity_date',
  };
  return map[stage] || 'createdate';
}

function formatStage(stage) {
  const map = {
    lead: 'Lead',
    marketingqualifiedlead: 'MQL',
    salesqualifiedlead: 'SQL',
    opportunity: 'Opportunity',
  };
  return map[stage] || stage;
}

module.exports = { scoreLeads };
