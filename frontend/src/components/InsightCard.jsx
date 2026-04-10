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
    <div style={{ border:`1px solid ${sev.border}`, borderRadius:10, background:sev.bg, padding:'13px 16px', marginBottom:10, cursor:'pointer' }} onClick={() => setExp(!exp)}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:4 }}>
            <span style={{ fontSize:10, fontWeight:600, color:sev.badge, background:sev.badgeBg, padding:'2px 8px', borderRadius:4 }}>{insight.type}</span>
            <span style={{ fontSize:10, color:sev.badge, background:sev.badgeBg, padding:'2px 8px', borderRadius:4 }}>{sev.label}</span>
            {insight.metric && <span style={{ fontSize:10, color:'#555', background:'rgba(255,255,255,.6)', padding:'2px 8px', borderRadius:4, marginLeft:'auto' }}>{insight.metric.label}: <strong>{insight.metric.value}</strong></span>}
          </div>
          <p style={{ margin:0, fontSize:14, fontWeight:500, color:'#111', lineHeight:1.4 }}>{insight.title}</p>
        </div>
        <span style={{ fontSize:17, color:'#aaa', transform:exp?'rotate(90deg)':'rotate(0)', transition:'transform .2s', flexShrink:0, marginTop:2 }}>›</span>
      </div>

      {exp && (
        <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${sev.border}` }}>
          {/* Supporting data */}
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color:'#999', marginBottom:4 }}>What the data shows</div>
            <p style={{ margin:0, fontSize:13, color:'#333', lineHeight:1.6 }}>{insight.dataPoint}</p>
          </div>

          {/* Recommended action */}
          <div style={{ background:'rgba(255,255,255,.8)', borderRadius:8, padding:'11px 13px', border:`1px solid ${sev.border}`, marginBottom: insight.hubspotSteps?.length ? 10 : 0 }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color:sev.badge, marginBottom:4 }}>Recommended action</div>
            <p style={{ margin:0, fontSize:13, color:'#333', lineHeight:1.6 }}>{insight.action}</p>
          </div>

          {/* HubSpot step-by-step */}
          {insight.hubspotSteps?.length > 0 && (
            <div style={{ background:'#fff', borderRadius:8, padding:'11px 13px', border:'1px solid #E2E5EA' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                <div style={{ width:18, height:18, borderRadius:4, background:'#FF7A59', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <span style={{ fontSize:10, color:'#fff', fontWeight:700 }}>HS</span>
                </div>
                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color:'#FF7A59' }}>Steps in HubSpot</div>
              </div>
              {insight.hubspotSteps.map((step, i) => (
                <div key={i} style={{ display:'flex', gap:8, marginBottom:6, alignItems:'flex-start' }}>
                  <div style={{ width:18, height:18, borderRadius:'50%', background:'#F3F4F6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'#555', flexShrink:0, marginTop:1 }}>{i+1}</div>
                  <span style={{ fontSize:12, color:'#444', lineHeight:1.55 }}>{step}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
