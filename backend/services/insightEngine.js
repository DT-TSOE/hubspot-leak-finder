const MIN_SAMPLE = 3;

function generateInsights(funnelData, sourceData, activityData, speedData, dateRange) {
  const insights = [];

  if (funnelData.lowestConversionStage) {
    const s = funnelData.lowestConversionStage;
    const stages = funnelData.funnelStages;
    const idx = stages.findIndex(f => f.stage === s.stage);
    const prevLabel = idx > 0 ? stages[idx-1].label : 'Leads';
    insights.push({
      type:'Funnel Leak', priority:1, severity: s.conversionRate < 25 ? 'high' : 'medium',
      title:`Only ${s.conversionRate}% of ${prevLabel} convert to ${s.label}`,
      dataPoint:`${s.dropOff.toLocaleString()} contacts lost at this stage.`,
      action: getConversionAction(s.stage),
      metric:{ label:'Conversion Rate', value:`${s.conversionRate}%` }
    });
  }

  if (speedData.wonMedianHours !== null && speedData.lostMedianHours !== null) {
    const ratio = speedData.lostMedianHours / Math.max(speedData.wonMedianHours, 0.5);
    if (ratio > 1.5) {
      insights.push({
        type:'Speed to Lead', priority:2, severity: ratio > 4 ? 'high' : 'medium',
        title:`Won leads contacted ${ratio.toFixed(1)}× faster — ${formatH(speedData.wonMedianHours)} vs ${formatH(speedData.lostMedianHours)}`,
        dataPoint:`Based on ${speedData.wonSampleSize + speedData.lostSampleSize} closed contacts.`,
        action:`Set a follow-up SLA of 6 hours for all new leads. Use HubSpot workflows to auto-notify reps immediately when a lead is created.`,
        metric:{ label:'Speed Advantage', value:`${ratio.toFixed(1)}×` }
      });
    }
  }

  if (sourceData && sourceData.length >= 2) {
    const best = sourceData[0], worst = sourceData[sourceData.length-1];
    const gap = best.winRate - worst.winRate;
    if (gap > 10) {
      insights.push({
        type:'Source Performance', priority:3, severity: gap > 30 ? 'high' : 'medium',
        title:`${best.source} closes at ${best.winRate}% vs ${worst.winRate}% for ${worst.source}`,
        dataPoint:`${best.won} closed-won from ${best.source} (${best.total} contacts).`,
        action:`Focus acquisition on ${best.source}. Audit why ${worst.source} leads underperform and adjust qualification criteria for that channel.`,
        metric:{ label:`${best.source} Win Rate`, value:`${best.winRate}%` }
      });
    }
  }

  if (activityData.wonMedianTouches !== null && activityData.lostMedianTouches !== null) {
    const diff = activityData.wonMedianTouches - activityData.lostMedianTouches;
    if (Math.abs(diff) >= 1) {
      insights.push({
        type:'Engagement Gap', priority:4, severity: Math.abs(diff) > 4 ? 'high' : 'medium',
        title:`Won deals had ${activityData.wonMedianTouches} median touches vs ${activityData.lostMedianTouches} for lost`,
        dataPoint:`Based on ${activityData.wonSampleSize + activityData.lostSampleSize} closed contacts.`,
        action: diff > 0 ? `Build a ${Math.ceil(activityData.wonMedianTouches)}-touch sequence. Don't mark leads as lost until you've hit that number.` : `More touches aren't driving closes. Review your outreach quality and timing.`,
        metric:{ label:'Touch Difference', value:`+${Math.abs(diff).toFixed(1)}` }
      });
    }
  }

  if (funnelData.longestDelayTransition && funnelData.longestDelayTransition.medianDays > 7) {
    const t = funnelData.longestDelayTransition;
    insights.push({
      type:'Stage Delay', priority:5, severity: t.medianDays > 30 ? 'high' : 'medium',
      title:`${t.from} → ${t.to} takes ${t.medianDays} days median — your slowest transition`,
      dataPoint:`Based on ${t.sampleSize} contacts. Mean is ${t.meanDays} days.`,
      action:`Create a HubSpot workflow: if a contact stays in ${t.from} for more than ${Math.round(t.medianDays*0.6)} days without activity, trigger an automated follow-up task.`,
      metric:{ label:'Median Days', value:`${t.medianDays}d` }
    });
  }

  return insights.sort((a,b) => a.priority - b.priority).slice(0,5);
}

function getConversionAction(stage) {
  const m = {
    marketingqualifiedlead:'Review your MQL definition. Ensure leads show real intent before qualifying. Add lead scoring based on page views and email engagement.',
    salesqualifiedlead:'Check your MQL→SQL handoff. Are reps following up quickly? Implement a mandatory outreach cadence before rejecting an MQL.',
    opportunity:'Review discovery quality. Add a required checklist before creating an opportunity — confirmed budget, authority, need, and timeline.',
    customer:'Analyse your close process. Review your last 10 lost opportunities for patterns in objections, pricing, or competitor losses.'
  };
  return m[stage] || 'Review qualification criteria and ensure timely follow-up at this stage.';
}

function formatH(h) {
  if (h < 1) return `${Math.round(h*60)}m`;
  if (h < 24) return `${Math.round(h)}h`;
  return `${Math.round(h/24)}d`;
}

module.exports = { generateInsights };
