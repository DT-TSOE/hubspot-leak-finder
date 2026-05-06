import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';

const URGENCY = {
  critical: { bg:'#FEF2F2', border:'#FECACA', text:'#DC2626', label:'Critical' },
  high: { bg:'#FFFBEB', border:'#FDE68A', text:'#D97706', label:'High' },
  medium: { bg:'#FFFBEB', border:'#FDE68A', text:'#92400E', label:'Medium' },
  low: { bg:'#F0FDF4', border:'#BBF7D0', text:'#059669', label:'Low' },
};

const fmtH = h => { if (h == null) return '—'; if (h < 1) return `${Math.round(h*60)}m`; if (h < 24) return `${Math.round(h)}h`; return `${Math.round(h/24)}d`; };

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

  const summary = data.summary;
  const wonVsLost = data.wonVsLost;

  return (
    <div>
      {/* Headline metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
        <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'12px 14px' }}>
          <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Median First Touch</div>
          <div style={{ fontSize:22, fontWeight:700, color: summary.value === null ? '#ccc' : summary.value < 6 ? '#059669' : summary.value < 24 ? '#F59E0B' : '#EF4444' }}>
            {fmtH(summary.value)}
          </div>
          {summary.sample > 0 && <div style={{ fontSize:11, color:'#888', marginTop:2 }}>{summary.sample} contacts</div>}
        </div>
        <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'12px 14px' }}>
          <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Under 1 Hour</div>
          <div style={{ fontSize:22, fontWeight:700, color:'#059669' }}>{summary.under1h ?? 0}%</div>
          <div style={{ fontSize:11, color:'#888', marginTop:2 }}>Best practice</div>
        </div>
        <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'12px 14px' }}>
          <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Under 24 Hours</div>
          <div style={{ fontSize:22, fontWeight:700, color: (summary.under24h ?? 0) > 70 ? '#059669' : '#F59E0B' }}>{summary.under24h ?? 0}%</div>
        </div>
        <div style={{ background: data.uncontactedCount > 0 ? '#FEF2F2' : '#fff', border:`1px solid ${data.uncontactedCount > 0 ? '#FECACA' : '#E2E5EA'}`, borderRadius:10, padding:'12px 14px' }}>
          <div style={{ fontSize:10, color: data.uncontactedCount > 0 ? '#DC2626' : '#999', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Uncontacted Now</div>
          <div style={{ fontSize:22, fontWeight:700, color: data.uncontactedCount > 0 ? '#DC2626' : '#111' }}>{data.uncontactedCount}</div>
          {data.criticalCount > 0 && <div style={{ fontSize:11, color:'#DC2626', marginTop:2 }}>{data.criticalCount} critical</div>}
        </div>
      </div>

      {/* Won vs Lost comparison */}
      {wonVsLost.wonMedian !== null && wonVsLost.lostMedian !== null && (
        <div style={{ background: '#fff', border: '1px solid #E2E5EA', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 12 }}>Speed advantage: won vs lost deals</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ flex: 1, padding: 14, background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: '#059669', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Won deals</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#059669' }}>{fmtH(wonVsLost.wonMedian)}</div>
              <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>median first touch · {wonVsLost.wonSample} deals</div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>
              {wonVsLost.ratio ? `${wonVsLost.ratio}× faster` : 'vs'}
            </div>
            <div style={{ flex: 1, padding: 14, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: '#DC2626', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Lost deals</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#DC2626' }}>{fmtH(wonVsLost.lostMedian)}</div>
              <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>median first touch · {wonVsLost.lostSample} deals</div>
            </div>
          </div>
          {wonVsLost.ratio > 1.5 && (
            <div style={{ marginTop: 12, padding: 10, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, fontSize: 12, color: '#92400E' }}>
              <strong>Insight:</strong> Won deals were contacted {wonVsLost.ratio}× faster than lost deals. Set a {fmtH(wonVsLost.wonMedian * 1.5)} response SLA and watch your close rate climb.
            </div>
          )}
        </div>
      )}

      {/* Uncontacted queue */}
      {data.uncontactedQueue?.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #E2E5EA', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>Uncontacted lead queue</div>
            <div style={{ fontSize: 11, color: '#888' }}>Sorted by urgency</div>
          </div>
          {data.uncontactedQueue.slice(0, 50).map((r, i) => {
            const u = URGENCY[r.urgency] || URGENCY.medium;
            return (
              <div key={r.id} style={{ display:'flex', gap:12, padding:'12px 14px', borderBottom: i < data.uncontactedQueue.length - 1 ? '1px solid #F9FAFB' : 'none', alignItems:'center' }}>
                <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:10, background:u.bg, color:u.text, border:`1px solid ${u.border}`, textTransform:'uppercase', letterSpacing:'.04em', flexShrink:0, minWidth:60, textAlign:'center' }}>{u.label}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#111', marginBottom:2 }}>{r.name}</div>
                  <div style={{ fontSize:11, color:'#666' }}>
                    {r.stage} · {r.source} · created {fmtH(r.hoursSinceCreated)} ago
                  </div>
                  <div style={{ fontSize:11, color:u.text, marginTop:3 }}>{r.action}</div>
                </div>
                <a href={r.hubspotUrl} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize:11, fontWeight:600, color:'#FF7A59', textDecoration:'none', flexShrink:0 }}>
                  Open in HubSpot →
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
