function buildContext(funnelData, insightsData, leadsData, activityData) {
  const funnel = funnelData?.funnel;
  const behavioral = funnelData?.behavioral;
  const summary = funnelData?.summary;
  let ctx = `PIPECHAMP PIPELINE ANALYSIS\n${'='.repeat(40)}\n\n`;

  if (funnel?.funnelStages) {
    ctx += `FUNNEL: ${summary?.totalContacts||0} contacts, ${summary?.totalDeals||0} deals\n`;
    funnel.funnelStages.forEach(s => {
      ctx += `- ${s.label}: ${s.count} contacts, ${s.conversionRate}% conversion, ${s.dropOff} drop-off (${s.dropOffRate}%)\n`;
    });
    if (funnel.biggestLeak) ctx += `BIGGEST LEAK: ${funnel.biggestLeak.description}\n`;
  }

  if (funnel?.stageTimes && Object.keys(funnel.stageTimes).length > 0) {
    ctx += `\nSTAGE TIMING:\n`;
    Object.values(funnel.stageTimes).forEach(t => {
      ctx += `- ${t.from}→${t.to}: ${t.medianDays} days median (${t.sampleSize} contacts)\n`;
    });
  }

  if (behavioral?.speedToLead?.wonMedianHours != null) {
    ctx += `\nSPEED TO LEAD: Won ${behavioral.speedToLead.wonMedianHours}h, Lost ${behavioral.speedToLead.lostMedianHours}h\n`;
  }
  if (behavioral?.activityLevels?.wonMedianTouches != null) {
    ctx += `TOUCHES: Won ${behavioral.activityLevels.wonMedianTouches}, Lost ${behavioral.activityLevels.lostMedianTouches}\n`;
  }
  if (behavioral?.bySource?.length > 0) {
    ctx += `\nWIN RATES BY SOURCE:\n`;
    behavioral.bySource.forEach(s => { ctx += `- ${s.source}: ${s.winRate}% (${s.won}/${s.total})\n`; });
  }

  if (activityData?.comparison) {
    const { won, lost } = activityData.comparison;
    ctx += `\nSALES ACTIVITY (won vs lost):\n`;
    ctx += `- Calls/deal: Won ${won.avgCalls} vs Lost ${lost.avgCalls}\n`;
    ctx += `- Emails/deal: Won ${won.avgEmails} vs Lost ${lost.avgEmails}\n`;
    ctx += `- Meetings/deal: Won ${won.avgMeetings} vs Lost ${lost.avgMeetings}\n`;
    if (won.avgCallDuration > 0) ctx += `- Avg call: Won ${won.avgCallDuration}min vs Lost ${lost.avgCallDuration}min\n`;
    if (won.emailOpenRate > 0) ctx += `- Email opens: Won ${won.emailOpenRate}% vs Lost ${lost.emailOpenRate}%\n`;
  }

  if (activityData?.lossReasons?.length > 0) {
    ctx += `\nTOP LOSS REASONS:\n`;
    activityData.lossReasons.forEach(r => { ctx += `- "${r.reason}": ${r.count} deals (${r.pct}%)\n`; });
  }

  if (leadsData?.leads) {
    const high = leadsData.leads.filter(l => l.risk === 'high').length;
    const med = leadsData.leads.filter(l => l.risk === 'medium').length;
    ctx += `\nLEAD RISK: ${leadsData.total} active, ${high} high risk, ${med} medium risk\n`;
  }

  if (insightsData?.insights?.length > 0) {
    ctx += `\nCURRENT ISSUES DETECTED (${insightsData.insights.length} total):\n`;
    insightsData.insights.slice(0, 5).forEach((ins, i) => {
      ctx += `${i+1}. [${ins.severity.toUpperCase()}] [${ins.type}] ${ins.title}\n`;
    });
  }

  return ctx;
}

const LA_JEFA_SYSTEM_PROMPT = `You are La Jefa, the revenue intelligence advisor inside PipeChamp. You are sharp, direct, and analytical. You speak with calm authority.

Personality:
- Direct and confident. You already know what's wrong before they finish asking.
- Always cite specific numbers from the pipeline data
- Give concrete, actionable next steps — not vague advice
- When recommending a fix, tell them exactly where to go in HubSpot and what to do
- Concise — 3-5 sentences for simple questions, structured breakdown for complex ones
- You care about their revenue, not about impressing them

Action framework — when giving advice always include:
1. What the specific problem is (with numbers)
2. The exact fix (specific HubSpot workflow, setting, or action)
3. What to measure to know it's working

Rules:
- Only answer questions about revenue, pipeline, sales, marketing, and business growth
- Always reference specific numbers from the context when available
- If data is genuinely missing, say exactly what data is needed and how to get it in HubSpot
- Never include personal contact names or email addresses
- Do not use wrestling metaphors or character references
- When recommending tools outside HubSpot, mention them by name (e.g. "Set up a Calendly link and add it to your sequences")`;

module.exports = { buildContext, LA_JEFA_SYSTEM_PROMPT };
