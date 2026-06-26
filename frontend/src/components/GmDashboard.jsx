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

export default function GmDashboard({ onScoreLoad }) {
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

  return (
    <div>
      {/* Health score banner */}
      <div style={{ background: '#fff', border: '1px solid #E2E5EA', borderRadius: 12, padding: '20px 24px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 24 }}>
        <HealthScoreRing score={score?.score ?? null} grade={score?.grade} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#43A047', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>
            Pipeline Health
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#111', letterSpacing: '-0.3px', marginBottom: 6 }}>
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
      </div>

      {/* Top Priority card */}
      {data.fixThisFirst && (
        <div style={{ background: 'linear-gradient(135deg, #1a1a1a, #2d2d2d)', borderRadius: 12, padding: '20px 24px', marginBottom: 14, color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 10, overflow: 'hidden', border: '2px solid #4CAF50', flexShrink: 0 }}>
              <img src="/el-pipeador.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
                onError={e => { e.target.style.display='none'; e.target.parentElement.style.display='flex'; e.target.parentElement.style.alignItems='center'; e.target.parentElement.style.justifyContent='center'; e.target.parentElement.innerHTML='<span style="font-size:20px">🤼</span>'; }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#4CAF50', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>
                Top Priority
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6, letterSpacing: '-0.2px' }}>{data.fixThisFirst.title}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.75)', marginBottom: 16, lineHeight: 1.5 }}>{data.fixThisFirst.action}</div>
              <button
                onClick={() => {
                  const msg = `My top priority is: "${data.fixThisFirst.title}". ${data.fixThisFirst.action} Give me step-by-step instructions to fix this in HubSpot.`;
                  window.dispatchEvent(new CustomEvent('pipecoach:open', { detail: { message: msg } }));
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(76,175,80,.15)', border: '1px solid #4CAF50', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', color: '#4CAF50', fontSize: 12, fontWeight: 700 }}>
                <div style={{ width: 20, height: 20, borderRadius: 5, overflow: 'hidden', border: '1px solid #4CAF50', flexShrink: 0 }}>
                  <img src="/pipecoach.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
                    onError={e => { e.target.style.display='none'; e.target.parentElement.innerHTML='PC'; }} />
                </div>
                Ask PipeCoach how to fix this →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Metric cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
        {data.metricCards.map(card => (
          <MetricCard key={card.id} label={card.label} value={['top_revenue_source','worst_source'].includes(card.id) ? fmtSource(card.value) : card.value} sub={card.sub} />
        ))}
      </div>

      {/* Action callouts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {data.uncontactedCount > 0 && (
          <div style={{ background: '#fff', border: '1px solid #FECACA', borderLeft: '4px solid #EF4444', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>
              Uncontacted leads
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#111', marginBottom: 4 }}>
              {data.uncontactedCount} new leads waiting
            </div>
            <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>
              These contacts haven't received any outreach yet. Speed-to-lead under 6h closes 2.3× better.
            </div>
          </div>
        )}
        {data.stuckCount > 0 && (
          <div style={{ background: '#fff', border: '1px solid #FDE68A', borderLeft: '4px solid #F59E0B', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>
              Stuck records
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#111', marginBottom: 4 }}>
              {data.stuckCount} records past stage threshold
            </div>
            <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>
              Contacts and deals sitting in stages too long. Move them or close them.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
