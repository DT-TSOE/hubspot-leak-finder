/**
 * Insight Engine v2 — Smarter, more specific insights
 */

const MIN_SAMPLE = 5;

function generateInsights(funnelData, sourceData, activityData, speedData, dateRange) {
  const insights = [];

  // ── 1. FUNNEL LEAK ──
  if (funnelData.lowestConversionStage) {
    const s = funnelData.lowestConversionStage;
    const stages = funnelData.funnelStages;
    const idx = stages.findIndex(f => f.stage === s.stage);
    const prevLabel = idx > 0 ? stages[idx - 1].label : 'Leads';
    const dropPct = s.dropOffRate;

    // More specific: flag if it's dramatically worse than other stages
    const otherRates = stages.slice(1).filter(f => f.stage !== s.stage && f.count + f.dropOff >= MIN_SAMPLE).map(f => f.conversionRate);
    const avgOther = otherRates.length ? otherRates.reduce((a,b) => a+b, 0) / otherRates.length : null;
    const vsAvg = avgOther ? ` — ${Math.round(avgOther - s.conversionRate)} points below your other stage averages` : '';

    insights.push({
      type: 'Funnel Leak',
      priority: 1,
      severity: s.conversionRate < 20 ? 'high' : s.conversionRate < 40 ? 'medium' : 'low',
      title: `Only ${s.conversionRate}% of ${prevLabel} convert to ${s.label}${vsAvg}`,
      dataPoint: `${s.dropOff.toLocaleString()} contacts lost at this stage. ${dropPct}% drop-off rate${dateRange ? ` in the last ${dateRange} days` : ''}.`,
      action: getConversionAction(s.stage),
      metric: { label: 'Conversion Rate', value: `${s.conversionRate}%`, trend: 'down' }
    });
  }

  // ── 2. SPEED TO LEAD ──
  if (speedData.wonMedianHours !== null && speedData.lostMedianHours !== null) {
    const ratio = speedData.lostMedianHours / Math.max(speedData.wonMedianHours, 0.5);
    const formattedWon = formatHours(speedData.wonMedianHours);
    const formattedLost = formatHours(speedData.lostMedianHours);

    if (ratio > 1.5) {
      const benchmark = speedData.wonMedianHours <= 1 ? 'within 1 hour' : speedData.wonMedianHours <= 6 ? 'within 6 hours' : 'same day';
      insights.push({
        type: 'Speed to Lead',
        priority: 2,
        severity: ratio > 4 ? 'high' : 'medium',
        title: `Won leads were contacted ${ratio.toFixed(1)}x faster — ${formattedWon} vs ${formattedLost} for lost`,
        dataPoint: `Fastest-closing leads were reached ${benchmark}. Sample: ${speedData.wonSampleSize + speedData.lostSampleSize} closed contacts.`,
        action: `Set a hard SLA: every new lead gets a response ${benchmark}. Use HubSpot workflows to auto-assign and notify reps the moment a lead is created.`,
        metric: { label: 'Speed Advantage', value: `${ratio.toFixed(1)}x`, trend: 'up' }
      });
    }
  }

  // ── 3. SOURCE PERFORMANCE ──
  if (sourceData && sourceData.length >= 2) {
    const best = sourceData[0];
    const worst = sourceData[sourceData.length - 1];
    const gap = best.winRate - worst.winRate;

    if (gap > 15) {
      insights.push({
        type: 'Source Performance',
        priority: 3,
        severity: gap > 35 ? 'high' : 'medium',
        title: `${best.source} closes at ${best.winRate}% — ${gap.toFixed(0)} points above ${worst.source} (${worst.winRate}%)`,
        dataPoint: `${best.won} closed-won deals from ${best.source} out of ${best.total} contacts. ${worst.source} produced only ${worst.won} wins from ${worst.total}.`,
        action: `Double down on ${best.source} acquisition. Run a 90-day experiment shifting 20% of ${worst.source} budget to ${best.source} and measure impact on pipeline quality.`,
        metric: { label: `${best.source} Win Rate`, value: `${best.winRate}%`, trend: 'up' }
      });
    }
  }

  // ── 4. ENGAGEMENT GAP ──
  if (activityData.wonMedianTouches !== null && activityData.lostMedianTouches !== null) {
    const diff = activityData.wonMedianTouches - activityData.lostMedianTouches;
    if (Math.abs(diff) >= 2) {
      const targetTouches = Math.ceil(activityData.wonMedianTouches);
      insights.push({
        type: 'Engagement Gap',
        priority: 4,
        severity: Math.abs(diff) > 5 ? 'high' : 'medium',
        title: `Closed-won deals averaged ${activityData.wonMedianTouches} touches vs ${activityData.lostMedianTouches} for lost deals`,
        dataPoint: `${diff > 0 ? `Won deals had ${diff.toFixed(1)} more touches on average` : `More touches did not correlate with wins — quality may matter more than quantity`}. Based on ${activityData.wonSampleSize + activityData.lostSampleSize} closed contacts.`,
        action: diff > 0
          ? `Build a ${targetTouches}-touch sequence in HubSpot sequences. Don't mark leads as lost until ${targetTouches} meaningful touchpoints have been logged.`
          : `Review outreach quality — volume alone isn't driving closes. Audit messaging and timing in your current sequences.`,
        metric: { label: 'Touch Difference', value: `+${Math.abs(diff).toFixed(1)}`, trend: 'up' }
      });
    }
  }

  // ── 5. STAGE DELAY ──
  if (funnelData.longestDelayTransition) {
    const t = funnelData.longestDelayTransition;
    if (t.medianDays > 7) {
      const urgency = t.medianDays > 30 ? 'critically slow' : t.medianDays > 14 ? 'slow' : 'worth watching';
      insights.push({
        type: 'Stage Delay',
        priority: 5,
        severity: t.medianDays > 30 ? 'high' : 'medium',
        title: `${t.from} → ${t.to} is ${urgency} at ${t.medianDays} days median`,
        dataPoint: `Mean is ${t.meanDays} days (${t.meanDays > t.medianDays ? 'pulled up by outliers — some deals stall much longer' : 'consistent with median'}). Based on ${t.sampleSize} contacts.`,
        action: `Create a HubSpot workflow: if a contact stays in ${t.from} for more than ${Math.round(t.medianDays * 0.6)} days without activity, trigger an automated task for their rep and send a re-engagement email.`,
        metric: { label: 'Median Days', value: `${t.medianDays}d`, trend: 'down' }
      });
    }
  }

  // ── 6. VOLUME TREND (bonus insight if date range is set) ──
  if (dateRange && funnelData.totalContacts < 20) {
    insights.push({
      type: 'Data Quality',
      priority: 6,
      severity: 'low',
      title: `Only ${funnelData.totalContacts} contacts in this time window — insights may be less reliable`,
      dataPoint: `Insights require at least 5 contacts per stage to be statistically meaningful. Widen your date range for stronger signals.`,
      action: 'Try the "All time" date range or "Last 90 days" to get a larger sample for more reliable insights.',
      metric: { label: 'Sample Size', value: funnelData.totalContacts, trend: 'down' }
    });
  }

  return insights.sort((a, b) => a.priority - b.priority).slice(0, 6);
}

function getConversionAction(stage) {
  const actions = {
    marketingqualifiedlead: 'Audit your MQL definition. Are marketing leads being passed too early? Add behavioral scoring (page views, email opens, form fills) before a contact qualifies as MQL. Check if sales follow-up happens within 24 hours of MQL assignment.',
    salesqualifiedlead: 'Review the MQL→SQL handoff. Are sales reps accepting all MQLs or cherry-picking? Implement a mandatory 5-touch outreach before rejecting an MQL. Check if discovery call booking rates correlate with conversion.',
    opportunity: 'Investigate opportunity creation quality. Are reps creating opportunities too early? Add a required checklist before SQL→Opportunity: confirmed budget, authority, need, and timeline (BANT). Review proposal and demo quality.',
    customer: 'Analyze your close process. Pull win/loss notes from the last 20 closed deals. Look for patterns in why Opportunities go cold — pricing objections, competitor losses, or timing issues are most common.'
  };
  return actions[stage] || 'Review qualification criteria and ensure timely, multi-touch follow-up at this stage.';
}

function formatHours(hours) {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

module.exports = { generateInsights };
