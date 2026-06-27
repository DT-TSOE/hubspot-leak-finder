import React from 'react';

export default function IntegrationHint({ icon, name, unlocks, onConnect }) {
  return (
    <div style={{ background:'#F8F9FF', border:'1px solid #E0E4FF', borderRadius:10, padding:'12px 14px', display:'flex', alignItems:'center', gap:12, marginTop:14 }}>
      <div style={{ fontSize:22, flexShrink:0 }}>{icon}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'#6366F1', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:2 }}>
          Connect {name} to unlock
        </div>
        <div style={{ fontSize:12, color:'#555' }}>{unlocks}</div>
      </div>
      <button onClick={onConnect}
        style={{ fontSize:11, fontWeight:700, padding:'6px 14px', borderRadius:7, border:'none', background:'#6366F1', color:'#fff', cursor:'pointer', flexShrink:0, whiteSpace:'nowrap' }}>
        Set up →
      </button>
    </div>
  );
}
