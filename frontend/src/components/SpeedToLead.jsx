import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { api } from '../utils/api';

const URGENCY = {
  critical: { bg:'#FEF2F2', border:'#FECACA', text:'#DC2626', label:'Critical' },
  high:     { bg:'#FFFBEB', border:'#FDE68A', text:'#D97706', label:'High' },
  medium:   { bg:'#FFFBEB', border:'#FDE68A', text:'#92400E', label:'Medium' },
  low:      { bg:'#F0FDF4', border:'#BBF7D0', text:'#059669', label:'Low' },
};

const fmtH = h => {
  if (h == null) return '—';
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 24) return `${Math.round(h)}h`;
  return `${Math.round(h / 24)}d`;
};

const fmtSrc = s => s && s !== 'Unknown' ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : s;

function DistributionTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:8, padding:'8px 12px', fontSize:12, boxShadow:'0 2px 8px rgba(0,0,0,.08)', pointerEvents:'none' }}>
      <div style={{ fontWeight:700, color:'#111', marginBottom:2 }}>{payload[0].payload.label}</div>
      <div style={{ color:'#555' }}>{payload[0].value} contacts</div>
    </div>
  );
}

export default function SpeedToLead() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getSpeedToLead()
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return <div style={{ textAlign:'center', padding:'4rem', color:'#888', fontSize:14 }}>Calculating response times…</div>;
  if (error) return <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'14px 18px', color:'#DC2626' }}>Error: {error}</div>;
  if (!data) return null;

  const { summary, distribution, wonVsLost } = data;

  return (
    <div>
      {/* Headline metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
        <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'12px 14px' }}>
          <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Median First Contact</div>
          <div style={{ fontSize:22, fontWeight:700, color: summary.value === null ? '#ccc' : summary.value < 6 ? '#059669' : summary.value < 24 ? '#F59E0B' : '#EF4444' }}>
            {fmtH(summary.value)}
          </div>
          {summary.sample > 0 && <div style={{ fontSize:11, color:'#888', marginTop:2 }}>{summary.sample} contacts</div>}
        </div>
        <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'12px 14px' }}>
          <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Under 1 Hour</div>
          <div style={{ fontSize:22, fontWeight:700, color: (summary.under1h ?? 0) > 50 ? '#059669' : '#F59E0B' }}>{summary.under1h ?? 0}%</div>
          <div style={{ fontSize:11, color:'#888', marginTop:2 }}>Best practice target</div>
        </div>
        <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'12px 14px' }}>
          <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Under 24 Hours</div>
          <div style={{ fontSize:22, fontWeight:700, color: (summary.under24h ?? 0) > 70 ? '#059669' : '#F59E0B' }}>{summary.under24h ?? 0}%</div>
        </div>
        <div style={{ background: data.uncontactedCount > 0 ? '#FEF2F2' : '#F0FDF4', border:`1px solid ${data.uncontactedCount > 0 ? '#FECACA' : '#BBF7D0'}`, borderRadius:10, padding:'12px 14px' }}>
          <div style={{ fontSize:10, color: data.uncontactedCount > 0 ? '#DC2626' : '#059669', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Not Contacted Yet</div>
          <div style={{ fontSize:22, fontWeight:700, color: data.uncontactedCount > 0 ? '#DC2626' : '#059669' }}>{data.uncontactedCount}</div>
          {data.criticalCount > 0 && <div style={{ fontSize:11, color:'#DC2626', marginTop:2 }}>{data.criticalCount} over 24 hours old</div>}
        </div>
      </div>

      {/* Response time distribution + Won vs Lost side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: distribution?.length ? '1fr 1fr' : '1fr', gap: 12, marginBottom: 14 }}>

        {/* Histogram */}
        {distribution?.length > 0 && (
          <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'14px 16px' }}>
            <div style={{ fontSize:12, fontWeight:600, color:'#111', marginBottom:4 }}>When do you contact leads?</div>
            <div style={{ fontSize:11, color:'#888', marginBottom:12 }}>Time from lead creation to first contact</div>
            <div style={{ height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distribution} margin={{ left:0, right:8, top:4, bottom:0 }}>
                  <XAxis dataKey="label" tick={{ fontSize:11, fill:'#888' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<DistributionTooltip />} cursor={false} wrapperStyle={{ pointerEvents:'none' }} />
                  <Bar dataKey="count" radius={[4,4,0,0]} maxBarSize={56}>
                    {distribution.map((d,i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display:'flex', gap:12, marginTop:8 }}>
              {distribution.map(d => (
                <div key={d.label} style={{ flex:1, textAlign:'center' }}>
                  <div style={{ fontSize:14, fontWeight:700, color:d.color }}>{d.count}</div>
                  <div style={{ fontSize:10, color:'#888' }}>{d.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Won vs Lost */}
        {wonVsLost.wonMedian !== null && wonVsLost.lostMedian !== null && (
          <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'14px 16px' }}>
            <div style={{ fontSize:12, fontWeight:600, color:'#111', marginBottom:4 }}>Speed vs outcome</div>
            <div style={{ fontSize:11, color:'#888', marginBottom:12 }}>How fast you contacted leads on deals you won vs lost</div>
            <div style={{ display:'flex', gap:10, marginBottom:12 }}>
              <div style={{ flex:1, padding:'12px 14px', background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:8 }}>
                <div style={{ fontSize:10, color:'#059669', fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Won deals</div>
                <div style={{ fontSize:24, fontWeight:700, color:'#059669' }}>{fmtH(wonVsLost.wonMedian)}</div>
                <div style={{ fontSize:11, color:'#666', marginTop:2 }}>{wonVsLost.wonSample} deals</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', fontSize:13, fontWeight:700, color:'#111' }}>
                {wonVsLost.ratio ? `${wonVsLost.ratio}× faster` : 'vs'}
              </div>
              <div style={{ flex:1, padding:'12px 14px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8 }}>
                <div style={{ fontSize:10, color:'#DC2626', fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Lost deals</div>
                <div style={{ fontSize:24, fontWeight:700, color:'#DC2626' }}>{fmtH(wonVsLost.lostMedian)}</div>
                <div style={{ fontSize:11, color:'#666', marginTop:2 }}>{wonVsLost.lostSample} deals</div>
              </div>
            </div>
            {wonVsLost.ratio > 1.5 && (
              <div style={{ padding:'10px 12px', background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:8, fontSize:12, color:'#92400E', lineHeight:1.5 }}>
                Won deals were contacted {wonVsLost.ratio}× faster. Set a {fmtH(wonVsLost.wonMedian * 1.5)} response target and your close rate will follow.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Uncontacted queue */}
      {data.uncontactedQueue?.length > 0 ? (
        <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'70px 1fr 110px 90px', gap:12, padding:'8px 14px', background:'#F7F8FA', borderBottom:'1px solid #F3F4F6' }}>
            <span style={{ fontSize:10, fontWeight:700, color:'#aaa', textTransform:'uppercase', letterSpacing:'.06em' }}>Urgency</span>
            <span style={{ fontSize:10, fontWeight:700, color:'#aaa', textTransform:'uppercase', letterSpacing:'.06em' }}>Contact</span>
            <span style={{ fontSize:10, fontWeight:700, color:'#aaa', textTransform:'uppercase', letterSpacing:'.06em' }}>Waiting</span>
            <span style={{ fontSize:10, fontWeight:700, color:'#aaa', textTransform:'uppercase', letterSpacing:'.06em' }}>Action</span>
          </div>
          {data.uncontactedQueue.slice(0, 50).map((r, i) => {
            const u = URGENCY[r.urgency] || URGENCY.medium;
            return (
              <div key={r.id} style={{ display:'flex', gap:12, padding:'12px 14px', borderBottom: i < data.uncontactedQueue.length - 1 ? '1px solid #F9FAFB' : 'none', alignItems:'center' }}>
                <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:10, background:u.bg, color:u.text, border:`1px solid ${u.border}`, textTransform:'uppercase', letterSpacing:'.04em', flexShrink:0, minWidth:60, textAlign:'center' }}>{u.label}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#111', marginBottom:1 }}>{r.name}</div>
                  {r.email && <div style={{ fontSize:11, color:'#888', marginBottom:1 }}>{r.email}</div>}
                  <div style={{ fontSize:11, color:'#aaa' }}>{r.stage}{r.source && r.source !== 'Unknown' ? ` · ${fmtSrc(r.source)}` : ''}</div>
                </div>
                <div style={{ fontSize:13, fontWeight:700, color:u.text, flexShrink:0, textAlign:'right', minWidth:80 }}>
                  {fmtH(r.hoursSinceCreated)} ago
                </div>
                <a href={r.hubspotUrl} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize:11, fontWeight:600, color:'#FF7A59', textDecoration:'none', flexShrink:0, whiteSpace:'nowrap' }}>
                  Open in HubSpot →
                </a>
              </div>
            );
          })}
          {data.uncontactedQueue.length > 50 && (
            <div style={{ padding:'10px 14px', textAlign:'center', fontSize:11, color:'#999', borderTop:'1px solid #F3F4F6' }}>
              Showing 50 of {data.uncontactedQueue.length} contacts
            </div>
          )}
        </div>
      ) : (
        <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:10, padding:'2rem', textAlign:'center' }}>
          <div style={{ fontSize:28, marginBottom:8 }}>✅</div>
          <div style={{ fontSize:15, fontWeight:600, color:'#059669', marginBottom:6 }}>No uncontacted leads right now</div>
          <div style={{ fontSize:13, color:'#666', maxWidth:340, margin:'0 auto', lineHeight:1.6 }}>Every recent lead has been reached out to. Keep that response time low.</div>
        </div>
      )}
    </div>
  );
}
