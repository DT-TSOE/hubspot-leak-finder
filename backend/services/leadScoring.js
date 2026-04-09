const LIFECYCLE_ORDER = ['lead','marketingqualifiedlead','salesqualifiedlead','opportunity'];

function scoreLeads(contacts) {
  const now = Date.now();
  const scored = [];

  for (const contact of contacts) {
    const props = contact.properties;
    const stage = props.lifecyclestage;
    if (!stage || stage === 'customer' || !LIFECYCLE_ORDER.includes(stage)) continue;

    let score = 0;
    const flags = [];

    const lastContacted = props.notes_last_contacted ? new Date(props.notes_last_contacted).getTime() : null;
    const daysSince = lastContacted ? Math.floor((now - lastContacted) / 86400000) : null;

    if (daysSince === null || daysSince > 7) {
      score += 25; flags.push(daysSince === null ? 'Never contacted' : `No contact in ${daysSince} days`);
    } else if (daysSince > 3) { score += 10; flags.push(`No contact in ${daysSince} days`); }

    const touches = parseInt(props.num_contacted_notes || '0', 10);
    if (touches === 0) { score += 30; flags.push('No touches recorded'); }
    else if (touches < 3) { score += 15; flags.push(`Only ${touches} touch${touches===1?'':'es'}`); }

    const stagePropMap = { lead:'hs_lifecyclestage_lead_date', marketingqualifiedlead:'hs_lifecyclestage_marketingqualifiedlead_date', salesqualifiedlead:'hs_lifecyclestage_salesqualifiedlead_date', opportunity:'hs_lifecyclestage_opportunity_date' };
    const stageDate = props[stagePropMap[stage]] ? new Date(props[stagePropMap[stage]]).getTime() : new Date(props.createdate).getTime();
    const daysInStage = Math.floor((now - stageDate) / 86400000);

    if (daysInStage > 30) { score += 20; flags.push(`Stuck in ${formatStage(stage)} for ${daysInStage} days`); }
    else if (daysInStage > 14) { score += 10; flags.push(`In ${formatStage(stage)} for ${daysInStage} days`); }

    if (!props.hs_analytics_source) score += 5;

    score = Math.min(score, 100);
    const name = [props.firstname, props.lastname].filter(Boolean).join(' ') || 'Unknown';

    scored.push({
      id: contact.id, name, email: props.email || '',
      stage: formatStage(stage), stageRaw: stage, score,
      risk: score >= 60 ? 'high' : score >= 35 ? 'medium' : 'low',
      flags, daysInStage, touches, daysSinceContact: daysSince,
      source: props.hs_analytics_source || 'Unknown',
    });
  }

  return scored.sort((a,b) => b.score - a.score);
}

function formatStage(s) {
  const m = { lead:'Lead', marketingqualifiedlead:'MQL', salesqualifiedlead:'SQL', opportunity:'Opportunity' };
  return m[s] || s;
}

module.exports = { scoreLeads };
