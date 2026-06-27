import React from 'react';

// Mock blurred preview rows
function MockRow({ wide }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
      <div style={{ height:8, borderRadius:4, background:'#E2E5EA', width: wide ? '55%' : '35%' }} />
      <div style={{ height:8, borderRadius:4, background:'#E2E5EA', width:'20%', marginLeft:'auto' }} />
      <div style={{ height:8, borderRadius:4, background:'#E2E5EA', width:'18%' }} />
    </div>
  );
}

function MockBars({ count = 3 }) {
  const heights = [80, 55, 35].slice(0, count);
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:48, paddingTop:8 }}>
      {heights.map((h, i) => (
        <div key={i} style={{ flex:1, height:`${h}%`, borderRadius:'3px 3px 0 0', background: i === 0 ? '#C7D2FE' : '#E0E7FF' }} />
      ))}
    </div>
  );
}

export default function IntegrationHint({ icon, name, feature, benefit, onConnect, preview = 'rows' }) {
  return (
    <div style={{ border:'1px solid #E0E4FF', borderRadius:10, overflow:'hidden', marginTop:14, background:'#fff' }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr auto' }}>

        {/* Left: blurred preview */}
        <div style={{ padding:'14px 16px', borderRight:'1px solid #F0F0F8', position:'relative', overflow:'hidden', minHeight:88 }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#6366F1', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:10 }}>
            {feature}
          </div>
          <div style={{ filter:'blur(3px)', opacity:0.5, userSelect:'none', pointerEvents:'none' }}>
            {preview === 'bars' ? <MockBars /> : <><MockRow wide /><MockRow /><MockRow wide={false} /></>}
          </div>
          {/* Gradient overlay */}
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(to right, transparent 30%, rgba(255,255,255,0.9) 80%)', pointerEvents:'none' }} />
        </div>

        {/* Right: connect prompt */}
        <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', justifyContent:'center', gap:8, minWidth:220 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:18 }}>{icon}</span>
            <span style={{ fontSize:12, fontWeight:700, color:'#111' }}>{name}</span>
          </div>
          <div style={{ fontSize:12, color:'#555', lineHeight:1.55 }}>{benefit}</div>
          <button onClick={onConnect}
            style={{ alignSelf:'flex-start', fontSize:11, fontWeight:700, padding:'6px 14px', borderRadius:7, border:'none', background:'#6366F1', color:'#fff', cursor:'pointer', marginTop:2 }}>
            Connect to unlock →
          </button>
        </div>
      </div>
    </div>
  );
}
