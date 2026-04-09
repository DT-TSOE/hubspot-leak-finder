import React from 'react';
export default function StageTimingTable({ stageTimes }) {
  if (!stageTimes || !Object.keys(stageTimes).length) return <p style={{ fontSize:13, color:'#999', fontStyle:'italic' }}>Not enough stage transition data yet.</p>;
  const rows = Object.values(stageTimes);
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
        <thead><tr style={{ borderBottom:'1px solid #F3F4F6' }}>{['Transition','Median','Mean','Sample'].map(h=><th key={h} style={{ textAlign:'left', padding:'7px 10px', fontSize:11, fontWeight:600, color:'#999', textTransform:'uppercase', letterSpacing:'.05em' }}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r,i)=>(
            <tr key={i} style={{ borderBottom:'1px solid #F9FAFB' }}>
              <td style={{ padding:'9px 10px', fontWeight:500, color:'#222' }}>{r.from} → {r.to}</td>
              <td style={{ padding:'9px 10px', color:r.medianDays>30?'#EF4444':r.medianDays>14?'#F59E0B':'#059669', fontWeight:600 }}>{r.medianDays}d</td>
              <td style={{ padding:'9px 10px', color:'#999' }}>{r.meanDays}d</td>
              <td style={{ padding:'9px 10px', color:'#999' }}>{r.sampleSize}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
