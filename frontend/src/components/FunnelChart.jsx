import React from 'react';
const COLORS = { Lead:'#4F6CF7', MQL:'#7C5CFC', SQL:'#A855F7', Opportunity:'#EC4899', Customer:'#10B981' };

export default function FunnelChart({ funnelStages, biggestLeak }) {
  if (!funnelStages?.length) return null;
  const max = funnelStages[0].count;
  return (
    <div>
      {funnelStages.map((s, i) => {
        const pct = max > 0 ? (s.count/max)*100 : 0;
        const isLeak = biggestLeak?.stage?.stage === s.stage;
        const color = COLORS[s.label] || '#6B7280';
        const rateColor = s.conversionRate < 25 ? '#EF4444' : s.conversionRate < 50 ? '#F59E0B' : '#059669';
        return (
          <div key={s.stage} style={{ marginBottom:10 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
              <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                <span style={{ fontSize:13, fontWeight:500, color:'#222', minWidth:90 }}>{s.label}</span>
                {isLeak && <span style={{ fontSize:10, background:'#FEF3C7', color:'#92400E', border:'1px solid #F59E0B', borderRadius:4, padding:'1px 7px', fontWeight:600 }}>Biggest leak</span>}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <span style={{ fontSize:12, color:'#999' }}>{s.count.toLocaleString()}</span>
                {i>0 && <span style={{ fontSize:13, fontWeight:600, color:rateColor, minWidth:42, textAlign:'right' }}>{s.conversionRate}%</span>}
              </div>
            </div>
            <div style={{ height:32, borderRadius:6, background:'#F3F4F6', overflow:'hidden', border: isLeak ? '1.5px solid #F59E0B' : '1px solid transparent' }}>
              <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:6, display:'flex', alignItems:'center', paddingLeft:pct>15?10:0, transition:'width .6s ease' }}>
                {pct>15 && <span style={{ fontSize:11, color:'rgba(255,255,255,.9)', fontWeight:600 }}>{Math.round(pct)}%</span>}
              </div>
            </div>
            {i>0 && s.dropOff>0 && <div style={{ fontSize:11, color:isLeak?'#EF4444':'#999', marginTop:3, paddingLeft:2, fontWeight:isLeak?500:400 }}>↓ {s.dropOff.toLocaleString()} dropped off{isLeak?' — highest loss stage':''}</div>}
          </div>
        );
      })}
    </div>
  );
}
