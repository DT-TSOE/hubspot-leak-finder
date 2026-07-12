import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { api } from '../utils/api';

const URGENCY = {
  critical: { bg:'#FEF2F2', border:'#FECACA', text:'#DC2626', label:'Critical' },
  high:     { bg:'#FFFBEB', border:'#FDE68A', text:'#D97706', label:'High' },
  medium:   { bg:'#FFFBEB', border:'#FDE68A', text:'#92400E', label:'Medium' },
  low:      { bg:'#F0FDF4', border:'#BBF7D0', text:'#059669', label:'Low' },
};

const fmtH = h => {
  if (h == null) return '-';
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

export default function SpeedToLead({ days }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBucket, setSelectedBucket] = useState(null);
  const [marking, setMarking] = useState(false);
  const [showTriage, setShowTriage] = useState(false);
  const triageRef = React.useRef(null);

  useEffect(() => {
    const handler = () => {
      setShowTriage(true);
      setTimeout(() => triageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    };
    window.addEventListener('speedtolead:openTriage', handler);
    return () => window.removeEventListener('speedtolead:openTriage', handler);
  }, []);

  const load = useCallback((withSpinner = true) => {
    if (withSpinner) setLoading(true);
    return api.getSpeedToLead(days)
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const handleSpam = async (id, currentlySpam) => {
    setMarking(true);
    try {
      await api.markSpam([id], currentlySpam ? 'remove' : 'add');
      await load(false); // recompute metrics without the full-page spinner
    } finally {
      setMarking(false);
    }
  };

  if (loading) return <div style={{ textAlign:'center', padding:'4rem', color:'#888', fontSize:14 }}>Calculating response times…</div>;
  if (error) return <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'14px 18px', color:'#DC2626' }}>Error: {error}</div>;
  if (!data) return null;

  const { summary, distribution, contactsByBucket, wonVsLost, activitySummary, activityComparison, triageCandidates, spamCount } = data;

  return (
    <div>
      {/* Hero alert when uncontacted leads exist */}
      {data.uncontactedCount > 0 && (
        <div style={{ background:'linear-gradient(135deg,#1a1a1a,#2d1a1a)', borderRadius:12, padding:'16px 20px', marginBottom:14, display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ width:44, height:44, borderRadius:10, background:'rgba(239,68,68,.15)', border:'2px solid #EF4444', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>🚨</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#EF4444', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:3 }}>Needs Immediate Attention</div>
            <div style={{ fontSize:18, fontWeight:700, color:'#fff', marginBottom:3 }}>
              {data.uncontactedCount} lead{data.uncontactedCount !== 1 ? 's' : ''} with zero outreach
              {data.criticalCount > 0 && <span style={{ marginLeft:10, fontSize:13, fontWeight:600, color:'#EF4444' }}>({data.criticalCount} over 24h)</span>}
            </div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,.6)' }}>Contacting a lead within 1 hour makes you ~7x more likely to qualify it (HBR research). Every hour you wait, the odds drop.</div>
          </div>
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <div style={{ fontSize:36, fontWeight:900, color:'#EF4444', lineHeight:1 }}>{data.uncontactedCount}</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', marginTop:2 }}>uncontacted</div>
          </div>
        </div>
      )}

      {/* Stats + Activity row */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${activitySummary ? 4 : 3}, 1fr)`, gap: 10, marginBottom: 14 }}>
        <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'12px 14px' }}>
          <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Median First Contact</div>
          <div style={{ fontSize:22, fontWeight:700, color: summary.value === null ? '#ccc' : summary.value < 6 ? '#059669' : summary.value < 24 ? '#F59E0B' : '#EF4444' }}>
            {fmtH(summary.value)}
          </div>
          {summary.sample > 0 && <div style={{ fontSize:11, color:'#888', marginTop:2 }}>{summary.sample} contacts measured</div>}
        </div>
        <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'12px 14px' }}>
          <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Contacted Under 1 Hour</div>
          <div style={{ fontSize:22, fontWeight:700, color: (summary.under1h ?? 0) > 50 ? '#059669' : '#F59E0B' }}>{summary.under1h ?? 0}%</div>
          <div style={{ fontSize:11, color:'#888', marginTop:2 }}>Best practice: above 50%</div>
        </div>
        <div style={{ background: data.uncontactedCount > 0 ? '#FEF2F2' : '#F0FDF4', border:`1px solid ${data.uncontactedCount > 0 ? '#FECACA' : '#BBF7D0'}`, borderRadius:10, padding:'12px 14px' }}>
          <div style={{ fontSize:10, color: data.uncontactedCount > 0 ? '#DC2626' : '#059669', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Under 24 Hours</div>
          <div style={{ fontSize:22, fontWeight:700, color: (summary.under24h ?? 0) > 70 ? '#059669' : '#F59E0B' }}>{summary.under24h ?? 0}%</div>
          <div style={{ fontSize:11, color:'#888', marginTop:2 }}>Target: above 70%</div>
        </div>
        {/* Activity summary - last 30 days */}
        {activitySummary && (
          <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'12px 14px' }}>
            <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>Activity (30 days)</div>
            {[
              { label:'Calls', value:activitySummary.calls, icon:'📞' },
              { label:'Sales emails', value:activitySummary.emails, icon:'✉' },
              { label:'Meetings', value:activitySummary.meetings, icon:'📅' },
            ].map(a => (
              <div key={a.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:11, color:'#666' }}>{a.icon} {a.label}</span>
                <span style={{ fontSize:13, fontWeight:700, color: a.value === null ? '#ccc' : '#111' }}>
                  {a.value === null ? '--' : a.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity - this week vs last week ("did we book any calls last week?") */}
      {activityComparison && Object.keys(activityComparison).length > 0 && (
        <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'14px 16px', marginBottom:14 }}>
          <div style={{ fontSize:12.5, fontWeight:600, color:'#111', marginBottom:12 }}>Activity - this week vs last week</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            {[{k:'calls',label:'Calls',icon:'📞'},{k:'emails',label:'Sales emails',icon:'✉'},{k:'meetings',label:'Meetings booked',icon:'📅'}].map(a => {
              const c = activityComparison[a.k] || {};
              const tw = c.thisWeek, lw = c.lastWeek;
              const delta = (tw != null && lw != null) ? tw - lw : null;
              const up = delta > 0, flat = delta === 0;
              const dc = delta == null ? '#aaa' : flat ? '#888' : up ? '#059669' : '#DC2626';
              return (
                <div key={a.k} style={{ background:'#F7F8FA', border:'1px solid #E2E5EA', borderRadius:8, padding:'12px 14px' }}>
                  <div style={{ fontSize:11, color:'#888', marginBottom:4 }}>{a.icon} {a.label}</div>
                  <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
                    <span style={{ fontSize:24, fontWeight:800, color: tw == null ? '#ccc' : '#111' }}>{tw == null ? '-' : tw}</span>
                    {delta != null && <span style={{ fontSize:12, fontWeight:700, color:dc }}>{flat ? '→ same' : `${up ? '▲ +' : '▼ '}${delta}`}</span>}
                  </div>
                  <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>{lw == null ? '' : `${lw} last week`}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Spam cleanup - junk form-fills skew response time; let the user filter them out */}
      {triageCandidates?.length > 0 && (
        <div ref={triageRef} style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderLeft:'4px solid #F59E0B', borderRadius:10, padding:'14px 16px', marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
              <span style={{ fontSize:20, flexShrink:0 }}>🧹</span>
              <div>
                <div style={{ fontSize:13.5, fontWeight:700, color:'#111' }}>Clean up spam &amp; junk contacts {spamCount > 0 && <span style={{ color:'#059669' }}>· {spamCount} filtered out</span>}</div>
                <div style={{ fontSize:11.5, color:'#92400E', marginTop:2, lineHeight:1.5 }}>Junk form-fills skew response time, conversion, and source quality across the whole app. Mark them spam and every metric recalculates without them - one of the highest-impact things you can do.</div>
              </div>
            </div>
            <button onClick={() => setShowTriage(v => !v)} style={{ fontSize:12, fontWeight:700, color:'#fff', background:'#C2410C', border:'none', borderRadius:8, padding:'8px 14px', cursor:'pointer', flexShrink:0, whiteSpace:'nowrap' }}>
              {showTriage ? 'Hide' : 'Review contacts →'}
            </button>
          </div>
          {showTriage && (
            <div style={{ marginTop:12, borderTop:'1px solid #F3F4F6', paddingTop:10, opacity: marking ? 0.6 : 1, transition:'opacity .15s' }}>
              {triageCandidates.map((c, i) => (
                <div key={c.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 0', borderBottom: i < triageCandidates.length-1 ? '1px solid #F9FAFB' : 'none' }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12.5, fontWeight:600, color: c.isSpam ? '#bbb' : '#111', textDecoration: c.isSpam ? 'line-through' : 'none' }}>{c.name}</div>
                    <div style={{ fontSize:11, color:'#999' }}>{[c.email, c.source && fmtSrc(c.source), c.stage].filter(Boolean).join(' · ')}</div>
                  </div>
                  <div style={{ fontSize:11, color:'#888', flexShrink:0, minWidth:70, textAlign:'right' }}>
                    {c.respHours == null ? (c.touched ? 'touched' : 'no touch') : fmtH(c.respHours)}
                  </div>
                  <button disabled={marking} onClick={() => handleSpam(c.id, c.isSpam)}
                    style={{ fontSize:10.5, fontWeight:700, borderRadius:6, padding:'4px 10px', cursor: marking ? 'default' : 'pointer', flexShrink:0, minWidth:78, textAlign:'center',
                      background: c.isSpam ? '#F0FDF4' : '#FEF2F2', color: c.isSpam ? '#059669' : '#DC2626', border:`1px solid ${c.isSpam ? '#BBF7D0' : '#FECACA'}` }}>
                    {c.isSpam ? '↩ Not spam' : 'Mark spam'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Response time distribution + Won vs Lost side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: distribution?.length ? '1fr 1fr' : '1fr', gap: 12, marginBottom: 14 }}>

        {/* Histogram */}
        {distribution?.length > 0 && (
          <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'14px 16px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'#111' }}>When do you contact leads?</div>
              {selectedBucket && (
                <button onClick={() => setSelectedBucket(null)} style={{ fontSize:10, color:'#3B82F6', background:'#EFF6FF', border:'none', borderRadius:5, padding:'2px 8px', cursor:'pointer', fontWeight:600 }}>Clear ✕</button>
              )}
            </div>
            <div style={{ fontSize:11, color:'#888', marginBottom:12 }}>Click a bar to see which contacts - time from creation to first contact</div>
            <div style={{ height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distribution} margin={{ left:0, right:8, top:4, bottom:0 }}
                  onClick={e => { if (e?.activePayload?.[0]) { const k = e.activePayload[0].payload.key; setSelectedBucket(selectedBucket === k ? null : k); } }}
                  style={{ cursor:'pointer' }}>
                  <XAxis dataKey="label" tick={{ fontSize:11, fill:'#888' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<DistributionTooltip />} cursor={false} wrapperStyle={{ pointerEvents:'none' }} />
                  <Bar dataKey="count" radius={[4,4,0,0]} maxBarSize={56} isAnimationActive={false}>
                    {distribution.map((d,i) => <Cell key={i} fill={d.color} opacity={selectedBucket && selectedBucket !== d.key ? 0.3 : 1} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display:'flex', gap:12, marginTop:8 }}>
              {distribution.map(d => (
                <div key={d.label} onClick={() => setSelectedBucket(selectedBucket === d.key ? null : d.key)}
                  style={{ flex:1, textAlign:'center', cursor:'pointer', opacity: selectedBucket && selectedBucket !== d.key ? 0.4 : 1 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:d.color }}>{d.count}</div>
                  <div style={{ fontSize:10, color:'#888' }}>{d.label}</div>
                </div>
              ))}
            </div>

            {/* Drill-down: contacts in selected bucket */}
            {selectedBucket && contactsByBucket?.[selectedBucket]?.length > 0 && (
              <div style={{ marginTop:14, borderTop:'1px solid #F3F4F6', paddingTop:12 }}>
                <div style={{ fontSize:11, fontWeight:600, color:'#555', marginBottom:8 }}>
                  {distribution.find(d => d.key === selectedBucket)?.label} - {contactsByBucket[selectedBucket].length} contacts
                </div>
                {contactsByBucket[selectedBucket].slice(0,10).map((c,i) => (
                  <div key={c.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 0', borderBottom: i < Math.min(contactsByBucket[selectedBucket].length,10)-1 ? '1px solid #F9FAFB' : 'none' }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:'#111' }}>{c.name}</div>
                      {c.email && <div style={{ fontSize:11, color:'#888' }}>{c.email}</div>}
                    </div>
                    <div style={{ fontSize:11, color:'#666', flexShrink:0 }}>{fmtH(c.hours)} response</div>
                    <a href={c.hubspotUrl} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize:11, fontWeight:600, color:'#FF7A59', textDecoration:'none', flexShrink:0 }}>Open →</a>
                  </div>
                ))}
                {contactsByBucket[selectedBucket].length > 10 && (
                  <div style={{ fontSize:11, color:'#888', marginTop:6 }}>+{contactsByBucket[selectedBucket].length - 10} more</div>
                )}
              </div>
            )}
            {selectedBucket && (!contactsByBucket?.[selectedBucket]?.length) && (
              <div style={{ marginTop:12, fontSize:12, color:'#888', textAlign:'center' }}>No contact data for this bucket</div>
            )}
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
