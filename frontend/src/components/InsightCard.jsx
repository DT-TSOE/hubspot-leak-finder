import React, { useState } from 'react';

const SEV = {
  high:   { bg:'#FFFFFF', border:'#E2E5EA', badge:'#243A52', badgeBg:'rgba(36,58,82,0.07)', label:'High priority' },
  medium: { bg:'#FFFFFF', border:'#E2E5EA', badge:'#1B72C7', badgeBg:'rgba(27,114,199,0.07)', label:'Medium priority' },
  low:    { bg:'#FFFFFF', border:'#E2E5EA', badge:'#0091AE', badgeBg:'rgba(0,145,174,0.07)', label:'Low priority' },
};

function openPipeCoach(insight) {
  const message = `I'm looking at this pipeline issue: "${insight.title}". The data shows: ${insight.dataPoint} What are the step-by-step actions I should take in HubSpot to fix this?`;
  window.dispatchEvent(new CustomEvent('pipecoach:open', { detail: { message } }));
}

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
        <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid #F3F4F6' }}>
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color:'#999', marginBottom:4 }}>What the data shows</div>
            <p style={{ margin:0, fontSize:13, color:'#333', lineHeight:1.6 }}>{insight.dataPoint}</p>
          </div>

          <div style={{ background:'rgba(255,255,255,.8)', borderRadius:8, padding:'11px 13px', border:`1px solid ${sev.border}`, marginBottom:10 }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color:sev.badge, marginBottom:4 }}>Recommended action</div>
            <p style={{ margin:0, fontSize:13, color:'#333', lineHeight:1.6 }}>{insight.action}</p>
          </div>

          {/* PipeCoach CTA - compact right-aligned button */}
          <div style={{ display:'flex', justifyContent:'flex-end', marginTop:10 }}>
            <button
              onClick={e => { e.stopPropagation(); openPipeCoach(insight); }}
              style={{ display:'flex', alignItems:'center', gap:7, background:'#111', border:'none', borderRadius:8, padding:'8px 14px', cursor:'pointer' }}>
              <span style={{ fontSize:12, fontWeight:700, color:'#fff' }}>Ask PipeCoach how to fix this</span>
              <span style={{ color:'#4CAF50', fontSize:13 }}>→</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
