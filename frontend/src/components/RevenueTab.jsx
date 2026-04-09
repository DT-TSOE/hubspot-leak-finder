import React from 'react';
const fmt = n => n != null ? '$'+Math.round(n).toLocaleString() : 'N/A';

export default function RevenueTab({ data, loading }) {
  if (loading) return <div style={{ textAlign:'center', padding:'3rem', color:'#888', fontSize:13 }}>Loading revenue data…</div>;
  if (!data || data.insufficient) return (
    <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'2rem', textAlign:'center' }}>
      <div style={{ fontSize:28, marginBottom:12 }}>📊</div>
      <div style={{ fontSize:15, fontWeight:600, color:'#111', marginBottom:6 }}>Not enough closed deals yet</div>
      <div style={{ fontSize:13, color:'#888', maxWidth:320, margin:'0 auto', lineHeight:1.6 }}>Once you have at least 3 closed-won deals with amounts logged in HubSpot, revenue insights will appear here.</div>
    </div>
  );
  return (
    <>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:12 }}>
        {[{label:'Total Revenue',value:fmt(data.overview.totalRevenue),color:'#059669'},{label:'Avg Deal Size',value:fmt(data.overview.avgDealSize),color:'#111'},{label:'Closed-Won Deals',value:data.overview.totalWonDeals,color:'#FF7A59'}].map(m=>(
          <div key={m.label} style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'13px 16px', textAlign:'center' }}>
            <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:4 }}>{m.label}</div>
            <div style={{ fontSize:22, fontWeight:700, color:m.color }}>{m.value}</div>
          </div>
        ))}
      </div>
      {data.ltvBySource?.length > 0 && (
        <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'14px 16px', marginBottom:10 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#111', marginBottom:12 }}>Average deal size by source</div>
          {data.ltvBySource.map((s,i)=>(
            <div key={s.source} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:i<data.ltvBySource.length-1?'1px solid #F9F9F9':'none' }}>
              <div><div style={{ fontSize:13, fontWeight:500, color:'#222' }}>{s.source}</div><div style={{ fontSize:11, color:'#999' }}>{s.dealCount} deals · {fmt(s.totalRevenue)} total</div></div>
              <div style={{ fontSize:15, fontWeight:700, color:i===0?'#059669':'#333' }}>{fmt(s.avgDealSize)}</div>
            </div>
          ))}
        </div>
      )}
      {data.repPerformance?.length > 0 && (
        <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'14px 16px' }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#111', marginBottom:12 }}>Rep performance</div>
          {data.repPerformance.map((r,i)=>(
            <div key={r.ownerId} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:i<data.repPerformance.length-1?'1px solid #F9F9F9':'none' }}>
              <div><div style={{ fontSize:13, fontWeight:500, color:'#222' }}>Rep #{r.ownerId.slice(-6)}</div><div style={{ fontSize:11, color:'#999' }}>{r.won} won · {r.lost} lost</div></div>
              <div style={{ fontSize:15, fontWeight:700, color:i===0?'#059669':'#333' }}>{r.winRate}%</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
