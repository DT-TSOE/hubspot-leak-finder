import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';

const URGENCY = {
  critical: { bg:'#FEF2F2', border:'#FECACA', text:'#DC2626', label:'Critical' },
  high: { bg:'#FFFBEB', border:'#FDE68A', text:'#D97706', label:'High' },
  medium: { bg:'#FFFBEB', border:'#FDE68A', text:'#92400E', label:'Medium' },
};

const fmt = n => n != null ? '$' + Math.round(n).toLocaleString() : '—';

export default function StageAging() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.getStageAging()
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return <div style={{ textAlign:'center', padding:'4rem', color:'#888', fontSize:14 }}>Finding stuck records…</div>;
  if (error) return <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'14px 18px', color:'#DC2626' }}>Error: {error}</div>;
  if (!data || data.total === 0) {
    return (
      <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:10, padding:'2rem', textAlign:'center' }}>
        <div style={{ fontSize:28, marginBottom:12 }}>✅</div>
        <div style={{ fontSize:15, fontWeight:600, color:'#059669', marginBottom:6 }}>No stuck records — your pipeline is moving</div>
        <div style={{ fontSize:13, color:'#666', maxWidth:380, margin:'0 auto', lineHeight:1.6 }}>Every active contact and deal is within healthy stage thresholds. Keep it up.</div>
      </div>
    );
  }

  const filtered = filter === 'all' ? data.stuckRecords : data.stuckRecords.filter(r => r.urgency === filter);

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
        <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'12px 14px' }}>
          <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Total Stuck</div>
          <div style={{ fontSize:22, fontWeight:700, color:'#111' }}>{data.total}</div>
        </div>
        <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'12px 14px' }}>
          <div style={{ fontSize:10, color:'#DC2626', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Critical</div>
          <div style={{ fontSize:22, fontWeight:700, color:'#DC2626' }}>{data.critical}</div>
        </div>
        <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:10, padding:'12px 14px' }}>
          <div style={{ fontSize:10, color:'#D97706', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>High</div>
          <div style={{ fontSize:22, fontWeight:700, color:'#D97706' }}>{data.high}</div>
        </div>
        <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'12px 14px' }}>
          <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Revenue at Risk</div>
          <div style={{ fontSize:22, fontWeight:700, color:'#111' }}>{fmt(data.totalRevenueAtRisk)}</div>
        </div>
      </div>

      {/* Stage breakdown */}
      {data.stageBreakdown?.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #E2E5EA', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 10 }}>Stuck by stage</div>
          {data.stageBreakdown.map(s => (
            <div key={s.stage} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom: '1px solid #F9FAFB' }}>
              <span style={{ fontSize:13, color:'#111', fontWeight:500 }}>{s.stage}</span>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <span style={{ fontSize:12, color:'#666' }}>{s.count} stuck</span>
                <span style={{ fontSize:12, color:'#999' }}>·</span>
                <span style={{ fontSize:12, color:'#666' }}>{s.avgDays}d avg</span>
                {s.revenueAtRisk > 0 && <><span style={{ fontSize:12, color:'#999' }}>·</span><span style={{ fontSize:12, color:'#DC2626', fontWeight:600 }}>{fmt(s.revenueAtRisk)}</span></>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div style={{ display:'flex', gap:6, marginBottom:10 }}>
        {[{k:'all',l:`All (${data.total})`},{k:'critical',l:`Critical (${data.critical})`},{k:'high',l:`High (${data.high})`},{k:'medium',l:`Medium (${data.medium})`}].map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)}
            style={{ fontSize:11, padding:'4px 11px', borderRadius:14, border:`1px solid ${filter===f.k?'#111':'#E2E5EA'}`, background:filter===f.k?'#111':'#fff', color:filter===f.k?'#fff':'#666', cursor:'pointer', fontWeight:500 }}>
            {f.l}
          </button>
        ))}
      </div>

      {/* Stuck records table */}
      <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, overflow:'hidden' }}>
        {filtered.slice(0, 50).map((r, i) => {
          const u = URGENCY[r.urgency] || URGENCY.medium;
          return (
            <div key={r.id} style={{ display:'flex', gap:12, padding:'12px 14px', borderBottom: i < filtered.length - 1 ? '1px solid #F9FAFB' : 'none', alignItems:'center' }}>
              <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:10, background:u.bg, color:u.text, border:`1px solid ${u.border}`, textTransform:'uppercase', letterSpacing:'.04em', flexShrink:0, minWidth:60, textAlign:'center' }}>{u.label}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'#111', marginBottom:2 }}>{r.name}</div>
                <div style={{ fontSize:11, color:'#666' }}>
                  {r.stage} · {r.daysInStage} days in stage ({r.overFactor}× threshold)
                  {r.revenueAtRisk && ` · ${fmt(r.revenueAtRisk)} at risk`}
                </div>
                <div style={{ fontSize:11, color:u.text, marginTop:3 }}>{r.action}</div>
              </div>
              <a href={r.hubspotUrl} target="_blank" rel="noopener noreferrer"
                style={{ fontSize:11, fontWeight:600, color:'#FF7A59', textDecoration:'none', flexShrink:0 }}>
                Open in HubSpot →
              </a>
            </div>
          );
        })}
        {filtered.length > 50 && (
          <div style={{ padding:'10px 14px', textAlign:'center', fontSize:11, color:'#999', borderTop:'1px solid #F3F4F6' }}>
            Showing 50 of {filtered.length} records
          </div>
        )}
      </div>
    </div>
  );
}
