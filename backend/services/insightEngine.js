/**
 * PipeChamp Insight Engine v2
 * - No insight cap (generates as many as data supports)
 * - Richer insight types
 * - Stronger, specific HubSpot actions
 * - Filterable by type and severity
 */

const MIN_SAMPLE = 3;

function generateInsights(funnelData, sourceData, activityData, speedData, ltvData, activityComparison) {
  const insights = [];

  // ── 1. Funnel conversion leaks ──────────────────────────────
  if (funnelData?.funnelStages) {
    for (let i = 1; i < funnelData.funnelStages.length; i++) {
      const stage = funnelData.funnelStages[i];
      const prev = funnelData.funnelStages[i - 1];
      if (stage.count + stage.dropOff < MIN_SAMPLE) continue;
      if (stage.dropOffRate > 20) {
        const severity = stage.dropOffRate > 50 ? 'high' : stage.dropOffRate > 35 ? 'medium' : 'low';
        insights.push({
          type: 'Funnel Leak',
          subtype: 'conversion',
          severity,
          priority: severity === 'high' ? 1 : severity === 'medium' ? 2 : 3,
          title: `${stage.dropOffRate}% of ${prev.label}s never become ${stage.label}s`,
          dataPoint: `${stage.dropOff.toLocaleString()} contacts drop off here. Only ${stage.conversionRate}% convert — your ${prev.label}→${stage.label} transition is bleeding revenue.`,
          action: getFunnelAction(stage.stage, prev.label, stage.label, stage.conversionRate),
          metric: { label: 'Drop-off Rate', value: `${stage.dropOffRate}%` },
          hubspotSteps: getHubSpotSteps(stage.stage)
        });
      }
    }
  }

  // ── 2. Stage timing delays ──────────────────────────────────
  if (funnelData?.stageTimes) {
    for (const t of Object.values(funnelData.stageTimes)) {
      if (t.sampleSize < MIN_SAMPLE) continue;
      if (t.medianDays > 14) {
        const severity = t.medianDays > 45 ? 'high' : t.medianDays > 21 ? 'medium' : 'low';
        insights.push({
          type: 'Stage Delay',
          subtype: 'timing',
          severity,
          priority: severity === 'high' ? 1 : 2,
          title: `Contacts take ${t.medianDays} days to move from ${t.from} to ${t.to}`,
          dataPoint: `Median of ${t.medianDays} days across ${t.sampleSize} contacts. Mean is ${t.meanDays} days — suggesting some contacts are stuck much longer.`,
          action: `In HubSpot, create a Workflow: Contact enrolled in "${t.from}" stage → wait ${Math.round(t.medianDays * 0.5)} days → if still in same stage, create a task for the owner: "Follow up — contact stalled at ${t.from}." This catches stuck contacts before they go cold.`,
          metric: { label: 'Median Days', value: `${t.medianDays}d` },
          hubspotSteps: [
            `Go to Automation → Workflows → Create new`,
            `Trigger: Contact lifecycle stage is set to "${t.from}"`,
            `Add delay: ${Math.round(t.medianDays * 0.5)} days`,
            `Add condition: Lifecycle stage is still "${t.from}"`,
            `Action: Create task assigned to contact owner — "Stalled contact — needs follow-up"`
          ]
        });
      }
    }
  }

  // ── 3. Speed to lead ────────────────────────────────────────
  if (speedData?.wonMedianHours != null && speedData?.lostMedianHours != null) {
    const ratio = speedData.lostMedianHours / Math.max(speedData.wonMedianHours, 0.5);
    if (ratio > 1.5) {
      const severity = ratio > 5 ? 'high' : ratio > 2.5 ? 'medium' : 'low';
      insights.push({
        type: 'Speed to Lead',
        subtype: 'response',
        severity,
        priority: 1,
        title: `Won deals contacted ${ratio.toFixed(1)}× faster — ${formatH(speedData.wonMedianHours)} vs ${formatH(speedData.lostMedianHours)}`,
        dataPoint: `Based on ${speedData.wonSampleSize + speedData.lostSampleSize} closed contacts. The gap between your best and worst response times is costing you deals.`,
        action: `Set a ${formatH(speedData.wonMedianHours * 1.5)} response SLA for all new leads. In HubSpot, create a workflow that fires a task to the assigned rep the moment a new contact becomes an MQL. If no activity in ${formatH(speedData.wonMedianHours * 2)}, escalate to the manager.`,
        metric: { label: 'Response Gap', value: `${ratio.toFixed(1)}×` },
        hubspotSteps: [
          `Go to Automation → Workflows → Create new`,
          `Trigger: Contact Lifecycle Stage becomes Marketing Qualified Lead`,
          `Action: Create task for Contact Owner — "New MQL — contact within ${formatH(speedData.wonMedianHours * 1.5)}"`,
          `Add delay: ${formatH(speedData.wonMedianHours * 2)}`,
          `Add condition: No associated activity logged`,
          `Action: Send internal email to manager — "MQL not contacted: [Contact Name]"`
        ]
      });
    }
  }

  // ── 4. Source performance gaps ──────────────────────────────
  if (sourceData?.length >= 2) {
    const best = sourceData[0];
    const worst = sourceData[sourceData.length - 1];
    const gap = best.winRate - worst.winRate;
    if (gap > 10) {
      const severity = gap > 35 ? 'high' : gap > 20 ? 'medium' : 'low';
      insights.push({
        type: 'Source Performance',
        subtype: 'channel',
        severity,
        priority: 2,
        title: `${best.source} closes at ${best.winRate}% — ${worst.source} closes at only ${worst.winRate}%`,
        dataPoint: `${best.won} closed-won from ${best.source} (${best.total} total contacts). ${worst.source} has ${worst.total} contacts but only ${worst.won} wins. You may be over-investing in low-quality channels.`,
        action: `Double down on ${best.source}. Review your ${worst.source} lead qualification — are you spending time on contacts that will never close? Add a disqualification workflow for ${worst.source} leads that haven't engaged after ${Math.round(30)} days.`,
        metric: { label: `${best.source} Win Rate`, value: `${best.winRate}%` },
        hubspotSteps: [
          `In HubSpot, filter Contacts by Original Source = "${worst.source}"`,
          `Look for patterns — job title, company size, engagement level`,
          `Create a list of ${worst.source} contacts with no email opens or activity in 30 days`,
          `Enroll in a re-engagement sequence or mark as Unqualified`,
          `Add ${best.source} as a required field in your lead scoring model`
        ]
      });
    }

    // Surface ALL source insights, not just best vs worst
    for (const source of sourceData) {
      if (source === best || source === worst) continue;
      if (source.winRate > best.winRate * 0.8 && source.total >= MIN_SAMPLE * 2) {
        insights.push({
          type: 'Source Performance',
          subtype: 'channel',
          severity: 'low',
          priority: 4,
          title: `${source.source} is a strong secondary channel at ${source.winRate}% close rate`,
          dataPoint: `${source.won} wins from ${source.total} contacts. Close to your best channel — worth investing in.`,
          action: `Analyze what ${source.source} leads have in common with your ${best.source} wins. Consider increasing investment in this channel.`,
          metric: { label: 'Win Rate', value: `${source.winRate}%` },
          hubspotSteps: [
            `Filter contacts by Original Source = "${source.source}"`,
            `Compare job titles and company sizes to your ${best.source} wins`,
            `If similar profile, increase budget or effort on this channel`
          ]
        });
      }
    }
  }

  // ── 5. Touch count gap ──────────────────────────────────────
  if (activityData?.wonMedianTouches != null && activityData?.lostMedianTouches != null) {
    const diff = activityData.wonMedianTouches - activityData.lostMedianTouches;
    if (Math.abs(diff) >= 1) {
      const severity = Math.abs(diff) > 5 ? 'high' : Math.abs(diff) > 2 ? 'medium' : 'low';
      insights.push({
        type: 'Engagement Gap',
        subtype: 'activity',
        severity,
        priority: 2,
        title: diff > 0
          ? `Won deals received ${activityData.wonMedianTouches} touches — lost deals only ${activityData.lostMedianTouches}`
          : `More touches aren't driving closes — review outreach quality`,
        dataPoint: `Based on ${activityData.wonSampleSize + activityData.lostSampleSize} closed contacts. ${diff > 0 ? `Your reps may be giving up too early on leads that need more nurturing.` : `Volume isn't the issue — content and timing may need review.`}`,
        action: diff > 0
          ? `Build a ${Math.ceil(activityData.wonMedianTouches)}-touch sequence in HubSpot. Don't allow reps to mark a lead as lost until they've hit ${Math.ceil(activityData.wonMedianTouches)} documented touches. Create a sequence: Day 1 call → Day 2 email → Day 5 LinkedIn → Day 8 call → Day 12 email → Day 18 final breakup email.`
          : `Your team is making enough contacts but not converting. Review your email templates and call scripts — the problem is messaging, not volume. A/B test your most common outreach templates.`,
        metric: { label: 'Touch Difference', value: `+${Math.abs(diff).toFixed(1)}` },
        hubspotSteps: diff > 0 ? [
          `Go to Automation → Sequences → Create new sequence`,
          `Build ${Math.ceil(activityData.wonMedianTouches)}-step sequence matching your winning pattern`,
          `Set a deal property rule: cannot move to Closed Lost without ${Math.ceil(activityData.wonMedianTouches)} logged activities`,
          `Create a report: Closed Lost deals with fewer than ${Math.ceil(activityData.wonMedianTouches)} touches`
        ] : [
          `Pull your last 10 closed-won email threads and 10 closed-lost threads`,
          `Compare subject lines, email length, and call-to-action`,
          `A/B test your top 2 templates in HubSpot Sequences`
        ]
      });
    }
  }

  // ── 6. Activity comparison (calls, emails, meetings) ────────
  if (activityComparison?.won && activityComparison?.lost) {
    const { won, lost } = activityComparison;

    if (won.avgMeetings > 0 && lost.avgMeetings === 0) {
      insights.push({
        type: 'Sales Activity',
        subtype: 'meetings',
        severity: 'high',
        priority: 1,
        title: `Won deals average ${won.avgMeetings} meetings — lost deals have almost none`,
        dataPoint: `Meetings are strongly correlated with closes in your pipeline. Deals without a meeting almost never close.`,
        action: `Make booking a meeting a required step in your sales process. In HubSpot, add "Meeting Booked" as a required deal property before moving to Opportunity stage. Create a sequence that pushes for a meeting on touch 2 and touch 4.`,
        metric: { label: 'Meeting Impact', value: 'Critical' },
        hubspotSteps: [
          `Go to CRM → Deals → Deal Properties → make "Meeting Booked" required at Opportunity stage`,
          `Add your Calendly or HubSpot Meetings link to every email sequence`,
          `Create a report: Deals closed won vs closed lost by meeting count`,
          `Set up a workflow: If deal reaches SQL stage with no meeting, create task "Book discovery call"`
        ]
      });
    }

    if (won.avgCallDuration > 0 && won.avgCallDuration > lost.avgCallDuration * 1.5) {
      insights.push({
        type: 'Sales Activity',
        subtype: 'calls',
        severity: 'medium',
        priority: 2,
        title: `Won deals have ${won.avgCallDuration} min avg calls vs ${lost.avgCallDuration} min for lost`,
        dataPoint: `Longer calls correlate with closes. Short calls may indicate surface-level conversations that don't uncover real pain.`,
        action: `Train your team on deeper discovery. A ${won.avgCallDuration}-minute call should cover: budget, authority, need, timeline, and specific pain points. Use HubSpot call notes to track whether these topics were covered.`,
        metric: { label: 'Call Duration Gap', value: `${won.avgCallDuration - lost.avgCallDuration} min` },
        hubspotSteps: [
          `Go to Sales → Calls and review your last 10 won deal call notes`,
          `Create a call checklist as a note template in HubSpot`,
          `Add custom call outcome property: Budget confirmed / Pain identified / Next step agreed`,
          `Filter calls by outcome to see which discovery patterns lead to closes`
        ]
      });
    }
  }

  // ── 7. LTV insights ─────────────────────────────────────────
  if (ltvData && !ltvData.insufficient) {
    if (ltvData.ltvBySource?.length >= 2) {
      const best = ltvData.ltvBySource[0];
      const worst = ltvData.ltvBySource[ltvData.ltvBySource.length - 1];
      if (best.avgDealSize > worst.avgDealSize * 1.5) {
        insights.push({
          type: 'Revenue',
          subtype: 'ltv',
          severity: 'medium',
          priority: 3,
          title: `${best.source} deals are worth $${best.avgDealSize.toLocaleString()} vs $${worst.avgDealSize.toLocaleString()} from ${worst.source}`,
          dataPoint: `${best.source} produces ${Math.round(best.avgDealSize / worst.avgDealSize * 10) / 10}× more revenue per deal. You may be spending equal effort on unequal opportunities.`,
          action: `Prioritize ${best.source} leads in your pipeline. When two deals are competing for rep attention, ${best.source} leads should win. Consider adjusting your lead scoring to weight ${best.source} higher.`,
          metric: { label: 'Deal Size Gap', value: `${Math.round(best.avgDealSize / worst.avgDealSize * 10) / 10}×` },
          hubspotSteps: [
            `Go to CRM → Contacts → filter by Original Source`,
            `Add Average Deal Size as a column and compare`,
            `Update your HubSpot lead scoring: +10 points for ${best.source} leads`,
            `Create a view: "${best.source} MQLs" sorted by create date for daily rep review`
          ]
        });
      }
    }

    if (ltvData.repPerformance?.length >= 2) {
      const top = ltvData.repPerformance[0];
      const bottom = ltvData.repPerformance[ltvData.repPerformance.length - 1];
      if (top.winRate - bottom.winRate > 15) {
        insights.push({
          type: 'Rep Performance',
          subtype: 'reps',
          severity: top.winRate - bottom.winRate > 30 ? 'high' : 'medium',
          priority: 2,
          title: `Top rep closes at ${top.winRate}% — bottom rep at ${bottom.winRate}%`,
          dataPoint: `${top.winRate - bottom.winRate} point gap between your best and worst performers. If your bottom rep performed at your top rep's rate, you'd close significantly more revenue.`,
          action: `Schedule a pipeline review between your top and bottom reps. Have your top rep share their discovery call structure, objection handling, and follow-up cadence. Record their next 3 calls for training material.`,
          metric: { label: 'Performance Gap', value: `${top.winRate - bottom.winRate}pts` },
          hubspotSteps: [
            `Go to Reports → Sales → Sales Rep Leaderboard`,
            `Compare call duration, email open rates, and meeting counts between reps`,
            `Create a "Best practices" note template based on top rep's approach`,
            `Set up weekly pipeline reviews using HubSpot's forecast tool`
          ]
        });
      }
    }
  }

  // Sort by priority then severity
  const severityOrder = { high: 0, medium: 1, low: 2 };
  return insights.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

function getFunnelAction(stage, fromLabel, toLabel, convRate) {
  const actions = {
    marketingqualifiedlead: `Your ${fromLabel}→${toLabel} conversion is ${convRate}%. Review your MQL definition — are you qualifying too loosely? Add lead scoring in HubSpot based on: email opens (5pts), page views (3pts), form submissions (10pts), demo request (25pts). Only contacts above 30 points should become MQLs. This will reduce volume but dramatically increase quality.`,
    salesqualifiedlead: `Only ${convRate}% of MQLs become SQLs. This usually means either the MQL bar is too low or reps aren't following up fast enough. Check your average MQL response time — if it's over 4 hours, that's your problem. Create a HubSpot workflow: New MQL created → assign to rep → create "Call within 2 hours" task → if no activity in 4 hours, send manager alert.`,
    opportunity: `${convRate}% of SQLs become Opportunities. Your reps may be advancing leads too early or your discovery process isn't qualifying properly. Add required fields before a contact can become an Opportunity: Budget confirmed, Decision maker identified, Timeline established, Pain point documented.`,
    customer: `Only ${convRate}% of Opportunities close. This is your close rate — industry average for B2B is 15-30%. Review your last 10 lost deals: were they lost on price, timing, competition, or no decision? Create a required "Closed Lost Reason" field in HubSpot and make reps fill it in. You can't fix what you can't measure.`
  };
  return actions[stage] || `Your ${fromLabel}→${toLabel} conversion is ${convRate}%. Review the qualification criteria and follow-up cadence at this stage.`;
}

function getHubSpotSteps(stage) {
  const steps = {
    marketingqualifiedlead: [
      `Go to Marketing → Lead Scoring → Set up score thresholds`,
      `Add scoring rules: email open (+5), page view (+3), form fill (+10), pricing page (+15)`,
      `Set MQL threshold at 30+ points`,
      `Create workflow: Score reaches 30 → set lifecycle to MQL → notify assigned rep`
    ],
    salesqualifiedlead: [
      `Go to Automation → Workflows → Create "MQL Response SLA"`,
      `Trigger: Lifecycle stage = MQL`,
      `Action: Create task for owner "Call new MQL — 2 hour SLA"`,
      `Delay 4 hours → if no call logged → email manager escalation`
    ],
    opportunity: [
      `Go to CRM → Deals → Deal Properties`,
      `Add required properties at Opportunity stage: Budget, Authority, Need, Timeline`,
      `Create a deal view filtered to Opportunities missing these fields`,
      `Weekly review: any Opportunity without BANT filled = move back to SQL`
    ],
    customer: [
      `Go to CRM → Deals → Add "Closed Lost Reason" as a required field`,
      `Options: Price, Competitor, Timing, No budget, No decision, Wrong fit`,
      `Create monthly report: Closed Lost by reason`,
      `Review top reason each month and adjust your sales playbook accordingly`
    ]
  };
  return steps[stage] || [];
}

function formatH(h) {
  if (h == null) return 'N/A';
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 24) return `${Math.round(h)}h`;
  return `${Math.round(h / 24)}d`;
}

const INSIGHT_TYPES = ['Funnel Leak', 'Stage Delay', 'Speed to Lead', 'Source Performance', 'Engagement Gap', 'Sales Activity', 'Revenue', 'Rep Performance'];
const INSIGHT_SEVERITIES = ['high', 'medium', 'low'];

module.exports = { generateInsights, INSIGHT_TYPES, INSIGHT_SEVERITIES };
