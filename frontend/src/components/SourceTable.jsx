import React from 'react';
export default function SourceTable({ sources }) {
  if (!sources?.length) return <p style={{ fontSize:13, color:'#999', fontStyle:'italic' }}>Not enough closed deal data yet.</p>;
  const max = Math.max(...sources.map(s=>s.winRate));
  return (
    <div>
      {sources.map((s,i)=>(
        <div key={s.source} style={{ marginBottom:9 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
            <span style={{ fontSize:13, fontWeight:500, color:'#222' }}>{s.source||'Unknown'}</span>
            <span style={{ fontSize:13, color:'#999' }}>{s.won}/{s.total} · <span style={{ fontWeight:600, color:s.winRate>40?'#059669':s.winRate>20?'#F59E0B':'#EF4444' }}>{s.winRate}%</span></span>
          </div>
          <div style={{ height:7, borderRadius:4, background:'#F3F4F6', overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${(s.winRate/max)*100}%`, background:i===0?'#10B981':'#9CA3AF', borderRadius:4, transition:'width .5s' }}/>
          </div>
        </div>
      ))}
    </div>
  );
}
