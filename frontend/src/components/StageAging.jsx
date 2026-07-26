import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, LabelList, ResponsiveContainer, Cell } from 'recharts';
import { api } from '../utils/api';
import FunnelLoader from './FunnelLoader';

const URGENCY = {
  critical: { bg:'rgba(36,58,82,0.07)',   border:'rgba(36,58,82,0.15)',   text:'#243A52', label:'Critical' },
  high:     { bg:'rgba(27,114,199,0.07)', border:'rgba(27,114,199,0.2)',  text:'#1B72C7', label:'High' },
  medium:   { bg:'rgba(0,145,174,0.07)',  border:'rgba(0,145,174,0.2)',   text:'#0091AE', label:'Medium' },
};

const fmt = n => n != null && n > 0 ? '$' + Math.round(n).toLocaleString() : '-';
const fmtK = n => n >= 1000 ? `$${(n/1000).toFixed(0)}k` : `$${n}`;

const STAGE_LABELS = {
  subscriber: 'Subscriber', lead: 'Lead', marketingqualifiedlead: 'MQL',
  salesqualifiedlead: 'SQL', opportunity: 'Opportunity', customer: 'Customer',
  evangelist: 'Evangelist', other: 'Other',
  appointmentscheduled: 'Appt Scheduled', qualifiedtobuy: 'Qualified to Buy',
  presentationscheduled: 'Presentation', decisionmakerboughtin: 'Decision Maker',
  contractsent: 'Contract Sent', closedwon: 'Closed Won', closedlost: 'Closed Lost',
};

function fmtStage(stage) {
  if (!stage) return 'Unknown';
  const key = stage.toLowerCase().replace(/[\s_-]+/g, '');
  if (STAGE_LABELS[key]) return STAGE_LABELS[key];
  return stage.replace(/([A-Z])/g, ' $1').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
}

const BAR_COLORS = ['#243A52', '#1B72C7', '#0091AE', '#2EBF9A', '#3DD6C7'];

