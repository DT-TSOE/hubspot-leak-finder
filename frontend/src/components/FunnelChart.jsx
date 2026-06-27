import React from 'react';

const STAGE_COLORS = {
  Lead: '#6366F1', MQL: '#8B5CF6', SQL: '#A855F7',
  Opportunity: '#EC4899', Customer: '#10B981',
};

export default function FunnelChart({ funnelStages, biggestLeak }) {
  if (!funnelStages?.length) return null;
  const max = funnelStages[0].count;

  return (
    <div>
      {funnelStages.map((s, i) => {
        const pct = max > 0 ? (s.count / max) * 100 : 0;
        const isLeak = biggestLeak?.stage?.stage === s.stage;
        const color = STAGE_COLORS[s.label] || '#6B7280';
        const prev = funnelStages[i - 1];
        const dropPct = prev ? Math.round(((prev.count - s.count) / prev.count) * 100) : null;
        const dropColor = dropPct === null ? null : dropPct > 60 ? '#EF4444' : dropPct > 35 ? '#F59E0B' : '#10B981';

        return (
          <div key={s.stage}>
            {/* Drop-off connector between stages */}
            {i > 0 && dropPct !== null && (
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 0 4px 2px', marginBottom:4 }}>
                <div style={{ width:2, height:16, background:`${dropColor}40`, borderRadius:1, marginLeft:6, flexShrink:0 }} />
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:dropColor }}>↓ {dropPct}% drop-off</span>
                  <span style={{ fontSize:11, color:'#999' }}>({s.dropOff?.toLocaleString()} left {prev.label})</span>
                  {isLeak && <span style={{ fontSize:10, background:'#FEF3C7', color:'#92400E', border:'1px solid #F59E0B', borderRadius:4, padding:'1px 7px', fontWeight:600 }}>Biggest leak</span>}
                </div>
              </div>
            )}

            {/* Stage bar */}
            <div style={{ marginBottom: i < funnelStages.length - 1 ? 4 : 0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                <span style={{ fontSize:13, fontWeight:600, color:'#111' }}>{s.label}</span>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ fontSize:12, color:'#888' }}>{s.count.toLocaleString()} contacts</span>
                  {i > 0 && (
                    <span style={{ fontSize:12, fontWeight:700, color: s.conversionRate < 25 ? '#EF4444' : s.conversionRate < 50 ? '#F59E0B' : '#059669' }}>
                      {s.conversionRate}% from {prev?.label}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ height:28, borderRadius:6, background:'#F3F4F6', overflow:'hidden', border: isLeak ? '1.5px solid #F59E0B' : 'none' }}>
                <div style={{ height:'100%', width:`${pct}%`, background: isLeak ? `${color}cc` : color, borderRadius:6, display:'flex', alignItems:'center', paddingLeft: pct > 12 ? 10 : 0, transition:'width .6s ease', backgroundImage: isLeak ? `repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(255,255,255,.1) 6px, rgba(255,255,255,.1) 12px)` : 'none' }}>
                  {pct > 12 && <span style={{ fontSize:11, color:'rgba(255,255,255,.95)', fontWeight:700 }}>{Math.round(pct)}%</span>}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
