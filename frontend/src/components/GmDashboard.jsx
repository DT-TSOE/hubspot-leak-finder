import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import Scorecard from './Scorecard';

const fmtH = h => h == null ? '-' : h < 1 ? `${Math.round(h * 60)}m` : h < 48 ? `${Math.round(h)}h` : `${Math.round(h / 24)}d`;
const fmtDays = d => d < 7 ? `${d}d` : d < 60 ? `${Math.round(d / 7)}w` : `${Math.round(d / 30)}mo`;

const CARD_GOAL_KEY = { win_rate: 'winRate', sales_cycle: 'salesCycle', speed: 'speedToLead' };
const CARD_GOAL_FMT = { win_rate: v => `${v}% goal`, sales_cycle: v => `${fmtDays(v)} goal`, speed: v => `${fmtH(v)} goal` };

export default function GmDashboard({ onScoreLoad, onTabChange, days }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [goals, setGoals] = useState({});

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.getGmDashboard(days)
      .then(d => {
        if (mounted) {
          setData(d);
          setLoading(false);
        }
      })
      .catch(e => { if (mounted) { setError(e.message); setLoading(false); } });
    return () => { mounted = false; };
  }, [days]);

  useEffect(() => { api.getGoals().then(g => setGoals(g || {})).catch(() => {}); }, []);

  if (loading) return <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14, padding:'4rem 0', color:'#888', fontSize:13 }}><div className="pc-belt"><i></i><i></i><i></i><i></i><i></i></div>Building your pipeline health report…</div>;
  if (error) return <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'14px 18px', color:'#DC2626' }}>Error: {error}</div>;
  if (!data) return null;

  const URGENCY_STYLE = {
    critical: { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', label: 'Critical' },
    high:     { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', label: 'High' },
    medium:   { color: '#059669', bg: '#F0FDF4', border: '#BBF7D0', label: 'Medium' },
  };
  const OPP_TAB = { uncontacted: 'lead-response', stuck_deals: 'at-risk', funnel: 'marketing', speed: 'lead-response', activity: 'lead-response' };
  const METRIC_TAB = { win_rate: 'revenue', sales_cycle: 'revenue', speed: 'lead-response', biggest_leak: 'marketing' };

  return (
    <div>
      {/* Two-funnel scorecard: overall grade + marketing/sales + deal-stage conversion */}
      <Scorecard onScoreLoad={onScoreLoad} onTabChange={onTabChange} days={days} />

      {/* Priority actions -- suppressed when goals are set (gaps section in scorecard covers this) */}
      {Object.keys(goals).length === 0 && (data.uncontactedCount > 0 || data.stuckCount > 0 || data.topOpportunities?.length > 0) && (() => {
        const items = [];
        if (data.uncontactedCount > 0) items.push({
          urgency: 'critical',
          title: `${data.uncontactedCount} leads with zero outreach`,
          action: 'New contacts that have never been called, emailed, or messaged.',
          destTab: 'lead-response',
          coachMessage: `I have ${data.uncontactedCount} leads with no outreach. What should I prioritize and how?`,
        });
        if (data.stuckCount > 0) items.push({
          urgency: 'high',
          title: `${data.stuckCount} contacts and deals are stuck`,
          action: "They've been in the same stage too long and are going cold.",
          destTab: 'at-risk',
          coachMessage: `${data.stuckCount} of my deals and contacts are stuck. How do I get them moving again?`,
        });
        (data.topOpportunities || []).forEach(opp => items.push({
          urgency: opp.urgency,
          title: opp.title,
          action: opp.action,
          destTab: OPP_TAB[opp.type],
          coachMessage: opp.coachMessage,
          metric: opp.metric,
        }));
        return (
          <div style={{ background: '#fff', border: '1px solid #E2E5EA', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid #F3F4F6' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>Priority actions</div>
            </div>
            {items.map((item, i) => {
              const u = URGENCY_STYLE[item.urgency] || URGENCY_STYLE.medium;
              return (
                <div key={i} style={{ display: 'flex', gap: 14, padding: '14px 20px', borderBottom: i < items.length - 1 ? '1px solid #F9FAFB' : 'none', alignItems: 'flex-start', cursor: item.destTab ? 'pointer' : 'default' }}
                  onClick={() => item.destTab && onTabChange?.(item.destTab)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 8, background: u.bg, color: u.color, border: `1px solid ${u.border}`, textTransform: 'uppercase', letterSpacing: '.04em' }}>{u.label}</span>
                      {item.metric && <span style={{ fontSize: 11, color: '#888' }}>{item.metric}</span>}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 3 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>{item.action}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginTop: 2, alignItems: 'center' }}>
                    {item.destTab && <span style={{ fontSize: 11, color: '#aaa' }}>→</span>}
                    <button
                      onClick={e => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('pipecoach:open', { detail: { message: item.coachMessage } })); }}
                      style={{ background: '#111', border: 'none', borderRadius: 8, padding: '7px 12px', cursor: 'pointer' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>Ask PipeCoach</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}