function RevenueAtRiskChart({ stageBreakdown, selectedStage, onSelectStage }) {
  const data = stageBreakdown
    .filter(s => s.revenueAtRisk > 0)
    .sort((a, b) => b.revenueAtRisk - a.revenueAtRisk)
    .map(s => ({ name: fmtStage(s.stage), rawStage: s.stage, value: s.revenueAtRisk, count: s.count }));

  if (!data.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 100, color: '#aaa', fontSize: 12 }}>
        No revenue at risk by stage
      </div>
    );
  }

  const handleClick = (entry) => {
    if (!entry?.activePayload?.length) return;
    const stage = entry.activePayload[0].payload.rawStage;
    onSelectStage(selectedStage === stage ? null : stage);
  };

  return (
    <div style={{ width: '100%', height: Math.max(data.length * 48 + 16, 80) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 20, top: 4, bottom: 4 }} onClick={handleClick} style={{ cursor: 'pointer' }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 12, fill: '#555' }} axisLine={false} tickLine={false} />
          <Bar dataKey="value" radius={[0, 5, 5, 0]} maxBarSize={26} isAnimationActive={false}>
            <LabelList dataKey="value" position="right" formatter={v => `$${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} style={{ fontSize: 11, fill: '#666', fontWeight: 600 }} />
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={BAR_COLORS[i % BAR_COLORS.length]}
                opacity={selectedStage && selectedStage !== d.rawStage ? 0.3 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function StageAging({ days }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [selectedStage, setSelectedStage] = useState(null);

  useEffect(() => {
    api.getStageAging(days)
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [days]);

  if (loading) return <FunnelLoader variant="journey" size="md" label="Finding stuck records…" />;
  if (error) return <div style={{ background:'#F7F8FA', border:'1px solid #E2E5EA', borderRadius:10, padding:'14px 18px', color:'#555' }}>Error: {error}</div>;
  if (!data || data.total === 0) {
    return (
      <div style={{ background:'#F7F8FA', border:'1px solid #E2E5EA', borderRadius:10, padding:'2rem', textAlign:'center' }}>
        <div style={{ fontSize:15, fontWeight:700, color:'#0091AE', marginBottom:4 }}>No stuck deals right now</div>
        <div style={{ fontSize:13, color:'#666' }}>When deals or contacts sit in the same stage too long, they'll appear here ranked by revenue at risk.</div>
      </div>
    );
  }

  const byUrgency = filter === 'all' ? data.stuckRecords : data.stuckRecords.filter(r => r.urgency === filter);
  const filtered = selectedStage
    ? byUrgency.filter(r => (r.stageRaw || r.stage?.toLowerCase().replace(/\s/g, '')) === selectedStage)
    : byUrgency;

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
        <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'12px 14px' }}>
          <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Total Stuck</div>
          <div style={{ fontSize:22, fontWeight:700, color:'#111' }}>{data.total}</div>
        </div>
        <div style={{ background:'#F7F8FA', border:'1px solid #E2E5EA', borderRadius:10, padding:'12px 14px' }}>
          <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Critical</div>
          <div style={{ fontSize:22, fontWeight:700, color:'#243A52' }}>{data.critical}</div>
        </div>
        <div style={{ background:'#F7F8FA', border:'1px solid #E2E5EA', borderRadius:10, padding:'12px 14px' }}>
          <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>High</div>
          <div style={{ fontSize:22, fontWeight:700, color:'#243A52' }}>{data.high}</div>
        </div>
        <div style={{ background:'rgba(27,114,199,0.05)', border:'1px solid rgba(27,114,199,0.15)', borderRadius:10, padding:'12px 14px' }}>
          <div style={{ fontSize:10, color:'#1B72C7', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Revenue at Risk</div>
          <div style={{ fontSize:22, fontWeight:700, color:'#1B72C7' }}>{fmt(data.totalRevenueAtRisk)}</div>
        </div>
      </div>

      {/* By owner - who's on top of theirs, who's letting deals rot */}
      {data.byOwner?.length > 1 && (
        <div style={{ background: '#fff', border: '1px solid #E2E5EA', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 2 }}>At-risk by owner</div>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 12 }}>Who's staying on top of their pipeline - and who needs a nudge.</div>
          {data.byOwner.map((o, i) => {
            const maxCount = data.byOwner[0].count || 1;
            return (
              <div key={o.ownerId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: i < data.byOwner.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                <div style={{ width: 150, flexShrink: 0, fontSize: 13, fontWeight: 500, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.name}</div>
                <div style={{ flex: 1, height: 8, background: '#F0F1F4', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${(o.count / maxCount) * 100}%`, height: '100%', background: '#0091AE', borderRadius: 4 }} />
                </div>
                <div style={{ width: 60, textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#111', flexShrink: 0 }}>{o.count}</div>
                <div style={{ width: 70, textAlign: 'right', fontSize: 11, color: o.critical > 0 ? '#243A52' : '#aaa', flexShrink: 0 }}>{o.critical > 0 ? `${o.critical} crit` : '-'}</div>
                <div style={{ width: 80, textAlign: 'right', fontSize: 12, fontWeight: 600, color: o.revenueAtRisk > 0 ? '#1B72C7' : '#aaa', flexShrink: 0 }}>{o.revenueAtRisk > 0 ? fmtK(o.revenueAtRisk) : '-'}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stage breakdown table + Revenue at Risk chart side by side */}
      {data.stageBreakdown?.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '55% 1fr', gap: 12, marginBottom: 12 }}>
          {/* Left: table */}
          <div style={{ background: '#fff', border: '1px solid #E2E5EA', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 12 }}>Stuck by stage</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 72px 72px 90px', gap: 8, paddingBottom: 8, borderBottom: '1px solid #F3F4F6', marginBottom: 4 }}>
              {['Stage', 'Records', 'Avg Days', 'Revenue at Risk'].map(h => (
                <span key={h} style={{ fontSize: 10, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.06em', textAlign: h === 'Stage' ? 'left' : 'right' }}>{h}</span>
              ))}
            </div>
            {data.stageBreakdown.map((s, i) => (
              <div key={s.stage}
                onClick={() => setSelectedStage(selectedStage === s.stage ? null : s.stage)}
                style={{ display: 'grid', gridTemplateColumns: '1fr 72px 72px 90px', gap: 8, padding: '8px 6px', borderBottom: i < data.stageBreakdown.length - 1 ? '1px solid #F9FAFB' : 'none', alignItems: 'center', cursor: 'pointer', borderRadius: 6, background: selectedStage === s.stage ? '#F7F8FA' : 'transparent' }}>
                <span style={{ fontSize: 13, color: '#111', fontWeight: selectedStage === s.stage ? 700 : 500 }}>{fmtStage(s.stage)}</span>
                <span style={{ fontSize: 13, color: '#333', textAlign: 'right', fontWeight: 500 }}>{s.count}</span>
                <span style={{ fontSize: 13, color: s.avgDays > 30 ? '#1B72C7' : '#666', textAlign: 'right', fontWeight: s.avgDays > 30 ? 600 : 400 }}>{s.avgDays}d</span>
                <span style={{ fontSize: 13, color: s.revenueAtRisk > 0 ? '#0091AE' : '#999', textAlign: 'right', fontWeight: s.revenueAtRisk > 0 ? 700 : 400 }}>{fmt(s.revenueAtRisk)}</span>
              </div>
            ))}
          </div>

          {/* Right: chart */}
          <div style={{ background: '#fff', border: '1px solid #E2E5EA', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>Revenue at risk by stage</div>
              {selectedStage && (
                <button onClick={() => setSelectedStage(null)} style={{ fontSize: 10, color: '#3B82F6', background: '#EFF6FF', border: 'none', borderRadius: 5, padding: '2px 8px', cursor: 'pointer', fontWeight: 600 }}>
                  Clear filter ✕
                </button>
              )}
            </div>
            <RevenueAtRiskChart stageBreakdown={data.stageBreakdown} selectedStage={selectedStage} onSelectStage={setSelectedStage} />
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        {[{k:'all',l:`All (${data.total})`},{k:'critical',l:`Critical (${data.critical})`},{k:'high',l:`High (${data.high})`},{k:'medium',l:`Medium (${data.medium})`}].map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)}
            style={{ fontSize:11, padding:'4px 11px', borderRadius:14, border:`1px solid ${filter===f.k?'#111':'#E2E5EA'}`, background:filter===f.k?'#111':'#fff', color:filter===f.k?'#fff':'#666', cursor:'pointer', fontWeight:500 }}>
            {f.l}
          </button>
        ))}
        {selectedStage && (
          <span style={{ fontSize: 11, color: '#3B82F6', marginLeft: 4 }}>
            Filtered to: <strong>{fmtStage(selectedStage)}</strong>
            <button onClick={() => setSelectedStage(null)} style={{ marginLeft: 6, fontSize: 10, color: '#3B82F6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>✕</button>
          </span>
        )}
      </div>

      {/* Records list */}
      <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, overflow:'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr auto', gap: 12, padding: '8px 14px', background: '#F7F8FA', borderBottom: '1px solid #F3F4F6' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.06em' }}>Priority</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.06em' }}>Contact / Deal</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.06em' }}>HubSpot</span>
        </div>
        {filtered.slice(0, 50).map((r, i) => {
          const u = URGENCY[r.urgency] || URGENCY.medium;
          return (
            <div key={r.id} style={{ display:'flex', gap:12, padding:'12px 14px', borderBottom: i < Math.min(filtered.length, 50) - 1 ? '1px solid #F9FAFB' : 'none', alignItems:'flex-start' }}>
              <span style={{ fontSize:9, fontWeight:700, padding:'3px 7px', borderRadius:10, background:u.bg, color:u.text, border:`1px solid ${u.border}`, textTransform:'uppercase', letterSpacing:'.04em', flexShrink:0, minWidth:60, textAlign:'center', marginTop:2 }}>{u.label}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'#111', marginBottom:2 }}>{r.name}</div>
                <div style={{ fontSize:11, color:'#666' }}>
                  {fmtStage(r.stage)} · {r.daysInStage}d in stage · target {r.threshold}d
                  {r.revenueAtRisk ? <span style={{ color:'#1B72C7', fontWeight:600 }}> · {fmt(r.revenueAtRisk)} at risk</span> : null}
                </div>
                <div style={{ fontSize:11, color:u.text, marginTop:3, lineHeight:1.5 }}>{r.action}</div>
              </div>
              <a href={r.hubspotUrl} target="_blank" rel="noopener noreferrer"
                style={{ fontSize:11, fontWeight:600, color:'#FF7A59', textDecoration:'none', flexShrink:0, whiteSpace:'nowrap', marginTop:2 }}>
                Open →
              </a>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', fontSize: 13, color: '#888' }}>
            No records for this filter. {selectedStage && <button onClick={() => setSelectedStage(null)} style={{ color: '#3B82F6', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>Clear stage filter</button>}
          </div>
        )}
        {filtered.length > 50 && (
          <div style={{ padding:'10px 14px', textAlign:'center', fontSize:11, color:'#999', borderTop:'1px solid #F3F4F6' }}>
            Showing 50 of {filtered.length} records
          </div>
        )}
      </div>
    </div>
  );
}
