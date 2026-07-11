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

      {/* Rep performance - only show with 2+ reps */}
      {data.repPerformance?.length > 1 && (
        <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'14px 16px', marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#111', marginBottom:12 }}>Team performance</div>
          {data.repPerformance.map((r, i) => (
            <div key={r.ownerId} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:i < data.repPerformance.length-1 ? '1px solid #F9FAFB' : 'none' }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'#222' }}>{r.name || `Team member ${i + 1}`}</div>
                <div style={{ fontSize:11, color:'#999' }}>{r.won} won · {r.lost} lost · {fmt$(r.avgDealSize)} avg deal</div>
              </div>
              <div style={{ fontSize:16, fontWeight:700, color:i===0 ? '#059669' : '#555' }}>{r.winRate}%</div>
            </div>
          ))}
        </div>
      )}

      {/* Deal-stage conversion — forecasting */}
      {(() => {
        const p = data.dealStageConversion?.[0];
        if (!p) return null;
        const c2wColor = p.createdToWon >= 25 ? '#059669' : p.createdToWon >= 12 ? '#F59E0B' : '#EF4444';
        return (
          <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'14px 16px', marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#111', marginBottom:2 }}>Deal-stage conversion — forecasting</div>
            <div style={{ fontSize:11, color:'#888', marginBottom:12 }}>Of every deal that ever reached a stage, the share that goes on to win. This is your forecast math.</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:10, marginBottom: p.skipHeavy ? 0 : 12 }}>
              <span style={{ fontSize:30, fontWeight:800, color:c2wColor, lineHeight:1 }}>{p.createdToWon}%</span>
              <span style={{ fontSize:12.5, color:'#555', fontWeight:600 }}>created → won</span>
              <span style={{ fontSize:11, color:'#999' }}>· {p.won} of {p.dealCount} deals</span>
            </div>
            {p.skipHeavy ? (
              <div style={{ fontSize:11.5, color:'#888', lineHeight:1.55, marginTop:8 }}>Most of your deals jump straight from created to closed, so created → won is the number to trust for forecasting.</div>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead><tr style={{ color:'#999', fontSize:10, textTransform:'uppercase', letterSpacing:'.04em' }}>
                  <th style={{ textAlign:'left', padding:'4px 6px 4px 0' }}>Stage</th>
                  <th style={{ textAlign:'right', padding:'4px 6px' }}>Ever reached</th>
                  <th style={{ textAlign:'right', padding:'4px 6px' }}>Won</th>
                  <th style={{ textAlign:'right', padding:'4px 0 4px 6px' }}>Win rate from here</th>
                </tr></thead>
                <tbody>
                  {p.stages.map(s => (
                    <tr key={s.stageId} style={{ borderTop:'1px solid #F3F4F6' }}>
                      <td style={{ padding:'7px 6px 7px 0', color:'#333', fontWeight:500 }}>{s.label}</td>
                      <td style={{ padding:'7px 6px', textAlign:'right', color:'#666' }}>{s.everReached}</td>
                      <td style={{ padding:'7px 6px', textAlign:'right', color:'#666' }}>{s.won}</td>
                      <td style={{ padding:'7px 0 7px 6px', textAlign:'right', fontWeight:700, color: s.conversionPct == null ? '#ccc' : s.conversionPct >= 50 ? '#059669' : s.conversionPct >= 25 ? '#F59E0B' : '#EF4444' }}>
                        {s.conversionPct == null ? 'low sample' : `${s.conversionPct}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })()}

      {/* Time to win vs lose */}
      {data.winLoseTiming && (data.winLoseTiming.winMedianDays != null || data.winLoseTiming.loseMedianDays != null) && (
        <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'14px 16px', marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#111', marginBottom:12 }}>Time to win vs time to lose</div>
          <div style={{ display:'flex', gap:10 }}>
            <div style={{ flex:1, padding:'12px 14px', background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:8 }}>
              <div style={{ fontSize:10, color:'#059669', fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Median to win</div>
              <div style={{ fontSize:24, fontWeight:700, color:'#059669' }}>{data.winLoseTiming.winMedianDays != null ? `${data.winLoseTiming.winMedianDays}d` : '—'}</div>
              <div style={{ fontSize:11, color:'#666', marginTop:2 }}>{data.winLoseTiming.wonSample} won deals</div>
            </div>
            <div style={{ flex:1, padding:'12px 14px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8 }}>
              <div style={{ fontSize:10, color:'#DC2626', fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Median to lose</div>
              <div style={{ fontSize:24, fontWeight:700, color:'#DC2626' }}>{data.winLoseTiming.loseMedianDays != null ? `${data.winLoseTiming.loseMedianDays}d` : '—'}</div>
              <div style={{ fontSize:11, color:'#666', marginTop:2 }}>{data.winLoseTiming.lostSample} lost deals</div>
            </div>
          </div>
          {data.winLoseTiming.loseMedianDays > data.winLoseTiming.winMedianDays && data.winLoseTiming.winMedianDays != null && (
            <div style={{ marginTop:10, padding:'10px 12px', background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:8, fontSize:12, color:'#92400E', lineHeight:1.5 }}>
              Deals you lose take {data.winLoseTiming.loseMedianDays - data.winLoseTiming.winMedianDays} days longer to die than winners take to close. That’s time your team could reclaim by disqualifying sooner.
            </div>
          )}
        </div>
      )}

      {/* Why deals lose */}
      {data.lostReasons?.reasons?.length > 0 && (
        <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'14px 16px', marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#111' }}>Why deals lose</div>
            <div style={{ fontSize:11, color:'#888' }}>{data.lostReasons.total} lost deals{data.lostReasons.loggedPct != null ? ` · ${data.lostReasons.loggedPct}% have a reason logged` : ''}</div>
          </div>
          <div style={{ marginTop:10 }}>
            {data.lostReasons.reasons.slice(0, 6).map((r, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 0', borderBottom: i < Math.min(data.lostReasons.reasons.length,6)-1 ? '1px solid #F9FAFB' : 'none' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12.5, fontWeight:500, color:'#222' }}>{r.reason}</div>
                  <div style={{ height:5, background:'#F0F1F4', borderRadius:3, marginTop:4, overflow:'hidden' }}>
                    <div style={{ width:`${r.pct}%`, height:'100%', background:'#EF4444', borderRadius:3 }} />
                  </div>
                </div>
                <div style={{ fontSize:12, color:'#111', fontWeight:700, flexShrink:0, minWidth:36, textAlign:'right' }}>{r.count}</div>
                <div style={{ fontSize:11, color:'#888', flexShrink:0, minWidth:70, textAlign:'right' }}>{fmt$(r.value)} lost</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Who buys — revenue by job title */}
      {data.revenueByJobTitle?.hasTitles && data.revenueByJobTitle.rows.length > 0 && (
        <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'14px 16px', marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#111', marginBottom:2 }}>Who actually buys</div>
          <div style={{ fontSize:11, color:'#888', marginBottom:12 }}>Closed-won revenue by the job title on each deal’s primary contact.</div>
          {data.revenueByJobTitle.rows.map((r, i) => (
            <div key={r.title} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:i < data.revenueByJobTitle.rows.length-1 ? '1px solid #F9FAFB' : 'none' }}>
              <div>
                <div style={{ fontSize:13, fontWeight:500, color:'#222' }}>{r.title}</div>
                <div style={{ fontSize:11, color:'#999' }}>{r.deals} deal{r.deals !== 1 ? 's' : ''} · {fmt$(r.avgDeal)} avg</div>
              </div>
              <div style={{ fontSize:15, fontWeight:700, color:i===0 ? '#059669' : '#333' }}>{fmt$(r.revenue)}</div>
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
