import React, { useState } from 'react';
const SEV = {
  high:   { bg:'#FEF2F2', border:'#FECACA', badge:'#DC2626', badgeBg:'#FEE2E2', label:'High priority' },
  medium: { bg:'#FFFBEB', border:'#FDE68A', badge:'#D97706', badgeBg:'#FEF3C7', label:'Medium priority' },
  low:    { bg:'#F0FDF4', border:'#BBF7D0', badge:'#059669', badgeBg:'#DCFCE7', label:'Low priority' },
};
export default function InsightCard({ insight }) {
  const [exp, setExp] = useState(false);
  const sev = SEV[insight.severity] || SEV.low;
  return (
    <div onClick={()=>setExp(!exp)} style={{ border:`1px solid ${sev.border}`, borderRadius:10, background:sev.bg, padding:'13px 16px', marginBottom:10, cursor:'pointer' }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:4 }}>
            <span style={{ fontSize:10, fontWeight:600, color:sev.badge, background:sev.badgeBg, padding:'2px 8px', borderRadius:4 }}>{insight.type}</span>
            <span style={{ fontSize:10, color:sev.badge, background:sev.badgeBg, padding:'2px 8px', borderRadius:4 }}>{sev.label}</span>
          </div>
          <p style={{ margin:0, fontSize:14, fontWeight:500, color:'#111', lineHeight:1.4 }}>{insight.title}</p>
        </div>
        <span style={{ fontSize:17, color:'#aaa', transform:exp?'rotate(90deg)':'rotate(0)', transition:'transform .2s', flexShrink:0, marginTop:2 }}>›</span>
      </div>
      {exp && (
        <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${sev.border}` }}>
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color:'#999', marginBottom:3 }}>Supporting data</div>
            <p style={{ margin:0, fontSize:13, color:'#333', lineHeight:1.55 }}>{insight.dataPoint}</p>
          </div>
          <div style={{ background:'rgba(255,255,255,.7)', borderRadius:7, padding:'10px 12px', border:`1px solid ${sev.border}` }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color:sev.badge, marginBottom:3 }}>Recommended action</div>
            <p style={{ margin:0, fontSize:13, color:'#333', lineHeight:1.55 }}>{insight.action}</p>
          </div>
        </div>
      )}
    </div>
  );
}
