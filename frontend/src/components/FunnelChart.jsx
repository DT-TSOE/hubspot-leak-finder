import React, { useState } from 'react';

const STAGE_COLORS = {
  Lead: '#1B72C7', MQL: '#0091AE', SQL: '#2EBF9A',
  Opportunity: '#243A52', Customer: '#2EBF9A',
};

export default function FunnelChart({ funnelStages, biggestLeak, stageContacts }) {
  const [open, setOpen] = useState(null); // stage key whose accounts are expanded
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
        const dropColor = dropPct === null ? null : dropPct > 60 ? '#E8562A' : dropPct > 35 ? '#1B72C7' : '#0091AE';
        const accounts = stageContacts?.[s.stage] || [];
        const canDrill = accounts.length > 0;
        const isOpen = open === s.stage;

        return (
          <div key={s.stage}>
            {/* Drop-off connector between stages */}
            {i > 0 && dropPct !== null && (
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 0 4px 2px', marginBottom:4 }}>
                <div style={{ width:2, height:16, background:`${dropColor}40`, borderRadius:1, marginLeft:6, flexShrink:0 }} />
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:dropColor }}>↓ {dropPct}% drop-off</span>
                  <span style={{ fontSize:11, color:'#999' }}>({s.dropOff?.toLocaleString()} left {prev.label})</span>
                  {isLeak && <span style={{ fontSize:10, background:'rgba(232,86,42,0.08)', color:'#E8562A', border:'1px solid rgba(232,86,42,0.3)', borderRadius:4, padding:'1px 7px', fontWeight:600 }}>Biggest leak</span>}
                </div>
              </div>
            )}

            {/* Stage bar (clickable to drill into accounts) */}
            <div style={{ marginBottom: i < funnelStages.length - 1 ? 4 : 0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                <span style={{ fontSize:13, fontWeight:600, color:'#111' }}>{s.label}</span>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ fontSize:12, color:'#888' }}>{s.count.toLocaleString()} contacts</span>
                  {i > 0 && (
                    <span style={{ fontSize:12, fontWeight:700, color: '#243A52' }}>
                      {s.conversionRate}% from {prev?.label}
                    </span>
                  )}
                </div>
              </div>
              <div onClick={() => canDrill && setOpen(isOpen ? null : s.stage)}
                title={canDrill ? 'Click to see these accounts' : undefined}
                style={{ height:28, borderRadius:6, background:'#F3F4F6', overflow:'hidden', border: isLeak ? '1.5px solid #F59E0B' : 'none', cursor: canDrill ? 'pointer' : 'default' }}>
                <div style={{ height:'100%', width:`${pct}%`, background: isLeak ? `${color}cc` : color, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'space-between', paddingLeft: pct > 12 ? 10 : 0, paddingRight: 8, transition:'width .6s ease', backgroundImage: isLeak ? `repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(255,255,255,.1) 6px, rgba(255,255,255,.1) 12px)` : 'none' }}>
                  {pct > 12 && <span style={{ fontSize:11, color:'rgba(255,255,255,.95)', fontWeight:700 }}>{Math.round(pct)}%</span>}
                  {canDrill && pct > 20 && <span style={{ fontSize:10, color:'rgba(255,255,255,.85)', fontWeight:600 }}>{isOpen ? 'hide ▲' : 'view accounts ▾'}</span>}
                </div>
              </div>

              {/* Drill-down: accounts that reached this stage */}
              {isOpen && (
                <div style={{ margin:'6px 0 10px', border:'1px solid #F3F4F6', borderRadius:8, overflow:'hidden' }}>
                  {accounts.slice(0, 50).map((a, j) => (
                    <a key={a.id} href={`https://app.hubspot.com/contacts/${a.id}`} target="_blank" rel="noopener noreferrer"
                      style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 12px', borderBottom: j < Math.min(accounts.length,50)-1 ? '1px solid #F9FAFB' : 'none', textDecoration:'none' }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12.5, fontWeight:600, color:'#111' }}>{a.name}{a.company ? <span style={{ color:'#999', fontWeight:400 }}> · {a.company}</span> : ''}</div>
                        {a.email && <div style={{ fontSize:11, color:'#888' }}>{a.email}</div>}
                      </div>
                      <span style={{ fontSize:11, fontWeight:600, color:'#FF7A59', flexShrink:0 }}>Open →</span>
                    </a>
                  ))}
                  {accounts.length >= 60 && <div style={{ padding:'8px 12px', fontSize:11, color:'#999', textAlign:'center' }}>Showing first 60 - narrow the date range to refine.</div>}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
