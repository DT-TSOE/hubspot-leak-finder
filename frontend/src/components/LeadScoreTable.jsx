import React, { useState } from 'react';
const RISK = { high:{bg:'#FEF2F2',text:'#DC2626',border:'#FECACA',label:'High Risk'}, medium:{bg:'#FFFBEB',text:'#D97706',border:'#FDE68A',label:'Medium Risk'}, low:{bg:'#F0FDF4',text:'#059669',border:'#BBF7D0',label:'Low Risk'} };

export default function LeadScoreTable({ leads }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  if (!leads?.length) return <p style={{ fontSize:13, color:'#999', fontStyle:'italic' }}>No active leads to score.</p>;
  const counts = { high:leads.filter(l=>l.risk==='high').length, medium:leads.filter(l=>l.risk==='medium').length, low:leads.filter(l=>l.risk==='low').length };
  const filtered = leads.filter(l => {
    if (filter!=='all' && l.risk!==filter) return false;
    if (search && !l.name.toLowerCase().includes(search.toLowerCase()) && !l.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div style={{ display:'flex', gap:7, marginBottom:12, flexWrap:'wrap' }}>
        {['all','high','medium','low'].map(f => {
          const s = f==='all' ? null : RISK[f];
          return (
            <button key={f} onClick={()=>setFilter(f)} style={{ padding:'4px 12px', borderRadius:20, border:`1px solid ${filter===f?(s?.border||'#333'):'#E2E5EA'}`, background:filter===f?(s?.bg||'#F3F4F6'):'transparent', color:filter===f?(s?.text||'#111'):'#888', fontSize:11, fontWeight:500, cursor:'pointer' }}>
              {f==='all'?`All (${leads.length})`:`${RISK[f].label} (${counts[f]})`}
            </button>
          );
        })}
        <input type="text" placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)} style={{ marginLeft:'auto', padding:'4px 11px', borderRadius:7, border:'1px solid #E2E5EA', fontSize:11, background:'#fff', color:'#333', width:180 }}/>
      </div>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
          <thead><tr style={{ borderBottom:'1px solid #F3F4F6' }}>{['Contact','Stage','Score','Days in Stage','Touches','Flags'].map(h=><th key={h} style={{ textAlign:'left', padding:'7px 8px', fontSize:10, fontWeight:600, color:'#999', textTransform:'uppercase', letterSpacing:'.04em' }}>{h}</th>)}</tr></thead>
          <tbody>
            {filtered.slice(0,50).map(l => {
              const s = RISK[l.risk];
              return (
                <tr key={l.id} style={{ borderBottom:'0.5px solid #F9FAFB' }}>
                  <td style={{ padding:'9px 8px' }}><div style={{ fontWeight:500, color:'#111' }}>{l.name}</div><div style={{ fontSize:10, color:'#999' }}>{l.email}</div></td>
                  <td style={{ padding:'9px 8px', color:'#666' }}>{l.stage}</td>
                  <td style={{ padding:'9px 8px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                      <div style={{ width:34, height:34, borderRadius:'50%', background:s.bg, border:`2px solid ${s.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:s.text }}>{l.score}</div>
                      <span style={{ fontSize:10, color:s.text, fontWeight:500 }}>{s.label}</span>
                    </div>
                  </td>
                  <td style={{ padding:'9px 8px', color:l.daysInStage>30?'#EF4444':'#666' }}>{l.daysInStage}d</td>
                  <td style={{ padding:'9px 8px', color:l.touches===0?'#EF4444':'#666' }}>{l.touches}</td>
                  <td style={{ padding:'9px 8px' }}>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
                      {l.flags.map((f,i)=><span key={i} style={{ fontSize:10, padding:'2px 6px', borderRadius:4, background:s.bg, color:s.text, border:`1px solid ${s.border}` }}>{f}</span>)}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length>50 && <p style={{ fontSize:11, color:'#999', textAlign:'center', marginTop:8 }}>Showing 50 of {filtered.length}. Export CSV to see all.</p>}
      </div>
    </div>
  );
}
