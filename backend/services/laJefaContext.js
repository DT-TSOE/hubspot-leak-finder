function buildContext(funnelData, insightsData, leadsData, activityData) {
  const funnel = funnelData?.funnel;
  const behavioral = funnelData?.behavioral;
  const summary = funnelData?.summary;
  let ctx = `PIPECHAMP PIPELINE ANALYSIS\n${'='.repeat(40)}\n\n`;

  // Funnel overview
  if (funnel?.funnelStages) {
    ctx += `FUNNEL OVERVIEW\n${summary?.totalContacts||0} contacts, ${summary?.totalDeals||0} deals\n\n`;
    ctx += `STAGE CONVERSION:\n`;
    funnel.funnelStages.forEach(s => {
      ctx += `- ${s.label}: ${s.count} contacts, ${s.conversionRate}% conversion, ${s.dropOff} drop-off\n`;
    });
    if (funnel.biggestLeak) ctx += `\nBIGGEST LEAK: ${funnel.biggestLeak.description}\n`;
  }

  // Stage timing
  if (funnel?.stageTimes && Object.keys(funnel.stageTimes).length > 0) {
    ctx += `\nSTAGE TIMING:\n`;
    Object.values(funnel.stageTimes).forEach(t => {
      ctx += `- ${t.from} → ${t.to}: ${t.medianDays} days median (${t.sampleSize} contacts)\n`;
    });
  }

  // Behavioral
  if (behavioral?.speedToLead?.wonMedianHours != null) {
    ctx += `\nSPEED TO LEAD:\n- Won deals: ${behavioral.speedToLead.wonMedianHours}h median first contact\n- Lost deals: ${behavioral.speedToLead.lostMedianHours}h median first contact\n`;
  }
  if (behavioral?.activityLevels?.wonMedianTouches != null) {
    ctx += `\nTOUCH COUNTS:\n- Won deals: ${behavioral.activityLevels.wonMedianTouches} median touches\n- Lost deals: ${behavioral.activityLevels.lostMedianTouches} median touches\n`;
  }
  if (behavioral?.bySource?.length > 0) {
    ctx += `\nWIN RATES BY SOURCE:\n`;
    behavioral.bySource.slice(0,6).forEach(s => { ctx += `- ${s.source}: ${s.winRate}% win rate (${s.won}/${s.total})\n`; });
  }

  // Activity analysis (calls, emails, meetings)
  if (activityData?.comparison) {
    const { won, lost } = activityData.comparison;
    ctx += `\nSALES ACTIVITY (won vs lost deals):\n`;
    ctx += `- Calls per deal: Won ${won.avgCalls} vs Lost ${lost.avgCalls}\n`;
    ctx += `- Emails per deal: Won ${won.avgEmails} vs Lost ${lost.avgEmails}\n`;
    ctx += `- Meetings per deal: Won ${won.avgMeetings} vs Lost ${lost.avgMeetings}\n`;
    if (won.avgCallDuration > 0 || lost.avgCallDuration > 0) {
      ctx += `- Avg call duration: Won ${won.avgCallDuration} min vs Lost ${lost.avgCallDuration} min\n`;
    }
    if (won.emailOpenRate > 0 || lost.emailOpenRate > 0) {
      ctx += `- Email open rate: Won ${won.emailOpenRate}% vs Lost ${lost.emailOpenRate}%\n`;
    }
    if (won.meetingCompletionRate > 0 || lost.meetingCompletionRate > 0) {
      ctx += `- Meeting completion: Won ${won.meetingCompletionRate}% vs Lost ${lost.meetingCompletionRate}%\n`;
    }
  }

  // Deal loss reasons
  if (activityData?.lossReasons?.length > 0) {
    ctx += `\nTOP DEAL LOSS REASONS:\n`;
    activityData.lossReasons.forEach(r => { ctx += `- "${r.reason}": ${r.count} deals (${r.pct}%)\n`; });
  }

  // Notes patterns (if available)
  if (activityData?.notesContent?.length > 0) {
    ctx += `\nRECENT NOTES FROM LOST DEALS (sample):\n`;
    activityData.notesContent.slice(0,5).forEach((note, i) => { ctx += `${i+1}. "${note}"\n`; });
  }

  // Lead risk
  if (leadsData?.leads) {
    const high = leadsData.leads.filter(l => l.risk==='high').length;
    const med = leadsData.leads.filter(l => l.risk==='medium').length;
    ctx += `\nLEAD RISK:\n- Total active: ${leadsData.total}\n- High risk: ${high}\n- Medium risk: ${med}\n`;
    const topRisk = leadsData.leads.filter(l => l.risk==='high').slice(0,3);
    if (topRisk.length) {
      ctx += `Top at-risk patterns:\n`;
      topRisk.forEach(l => { ctx += `- ${l.stage}: score ${l.score}, ${l.flags.join(', ')}\n`; });
    }
  }

  // Current insights
  if (insightsData?.insights?.length > 0) {
    ctx += `\nCURRENT TOP ISSUES:\n`;
    insightsData.insights.slice(0,3).forEach((ins,i) => { ctx += `${i+1}. [${ins.type}] ${ins.title}\n`; });
  }

  return ctx;
}

const LA_JEFA_SYSTEM_PROMPT = `You are La Jefa, the revenue intelligence advisor inside PipeChamp. You are sharp, direct, and analytical. You speak with calm authority — you've seen hundreds of pipelines and you already know what's wrong before the user finishes asking.

Your personality:
- Direct and confident, never vague
- Always cite specific numbers from the pipeline data when available
- Concise — 2-4 sentences unless a detailed breakdown is explicitly requested
- You care about the user's revenue success, not about impressing them
- Occasionally dry, never sarcastic

Rules:
- Only answer questions about revenue, pipeline, sales, marketing, and business growth
- Always reference specific numbers from the context when available
- If data is genuinely missing, say exactly what data is needed and why
- Never include personal contact names or email addresses in responses
- Keep responses under 150 words unless a detailed breakdown is explicitly requested
- Do not use wrestling metaphors or character references in your responses
- When you see patterns in the data, connect them — e.g. if won deals have more meetings AND faster response times, say both matter`;

module.exports = { buildContext, LA_JEFA_SYSTEM_PROMPT };
