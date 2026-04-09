const LIFECYCLE_STAGES = ['lead','marketingqualifiedlead','salesqualifiedlead','opportunity','customer'];
const STAGE_LABELS = { lead:'Lead', marketingqualifiedlead:'MQL', salesqualifiedlead:'SQL', opportunity:'Opportunity', customer:'Customer' };
const STAGE_DATE_PROPS = {
  lead:'hs_lifecyclestage_lead_date', marketingqualifiedlead:'hs_lifecyclestage_marketingqualifiedlead_date',
  salesqualifiedlead:'hs_lifecyclestage_salesqualifiedlead_date', opportunity:'hs_lifecyclestage_opportunity_date',
  customer:'hs_lifecyclestage_customer_date'
};

function getHighestStage(contact) {
  const props = contact.properties;
  for (let i = LIFECYCLE_STAGES.length - 1; i >= 0; i--) {
    const s = LIFECYCLE_STAGES[i];
    if (props[STAGE_DATE_PROPS[s]] || props.lifecyclestage === s) return s;
  }
  return 'lead';
}

function median(arr) {
  if (!arr.length) return null;
  const s = [...arr].sort((a,b) => a-b);
  const m = Math.floor(s.length/2);
  return s.length % 2 !== 0 ? s[m] : (s[m-1]+s[m])/2;
}

function msTodays(ms) { return Math.round(ms / 86400000); }

function analyzeFunnel(contacts) {
  const MIN = 3;
  const stageCounts = {};
  LIFECYCLE_STAGES.forEach(s => stageCounts[s] = 0);

  for (const c of contacts) {
    const highest = getHighestStage(c);
    const idx = LIFECYCLE_STAGES.indexOf(highest);
    for (let i = 0; i <= idx; i++) stageCounts[LIFECYCLE_STAGES[i]]++;
  }

  const funnelStages = LIFECYCLE_STAGES.map((stage, i) => {
    const count = stageCounts[stage];
    const prevCount = i === 0 ? count : stageCounts[LIFECYCLE_STAGES[i-1]];
    const conversionRate = prevCount > 0 ? Math.round((count/prevCount)*1000)/10 : 0;
    const dropOff = Math.max(0, prevCount - count);
    return {
      stage, label: STAGE_LABELS[stage], count,
      conversionRate: i === 0 ? 100 : conversionRate,
      dropOff: i === 0 ? 0 : dropOff,
      dropOffRate: i === 0 ? 0 : Math.round((1 - count/Math.max(prevCount,1))*1000)/10
    };
  });

  const stageTimes = {};
  for (let i = 1; i < LIFECYCLE_STAGES.length; i++) {
    const from = LIFECYCLE_STAGES[i-1], to = LIFECYCLE_STAGES[i];
    const times = [];
    for (const c of contacts) {
      const fd = c.properties[STAGE_DATE_PROPS[from]];
      const td = c.properties[STAGE_DATE_PROPS[to]];
      if (fd && td) {
        const diff = new Date(td) - new Date(fd);
        if (diff > 0) times.push(diff);
      }
    }
    if (times.length >= MIN) {
      const med = median(times);
      const mean = times.reduce((a,b) => a+b,0)/times.length;
      stageTimes[`${from}_to_${to}`] = { from: STAGE_LABELS[from], to: STAGE_LABELS[to], medianDays: msTodays(med), meanDays: msTodays(mean), sampleSize: times.length };
    }
  }

  let lowestConversionStage = null, highestDropOffStage = null, longestDelayTransition = null;
  let lowestRate = 101, highestDrop = -1, longestDelay = -1;

  for (const s of funnelStages.slice(1)) {
    if (s.conversionRate < lowestRate && s.count + s.dropOff >= MIN) { lowestRate = s.conversionRate; lowestConversionStage = s; }
    if (s.dropOff > highestDrop) { highestDrop = s.dropOff; highestDropOffStage = s; }
  }
  for (const val of Object.values(stageTimes)) {
    if (val.medianDays > longestDelay) { longestDelay = val.medianDays; longestDelayTransition = val; }
  }

  const biggestLeak = lowestConversionStage ? {
    stage: lowestConversionStage, reason: 'lowest_conversion',
    description: `Only ${lowestConversionStage.conversionRate}% of ${funnelStages[LIFECYCLE_STAGES.indexOf(lowestConversionStage.stage)-1]?.label || 'leads'} convert to ${lowestConversionStage.label}`
  } : null;

  return { totalContacts: contacts.length, funnelStages, stageTimes, biggestLeak, lowestConversionStage, highestDropOffStage, longestDelayTransition, meta: { generatedAt: new Date().toISOString() } };
}

module.exports = { analyzeFunnel, LIFECYCLE_STAGES, STAGE_LABELS };
