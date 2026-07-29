import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { api } from '../utils/api';
import FunnelLoader from './FunnelLoader';
import { Phone, Mail, Calendar, Eraser, CheckCircle } from 'lucide-react';

const URGENCY = {
  critical: { bg:'rgba(36,58,82,0.07)',   border:'rgba(36,58,82,0.15)',   text:'#243A52', label:'Critical' },
  high:     { bg:'rgba(27,114,199,0.07)', border:'rgba(27,114,199,0.2)',  text:'#1B72C7', label:'High' },
  medium:   { bg:'rgba(0,145,174,0.07)',  border:'rgba(0,145,174,0.2)',   text:'#0091AE', label:'Medium' },
  low:      { bg:'rgba(46,191,154,0.07)', border:'rgba(46,191,154,0.2)',  text:'#2EBF9A', label:'Low' },
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

  if (loading) return <FunnelLoader variant="journey" size="md" label="Calculating response times…" />;
  if (error) return <div style={{ background:'#F7F8FA', border:'1px solid #E2E5EA', borderRadius:10, padding:'14px 18px', color:'#555' }}>Error: {error}</div>;
  if (!data) return null;

  const { summary, distribution, contactsByBucket, wonVsLost, activitySummary, activityComparison, triageCandidates, spamCount } = data;

  return (
    <div>
      {/* Uncontacted leads banner */}
      {data.uncontactedCount > 0 && (
        <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'14px 18px', marginBottom:14, display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#111', marginBottom:2 }}>
              {data.uncontactedCount} lead{data.uncontactedCount !== 1 ? 's' : ''} with no outreach yet
              {data.criticalCount > 0 && <span style={{ marginLeft:8, fontSize:12, fontWeight:500, color:'#243A52' }}>· {data.criticalCount} over 24h</span>}
            </div>
            <div style={{ fontSize:12, color:'#888' }}>Response time drops fast. These contacts are waiting.</div>
          </div>
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <div style={{ fontSize:32, fontWeight:800, color:'#243A52', lineHeight:1 }}>{data.uncontactedCount}</div>
            <div style={{ fontSize:10, color:'#aaa', marginTop:2 }}>uncontacted</div>
          </div>
        </div>
      )}

      {/* Stats + Activity row */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${activitySummary ? 4 : 3}, 1fr)`, gap: 10, marginBottom: 14 }}>
        <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'12px 14px' }}>
          <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Median First Contact</div>
          <div style={{ fontSize:22, fontWeight:700, color:'#243A52' }}>
            {fmtH(summary.value)}
          </div>
          {summary.sample > 0 && <div style={{ fontSize:11, color:'#888', marginTop:2 }}>{summary.sample} contacts measured</div>}
        </div>
        <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'12px 14px' }}>
          <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Contacted Under 1 Hour</div>
          <div style={{ fontSize:22, fontWeight:700, color:'#1B72C7' }}>{summary.under1h ?? 0}%</div>
          <div style={{ fontSize:11, color:'#888', marginTop:2 }}>Best practice: above 50%</div>
        </div>
        <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'12px 14px' }}>
          <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Under 24 Hours</div>
          <div style={{ fontSize:22, fontWeight:700, color:'#0091AE' }}>{summary.under24h ?? 0}%</div>
          <div style={{ fontSize:11, color:'#888', marginTop:2 }}>Target: above 70%</div>
        </div>
        {/* Activity summary - last 30 days */}
        {activitySummary && (
          <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'12px 14px' }}>
            <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>Activity (30 days)</div>
            {[
              { label:'Calls', value:activitySummary.calls, icon:<Phone size={13} color="#888" /> },
              { label:'Sales emails', value:activitySummary.emails, icon:<Mail size={13} color="#888" /> },
              { label:'Meetings', value:activitySummary.meetings, icon:<Calendar size={13} color="#888" /> },
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
            {[{k:'calls',label:'Calls',icon:<Phone size={13} color="#888" />},{k:'emails',label:'Sales emails',icon:<Mail size={13} color="#888" />},{k:'meetings',label:'Meetings booked',icon:<Calendar size={13} color="#888" />}].map(a => {
              const c = activityComparison[a.k] || {};
              const tw = c.thisWeek, lw = c.lastWeek;
              const delta = (tw != null && lw != null) ? tw - lw : null;
              const up = delta > 0, flat = delta === 0;
              const dc = delta == null ? '#aaa' : flat ? '#888' : up ? '#0091AE' : '#E8562A';
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
        <div ref={triageRef} style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'14px 16px', marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
              <Eraser size={18} color="#0091AE" style={{ flexShrink:0, marginTop:1 }} />
              <div>
                <div style={{ fontSize:13.5, fontWeight:700, color:'#111' }}>Clean up your Data {spamCount > 0 && <span style={{ color:'#0091AE', fontWeight:500 }}>· {spamCount} filtered out</span>}</div>
                <div style={{ fontSize:11.5, color:'#666', marginTop:2, lineHeight:1.5 }}>Junk contacts skew your metrics across the whole app. Clean data means better decisions — mark spam and every number recalculates without them.</div>
              </div>
            </div>
            <button onClick={() => setShowTriage(v => !v)} style={{ fontSize:12, fontWeight:600, color:'#0091AE', background:'rgba(0,145,174,0.08)', border:'1px solid rgba(0,145,174,0.3)', borderRadius:8, padding:'8px 14px', cursor:'pointer', flexShrink:0, whiteSpace:'nowrap' }}>
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
                      background: c.isSpam ? 'rgba(0,145,174,0.06)' : '#F7F8FA', color: c.isSpam ? '#0091AE' : '#555', border:`1px solid ${c.isSpam ? 'rgba(0,145,174,0.3)' : '#E2E5EA'}` }}>
                    {c.isSpam ? '↩ Not spam' : 'Mark spam'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Response time distribution + Won vs Lost side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: (distribution?.length > 0 && wonVsLost.wonMedian !== null && wonVsLost.lostMedian !== null) ? '1fr 1fr' : '1fr', gap: 12, marginBottom: 14 }}>

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
                      style={{ fontSize:11, fontWeight:600, color:'#F77333', textDecoration:'none', flexShrink:0 }}>Open →</a>
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
              <div style={{ flex:1, padding:'12px 14px', background:'rgba(0,145,174,0.06)', border:'1px solid rgba(0,145,174,0.2)', borderRadius:8 }}>
                <div style={{ fontSize:10, color:'#0091AE', fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Won deals</div>
                <div style={{ fontSize:24, fontWeight:700, color:'#0091AE' }}>{fmtH(wonVsLost.wonMedian)}</div>
                <div style={{ fontSize:11, color:'#666', marginTop:2 }}>{wonVsLost.wonSample} deals</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', fontSize:13, fontWeight:700, color:'#111' }}>
                {wonVsLost.ratio ? `${wonVsLost.ratio}× faster` : 'vs'}
              </div>
              <div style={{ flex:1, padding:'12px 14px', background:'#F7F8FA', border:'1px solid #E2E5EA', borderRadius:8 }}>
                <div style={{ fontSize:10, color:'#888', fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Lost deals</div>
                <div style={{ fontSize:24, fontWeight:700, color:'#555' }}>{fmtH(wonVsLost.lostMedian)}</div>
                <div style={{ fontSize:11, color:'#666', marginTop:2 }}>{wonVsLost.lostSample} deals</div>
              </div>
            </div>
            {wonVsLost.ratio > 1.5 && (
              <div style={{ padding:'10px 12px', background:'rgba(27,114,199,0.06)', border:'1px solid rgba(27,114,199,0.2)', borderRadius:8, fontSize:12, color:'#243A52', lineHeight:1.5 }}>
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
                  style={{ fontSize:11, fontWeight:600, color:'#F77333', textDecoration:'none', flexShrink:0, whiteSpace:'nowrap' }}>
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
        <div style={{ background:'rgba(46,191,154,0.06)', border:'1px solid rgba(46,191,154,0.25)', borderRadius:10, padding:'2rem', textAlign:'center' }}>
          <div style={{ marginBottom:8, display:'flex', justifyContent:'center' }}><CheckCircle size={32} color="#2EBF9A" /></div>
          <div style={{ fontSize:15, fontWeight:600, color:'#243A52', marginBottom:6 }}>No uncontacted leads right now</div>
          <div style={{ fontSize:13, color:'#666', maxWidth:340, margin:'0 auto', lineHeight:1.6 }}>Every recent lead has been reached out to. Keep that response time low.</div>
        </div>
      )}
    </div>
  );
}
