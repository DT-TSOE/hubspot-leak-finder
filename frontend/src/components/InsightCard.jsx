import React, { useState } from 'react';

const SEV = {
  high:   { bg:'#FEF2F2', border:'#FECACA', badge:'#DC2626', badgeBg:'#FEE2E2', label:'High priority' },
  medium: { bg:'#FFFBEB', border:'#FDE68A', badge:'#D97706', badgeBg:'#FEF3C7', label:'Medium priority' },
  low:    { bg:'#F0FDF4', border:'#BBF7D0', badge:'#059669', badgeBg:'#DCFCE7', label:'Low priority' },
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
        <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${sev.border}` }}>
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color:'#999', marginBottom:4 }}>What the data shows</div>
            <p style={{ margin:0, fontSize:13, color:'#333', lineHeight:1.6 }}>{insight.dataPoint}</p>
          </div>

          <div style={{ background:'rgba(255,255,255,.8)', borderRadius:8, padding:'11px 13px', border:`1px solid ${sev.border}`, marginBottom:10 }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color:sev.badge, marginBottom:4 }}>Recommended action</div>
            <p style={{ margin:0, fontSize:13, color:'#333', lineHeight:1.6 }}>{insight.action}</p>
          </div>

          {/* PipeCoach CTA — replaces static HubSpot steps */}
          <button
            onClick={e => { e.stopPropagation(); openPipeCoach(insight); }}
            style={{ width:'100%', display:'flex', alignItems:'center', gap:10, background:'#111', border:'none', borderRadius:8, padding:'11px 14px', cursor:'pointer', textAlign:'left' }}>
            <div style={{ width:28, height:28, borderRadius:7, overflow:'hidden', border:'2px solid #4CAF50', flexShrink:0 }}>
              <img src="/pipecoach.png" alt="PipeCoach" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top center' }}
                onError={e => { e.target.style.display='none'; e.target.parentElement.innerHTML='<span style="font-size:14px;display:flex;align-items:center;justify-content:center;height:100%;color:#fff">PC</span>'; }} />
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#4CAF50', letterSpacing:'.04em', marginBottom:1 }}>ASK PIPECOACH</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,.75)' }}>Get step-by-step HubSpot instructions for this issue</div>
            </div>
            <span style={{ color:'#4CAF50', fontSize:16 }}>→</span>
          </button>
        </div>
      )}
    </div>
  );
}
