import React, { useState } from 'react';
import { api } from '../utils/api';

export default function TrialGate({ onDisconnect }) {
  const [loading, setLoading] = useState(false);

  const start = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await api.billingStartTrial();
      window.location.reload(); // App re-checks entitlement and lets them in
    } catch { setLoading(false); alert('Could not start your trial. Please try again in a moment.'); }
  };

  return (
    <div style={{ minHeight:'100vh', background:'#F7F8FA', display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <div style={{ maxWidth:440, width:'100%', textAlign:'center' }}>
        <div style={{ width:72, height:72, borderRadius:16, margin:'0 auto 20px', overflow:'hidden', boxShadow:'0 8px 20px -8px rgba(36,58,82,0.4)' }}>
          <img src="/pipechamp-icon.png" alt="PipeChamp" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} onError={e=>{e.target.style.display='none';}} />
        </div>
        <h1 style={{ margin:'0 0 6px', fontSize:28, fontWeight:800, color:'#111', letterSpacing:'-0.5px' }}>Start your free trial</h1>
        <p style={{ margin:'0 0 22px', fontSize:14, color:'#6B7280', lineHeight:1.6 }}>Get full access to PipeChamp for 14 days, then keep a free plan. No credit card required.</p>
        <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:14, padding:'28px 24px' }}>
          <div style={{ display:'flex', alignItems:'baseline', justifyContent:'center', gap:6, marginBottom:2 }}>
            <span style={{ fontSize:34, fontWeight:900, color:'#111', letterSpacing:'-0.03em' }}>$99</span>
            <span style={{ fontSize:14, color:'#6B7280' }}>/month after trial</span>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, justifyContent:'center', margin:'16px 0 22px' }}>
            {['Pipeline health score','Funnel analysis','Deal risk scoring','Revenue insights','PipeCoach AI'].map(f=>(
              <span key={f} style={{ fontSize:11, padding:'4px 12px', borderRadius:20, background:'#F7F8FA', color:'#555', border:'1px solid #E2E5EA' }}>{f}</span>
            ))}
          </div>
          <button onClick={start} disabled={loading} style={{ display:'block', width:'100%', background:'#F77333', color:'#fff', padding:'14px', borderRadius:8, border:'none', fontWeight:700, fontSize:14, cursor:'pointer', marginBottom:10, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Starting…' : 'Start free trial'}
          </button>
          <p style={{ fontSize:11, color:'#999', margin:0 }}>Cancel anytime · No credit card to start</p>
        </div>
        {onDisconnect && <button onClick={onDisconnect} style={{ marginTop:16, background:'transparent', border:'none', color:'#9CA3AF', fontSize:12, cursor:'pointer' }}>Sign out</button>}
      </div>
    </div>
  );
}
