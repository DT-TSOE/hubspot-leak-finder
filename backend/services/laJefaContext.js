function buildContext(funnelData, insightsData, leadsData) {
  const funnel = funnelData?.funnel;
  const behavioral = funnelData?.behavioral;
  const summary = funnelData?.summary;
  let ctx = `Pipeline data:\n\n`;

  if (funnel?.funnelStages) {
    ctx += `FUNNEL: ${summary?.totalContacts||0} contacts, ${summary?.totalDeals||0} deals\n`;
    funnel.funnelStages.forEach(s => { ctx += `- ${s.label}: ${s.count} contacts, ${s.conversionRate}% conversion, ${s.dropOff} drop-off\n`; });
    if (funnel.biggestLeak) ctx += `\nBIGGEST LEAK: ${funnel.biggestLeak.description}\n`;
  }

  if (funnel?.stageTimes && Object.keys(funnel.stageTimes).length > 0) {
    ctx += `\nSTAGE TIMING:\n`;
    Object.values(funnel.stageTimes).forEach(t => { ctx += `- ${t.from}→${t.to}: ${t.medianDays} days median\n`; });
  }

  if (behavioral?.speedToLead?.wonMedianHours !== null && behavioral?.speedToLead?.wonMedianHours !== undefined) {
    ctx += `\nSPEED TO LEAD: Won ${behavioral.speedToLead.wonMedianHours}h, Lost ${behavioral.speedToLead.lostMedianHours}h\n`;
  }

  if (behavioral?.activityLevels?.wonMedianTouches !== null && behavioral?.activityLevels?.wonMedianTouches !== undefined) {
    ctx += `TOUCHES: Won ${behavioral.activityLevels.wonMedianTouches}, Lost ${behavioral.activityLevels.lostMedianTouches}\n`;
  }

  if (behavioral?.bySource?.length > 0) {
    ctx += `\nWIN RATES BY SOURCE:\n`;
    behavioral.bySource.slice(0,5).forEach(s => { ctx += `- ${s.source}: ${s.winRate}% (${s.won}/${s.total})\n`; });
  }

  if (leadsData?.leads) {
    const high = leadsData.leads.filter(l => l.risk==='high').length;
    const med = leadsData.leads.filter(l => l.risk==='medium').length;
    ctx += `\nLEAD RISK: ${leadsData.total} active, ${high} high risk, ${med} medium risk\n`;
  }

  if (insightsData?.insights?.length > 0) {
    ctx += `\nTOP ISSUES:\n`;
    insightsData.insights.slice(0,3).forEach((ins,i) => { ctx += `${i+1}. [${ins.type}] ${ins.title}\n`; });
  }

  return ctx;
}

const LA_JEFA_SYSTEM_PROMPT = `You are La Jefa, the revenue intelligence advisor inside PipeChamp. You are sharp, direct, and analytical. You speak with calm authority.

Personality:
- Direct and confident, never vague
- Always cite specific numbers from the pipeline data when available  
- Concise — 2-4 sentences unless a detailed breakdown is needed
- You care about the user's revenue success

Rules:
- Only answer questions about revenue, pipeline, sales, marketing, and business growth
- Always reference specific numbers from the context when available
- If data is insufficient, say so clearly and suggest what data is needed
- Never include personal data like contact names or emails
- Keep responses under 120 words unless a breakdown is explicitly requested
- Do not use wrestling metaphors or character references`;

module.exports = { buildContext, LA_JEFA_SYSTEM_PROMPT };
