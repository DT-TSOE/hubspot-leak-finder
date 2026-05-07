import React from 'react';
export default function ConnectPage() {
  return (
    <div style={{ minHeight:'100vh', background:'#F7F8FA', display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <div style={{ maxWidth:420, width:'100%', textAlign:'center' }}>
        <div style={{ width:72, height:72, borderRadius:16, background:'#F0FBF0', border:'2px solid #C8E6C9', margin:'0 auto 20px', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <img src="/el-pipeador.png" alt="PipeChamp" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top center' }} onError={e=>{e.target.style.display='none'; e.target.parentElement.innerHTML='🤼';}} />
        </div>
        <h1 style={{ margin:'0 0 6px', fontSize:28, fontWeight:800, color:'#111', letterSpacing:'-0.5px' }}>PipeChamp</h1>
        <p style={{ margin:'0 0 20px', fontSize:11, color:'#43A047', letterSpacing:4, textTransform:'uppercase' }}>Find the leaks. Fix them fast.</p>
        <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:14, padding:'28px 24px' }}>
          <p style={{ margin:'0 0 20px', fontSize:14, color:'#666', lineHeight:1.65 }}>Connect your HubSpot account and PipeChamp will identify exactly where your pipeline is leaking revenue — and tell you exactly how to fix it.</p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, justifyContent:'center', marginBottom:22 }}>
            {['Funnel leak detection','Lead risk scoring','Revenue insights','Ask La Jefa AI'].map(f=>(
              <span key={f} style={{ fontSize:11, padding:'4px 12px', borderRadius:20, background:'#F7F8FA', color:'#555', border:'1px solid #E2E5EA' }}>{f}</span>
            ))}
          </div>
          <a href={`${process.env.REACT_APP_API_URL || ''}/auth/connect`} style={{ display:'block', background:'#FF7A59', color:'#fff', padding:'14px', borderRadius:8, textDecoration:'none', fontWeight:700, fontSize:14, marginBottom:10 }}
            onMouseOver={e=>e.currentTarget.style.opacity='.9'} onMouseOut={e=>e.currentTarget.style.opacity='1'}>
            Connect HubSpot
          </a>
          <p style={{ fontSize:11, color:'#999', margin:0 }}>Read-only access · No data stored permanently</p>
        </div>
      </div>
    </div>
  );
}
