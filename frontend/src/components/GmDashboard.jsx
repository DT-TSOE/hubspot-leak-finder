import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';

const fmtSource = s => s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : s;

const URGENCY_COLORS = {
  critical: { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626', dot: '#EF4444' },
  high: { bg: '#FEF3C7', border: '#FDE68A', text: '#D97706', dot: '#F59E0B' },
  medium: { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', dot: '#F59E0B' },
};

function HealthScoreRing({ score, grade }) {
  const size = 110;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - ((score || 0) / 100) * circumference;
  const color = score === null ? '#ccc' : score >= 70 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444';

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#F3F4F6" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset .8s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#111', lineHeight: 1 }}>
          {score !== null ? score : '—'}
        </div>
        {grade && <div style={{ fontSize: 11, fontWeight: 700, color, marginTop: 2 }}>Grade {grade}</div>}
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E5EA', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6, fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 2, lineHeight: 1.2 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: '#888' }}>{sub}</div>}
    </div>
  );
}

export default function GmDashboard({ onScoreLoad, onTabChange }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    api.getGmDashboard()
      .then(d => {
        if (mounted) {
          setData(d);
          setLoading(false);
          if (onScoreLoad && d.pipelineHealthScore?.score != null) {
            onScoreLoad(d.pipelineHealthScore);
          }
        }
      })
      .catch(e => { if (mounted) { setError(e.message); setLoading(false); } });
    return () => { mounted = false; };
  }, [onScoreLoad]);

  if (loading) return <div style={{ textAlign:'center', padding:'4rem', color:'#888', fontSize:14 }}>Building your pipeline health report…</div>;
  if (error) return <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'14px 18px', color:'#DC2626' }}>Error: {error}</div>;
  if (!data) return null;

  const score = data.pipelineHealthScore;

  const fmt$ = n => n > 0 ? '$' + Math.round(n).toLocaleString() : null;
  const URGENCY_STYLE = {
    critical: { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', label: 'Critical' },
    high:     { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', label: 'High' },
    medium:   { color: '#059669', bg: '#F0FDF4', border: '#BBF7D0', label: 'Medium' },
  };

  return (
    <div>
      {/* Health score banner */}
      <div style={{ background: '#fff', border: '1px solid #E2E5EA', borderRadius: 12, padding: '20px 24px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 24 }}>
        <HealthScoreRing score={score?.score ?? null} grade={score?.grade} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#43A047', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>Pipeline Health</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#111', letterSpacing: '-0.3px', marginBottom: 8 }}>
            {score?.score === null ? 'Not enough data yet'
              : score?.score >= 80 ? 'Your pipeline is in great shape'
              : score?.score >= 60 ? 'Pipeline is healthy with room to improve'
              : score?.score >= 40 ? 'Pipeline needs attention'
              : 'Pipeline has serious leaks'}
          </div>
          {score?.dimensions && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Object.entries(score.dimensions).map(([key, dim]) => {
                const labels = { conversion: 'Conversion', speed: 'Speed', activity: 'Activity', winRate: 'Win Rate', flow: 'Flow' };
                const color = dim.score >= 70 ? '#10B981' : dim.score >= 50 ? '#F59E0B' : '#EF4444';
                return (
                  <span key={key} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 12, background: '#F7F8FA', color: '#555', border: '1px solid #E2E5EA' }}>
                    <span style={{ color, fontWeight: 700 }}>●</span> {labels[key]}: <strong style={{ color: '#111' }}>{dim.score}</strong>
                  </span>
                );
              })}
            </div>
          )}
        </div>
        {/* Revenue at risk callout */}
        {data.totalRevenueAtRisk > 0 && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>Revenue at Risk</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#DC2626', letterSpacing: '-0.5px', lineHeight: 1 }}>{fmt$(data.totalRevenueAtRisk)}</div>
            <div style={{ fontSize: 11, color: '#EF4444', marginTop: 2 }}>{data.stuckCount} records stalled</div>
          </div>
        )}
      </div>

      {/* Top Opportunities */}
      {data.topOpportunities?.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #E2E5EA', borderRadius: 12, marginBottom: 14, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
              <img src="/el-pipeador.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
                onError={e => { e.target.style.display='none'; e.target.parentElement.innerHTML='🎯'; }} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>Top Opportunities</div>
            <div style={{ fontSize: 11, color: '#888', marginLeft: 2 }}>— ranked by impact</div>
          </div>
          {data.topOpportunities.map((opp, i) => {
            const u = URGENCY_STYLE[opp.urgency] || URGENCY_STYLE.medium;
            return (
              <div key={i} style={{ display: 'flex', gap: 14, padding: '14px 20px', borderBottom: i < data.topOpportunities.length - 1 ? '1px solid #F9FAFB' : 'none', alignItems: 'flex-start' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#555', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 8, background: u.bg, color: u.color, border: `1px solid ${u.border}`, textTransform: 'uppercase', letterSpacing: '.04em' }}>{u.label}</span>
                    {opp.metric && <span style={{ fontSize: 11, color: '#888' }}>{opp.metric}</span>}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 3 }}>{opp.title}</div>
                  <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>{opp.action}</div>
                </div>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('pipecoach:open', { detail: { message: opp.coachMessage } }))}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#111', border: 'none', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', flexShrink: 0, marginTop: 2 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 4, overflow: 'hidden', flexShrink: 0 }}>
                    <img src="/pipecoach.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
                      onError={e => { e.target.style.display='none'; e.target.parentElement.innerHTML='<span style="color:#fff;font-size:9px">PC</span>'; }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>Ask PipeCoach</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* What to improve + key metrics side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>

        {/* Weakest areas in plain English */}
        {score?.dimensions && (() => {
          const DIM_LABELS = {
            conversion: { label: 'Lead Conversion', desc: 'How many leads make it through each stage of your funnel' },
            speed:      { label: 'Response Time',   desc: 'How fast your team contacts new leads after they come in' },
            activity:   { label: 'Outreach Activity', desc: 'How many active contacts have actually been worked vs sitting untouched' },
            winRate:    { label: 'Deal Win Rate',   desc: 'Percentage of deals you\'re closing vs losing' },
            flow:       { label: 'Pipeline Flow',   desc: 'How smoothly deals move through stages without getting stuck' },
          };
          const sorted = Object.entries(score.dimensions).sort(([,a],[,b]) => a.score - b.score);
          const weakest = sorted.slice(0, 2);
          const hasIssues = weakest.some(([,d]) => d.score < 70);
          return (
            <div style={{ background: '#fff', border: '1px solid #E2E5EA', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 12 }}>
                {hasIssues ? 'Where to focus' : 'All areas healthy'}
              </div>
              {weakest.map(([key, dim]) => {
                const info = DIM_LABELS[key] || { label: key, desc: '' };
                const color = dim.score >= 70 ? '#10B981' : dim.score >= 50 ? '#F59E0B' : '#EF4444';
                const status = dim.score >= 70 ? '✓ Good' : dim.score >= 50 ? '⚠ Needs work' : '✗ Critical';
                return (
                  <div key={key} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid #F3F4F6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{info.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}15`, padding: '2px 8px', borderRadius: 8 }}>{status}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#888', lineHeight: 1.5 }}>{dim.detail || info.desc}</div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Key metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignContent: 'start' }}>
          {data.metricCards.filter(c => ['win_rate','sales_cycle','speed','biggest_leak'].includes(c.id)).map(card => (
            <MetricCard key={card.id} label={card.label} value={card.value} sub={card.sub} />
          ))}
        </div>
      </div>

      {/* Uncontacted + stuck callouts */}
      {(data.uncontactedCount > 0 || data.stuckCount > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: data.uncontactedCount > 0 && data.stuckCount > 0 ? '1fr 1fr' : '1fr', gap: 10 }}>
          {data.uncontactedCount > 0 && (
            <button onClick={() => onTabChange?.('lead-response')}
              style={{ background: '#fff', border: '1px solid #FECACA', borderLeft: '4px solid #EF4444', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, width: '100%', cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                <img src="/rojo.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
                  onError={e => { e.target.style.display='none'; e.target.parentElement.innerHTML='🚨'; }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 2 }}>Uncontacted leads</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#111', lineHeight: 1.2 }}>{data.uncontactedCount} new leads, no outreach yet</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Responding within 1 hour closes 7× better — tap to see who</div>
              </div>
              <span style={{ fontSize: 16, color: '#DC2626' }}>→</span>
            </button>
          )}
          {data.stuckCount > 0 && (
            <button onClick={() => onTabChange?.('at-risk')}
              style={{ background: '#fff', border: '1px solid #FDE68A', borderLeft: '4px solid #F59E0B', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, width: '100%', cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                <img src="/rojo.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
                  onError={e => { e.target.style.display='none'; e.target.parentElement.innerHTML='⚠️'; }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 2 }}>Stuck records</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#111', lineHeight: 1.2 }}>{data.stuckCount} contacts & deals haven't moved</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>They've been in the same stage too long — tap to see who</div>
              </div>
              <span style={{ fontSize: 16, color: '#D97706' }}>→</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
