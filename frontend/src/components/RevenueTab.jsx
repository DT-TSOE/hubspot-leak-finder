import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import IntegrationHint from './IntegrationHint';

const fmt$ = n => n != null && n > 0 ? '$' + Math.round(n).toLocaleString() : 'N/A';
const fmtSrc = s => s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : s;

function RevenueTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:8, padding:'8px 12px', fontSize:12, boxShadow:'0 2px 8px rgba(0,0,0,.08)', pointerEvents:'none' }}>
      <div style={{ fontWeight:700, color:'#111', marginBottom:2 }}>{d.label}</div>
      <div style={{ color:'#059669', fontWeight:700 }}>${d.revenue.toLocaleString()}</div>
      <div style={{ color:'#888' }}>{d.deals} deal{d.deals !== 1 ? 's' : ''} closed</div>
    </div>
  );
}

export default function RevenueTab({ data, loading, onNavigate }) {
  if (loading) return <div style={{ textAlign:'center', padding:'3rem', color:'#888', fontSize:13 }}>Loading revenue data…</div>;

  if (!data || data.insufficient) return (
    <div>
      <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'2rem', textAlign:'center', marginBottom:14 }}>
        <div style={{ fontSize:15, fontWeight:600, color:'#111', marginBottom:6 }}>Not enough closed deals yet</div>
        <div style={{ fontSize:13, color:'#888', maxWidth:320, margin:'0 auto', lineHeight:1.6 }}>
          Once you have at least 3 closed-won deals with amounts in HubSpot, revenue insights will appear here.
          {data?.sampleSize > 0 && <span style={{ display:'block', marginTop:6, color:'#aaa' }}>{data.sampleSize} deals found so far</span>}
        </div>
      </div>
      <IntegrationHint
        icon="💳" name="Stripe, QuickBooks, or Xero"
        feature="Verified Revenue & MRR" benefit="Verify actual revenue vs HubSpot estimates, track MRR trends, and calculate true LTV by source." preview="bars"
        onConnect={() => onNavigate?.('integrations')}
      />
    </div>
  );

  const maxRevenue = Math.max(...(data.revenueTrend?.map(m => m.revenue) || [1]));

  return (
    <div>
      {/* Headline metrics */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:14 }}>
        {[
          { label:'Total Revenue', value:fmt$(data.overview.totalRevenue), color:'#059669' },
          { label:'Avg Deal Size', value:fmt$(data.overview.avgDealSize), color:'#111' },
          { label:'Closed-Won Deals', value:data.overview.totalWonDeals, color:'#111' },
        ].map(m => (
          <div key={m.label} style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'13px 16px', textAlign:'center' }}>
            <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:4 }}>{m.label}</div>
            <div style={{ fontSize:22, fontWeight:700, color:m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Monthly revenue trend */}
      {data.revenueTrend?.length > 1 && (
        <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'14px 16px', marginBottom:14 }}>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#111' }}>Monthly revenue</div>
            <div style={{ fontSize:11, color:'#888', marginTop:2 }}>Closed-won deals by month</div>
          </div>
          <div style={{ height:160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.revenueTrend} margin={{ left:0, right:0, top:4, bottom:0 }}>
                <XAxis dataKey="label" tick={{ fontSize:11, fill:'#888' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<RevenueTooltip />} cursor={false} wrapperStyle={{ pointerEvents:'none' }} />
                <Bar dataKey="revenue" radius={[4,4,0,0]} maxBarSize={48} isAnimationActive={false}>
                  {data.revenueTrend.map((d, i) => (
                    <Cell key={i} fill={d.revenue === maxRevenue ? '#059669' : '#34D399'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Avg deal size by source */}
      {data.ltvBySource?.length > 0 && (
        <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'14px 16px', marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#111', marginBottom:12 }}>Avg deal size by source</div>
          {data.ltvBySource.map((s, i) => (
            <div key={s.source} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:i < data.ltvBySource.length-1 ? '1px solid #F9FAFB' : 'none' }}>
              <div>
                <div style={{ fontSize:13, fontWeight:500, color:'#222' }}>{fmtSrc(s.source)}</div>
                <div style={{ fontSize:11, color:'#999' }}>{s.dealCount} deals · {fmt$(s.totalRevenue)} total</div>
              </div>
              <div style={{ fontSize:15, fontWeight:700, color:i===0 ? '#059669' : '#333' }}>{fmt$(s.avgDealSize)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Rep performance */}
      {data.repPerformance?.length > 0 && (
        <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'14px 16px', marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#111', marginBottom:12 }}>Rep performance</div>
          {data.repPerformance.map((r, i) => (
            <div key={r.ownerId} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:i < data.repPerformance.length-1 ? '1px solid #F9FAFB' : 'none' }}>
              <div>
                <div style={{ fontSize:13, fontWeight:500, color:'#222' }}>Rep #{r.ownerId.slice(-6)}</div>
                <div style={{ fontSize:11, color:'#999' }}>{r.won} won · {r.lost} lost · {fmt$(r.avgDealSize)} avg</div>
              </div>
              <div style={{ fontSize:15, fontWeight:700, color:i===0 ? '#059669' : '#333' }}>{r.winRate}%</div>
            </div>
          ))}
        </div>
      )}

      {/* Accounting integration hint */}
      <IntegrationHint
        icon="💳" name="Stripe, QuickBooks, or Xero"
        feature="Verified Revenue & MRR" benefit="Verify actual revenue vs HubSpot estimates, track MRR trends, and calculate true LTV by source." preview="bars"
        onConnect={() => onNavigate?.('integrations')}
      />
    </div>
  );
}
