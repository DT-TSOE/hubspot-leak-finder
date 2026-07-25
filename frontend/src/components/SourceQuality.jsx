import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { api } from '../utils/api';
import FunnelLoader from './FunnelLoader';

const fmt$ = n => n != null && n > 0 ? '$' + Math.round(n).toLocaleString() : '-';
const fmtSrc = s => s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : s;

// Color scale for Rev/Lead bar: green (best) → amber → red (worst)
function barColor(value, max) {
  if (!max || max === 0) return '#94A3B8';
  const ratio = value / max;
  if (ratio >= 0.75) return '#059669';
  if (ratio >= 0.5)  return '#10B981';
  if (ratio >= 0.25) return '#F59E0B';
  return '#EF4444';
}

function RevLeadTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:8, padding:'8px 12px', fontSize:12, boxShadow:'0 2px 8px rgba(0,0,0,.08)', pointerEvents:'none' }}>
      <div style={{ fontWeight:700, color:'#111', marginBottom:3 }}>{d.name}</div>
      <div style={{ color:'#059669', fontWeight:600 }}>${d.value.toLocaleString()} per lead</div>
      <div style={{ color:'#888', marginTop:2 }}>{d.contacts} contacts · {d.won} won · {d.winRate}% win rate</div>
    </div>
  );
}

const SOURCE_LABELS = {
  hs_analytics_source: 'Original Source (first touch)',
  hs_analytics_source_data_1: 'Source Detail',
  hs_analytics_source_data_2: 'Source Detail 2',
};

export default function SourceQuality({ days, onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [property, setProperty] = useState('hs_analytics_source');
  const [expanded, setExpanded] = useState(null);
  const [conns, setConns] = useState({});

  useEffect(() => {
    setLoading(true);
    api.getSourceQuality(property, days)
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [property, days]);

  useEffect(() => {
    Promise.all([api.ga4Status().catch(() => ({})), api.gscStatus().catch(() => ({}))])
      .then(([g, s]) => setConns({ ga4: !!g.connected, gsc: !!s.connected }));
  }, []);

  if (loading) return <FunnelLoader variant="pulse" size="md" label="Analyzing your sources…" />;
  if (error) return <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'14px 18px', color:'#DC2626' }}>Error: {error}</div>;
  if (!data?.sources?.length) {
    return (
      <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'2rem', textAlign:'center' }}>
        <div style={{ fontSize:15, fontWeight:600, color:'#111', marginBottom:6 }}>Not enough source data yet</div>
        <div style={{ fontSize:13, color:'#888', maxWidth:380, margin:'0 auto', lineHeight:1.6 }}>Once contacts have source attribution and a few deals close, this will show which channels actually produce revenue.</div>
      </div>
    );
  }

  // Rev per Lead for each source with at least 1 contact
  const revLeadData = data.sources
    .filter(s => s.contacts > 0 && s.revenue > 0)
    .map(s => ({
      name: fmtSrc(s.source),
      value: Math.round(s.revenue / s.contacts),
      contacts: s.contacts,
      won: s.won,
      winRate: s.winRate,
    }))
    .sort((a, b) => b.value - a.value);

  const maxRevLead = revLeadData[0]?.value || 1;

  // Add revPerLead to each source row for the table
  const sourcesWithRevLead = data.sources.map(s => ({
    ...s,
    revPerLead: s.contacts > 0 && s.revenue > 0 ? Math.round(s.revenue / s.contacts) : 0,
  }));

  return (
    <div>
      {/* Attribution picker */}
      {data.availableProperties?.length > 1 && (
        <div style={{ marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:12, color:'#666', fontWeight:500 }}>Attribution model:</span>
          <select value={property} onChange={e => setProperty(e.target.value)}
            style={{ padding:'5px 10px', borderRadius:6, border:'1px solid #E2E5EA', fontSize:12, background:'#fff' }}>
            {data.availableProperties.map(p => <option key={p} value={p}>{SOURCE_LABELS[p] || p}</option>)}
          </select>
        </div>
      )}

      {/* Rev per Lead chart + Fastest to Close side by side */}
      <div style={{ display:'grid', gridTemplateColumns: data.fastestCycle ? '1fr 240px' : '1fr', gap:12, marginBottom:14 }}>

        {/* Revenue per Lead bar chart (always shown; blank when no data) */}
        <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'14px 16px' }}>
            <div style={{ marginBottom:4 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#111' }}>Revenue per Lead by source</div>
              <div style={{ fontSize:11, color:'#888', marginTop:2 }}>Total revenue divided by total leads from that channel. Shows true ROI - best to worst.</div>
            </div>
            {revLeadData.length > 0 ? (
            <div style={{ height: revLeadData.length * 44 + 20, marginTop:12 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revLeadData} layout="vertical" margin={{ left:0, right:60, top:4, bottom:4 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize:12, fill:'#555' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<RevLeadTooltip />} cursor={false} wrapperStyle={{ pointerEvents:'none' }} />
                  <Bar dataKey="value" radius={[0,5,5,0]} maxBarSize={26} isAnimationActive={false}>
                    {revLeadData.map((d, i) => <Cell key={i} fill={barColor(d.value, maxRevLead)} />)}
                    <LabelList dataKey="value" position="right" formatter={v => `$${v.toLocaleString()}`} style={{ fontSize:11, fill:'#555', fontWeight:600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            ) : (
            <div style={{ height: 120, marginTop:12, display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center', color:'#bbb', fontSize:12, border:'1px dashed #E2E5EA', borderRadius:8, padding:'0 20px' }}>
              No revenue-per-lead data yet. It appears once you have won deals with amounts, or try widening the date range.
            </div>
            )}
        </div>

        {/* Speed to Close by channel */}
        {(() => {
          const cycleData = data.sources
            .filter(s => s.avgSalesCycle && s.avgSalesCycle > 0 && s.deals >= 2)
            .sort((a, b) => a.avgSalesCycle - b.avgSalesCycle)
            .slice(0, 6)
            .map(s => ({ name: fmtSrc(s.source), value: s.avgSalesCycle, deals: s.deals }));
          if (!cycleData.length) return null;
          const minCycle = cycleData[0]?.value || 1;
          return (
            <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'14px 16px' }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#111', marginBottom:4 }}>Speed to close by channel</div>
              <div style={{ fontSize:11, color:'#888', marginBottom:12 }}>Avg days from deal created to closed-won. Fastest channels first.</div>
              <div style={{ height: cycleData.length * 44 + 16 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cycleData} layout="vertical" margin={{ left:0, right:48, top:4, bottom:4 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize:12, fill:'#555' }} axisLine={false} tickLine={false} />
                    <Bar dataKey="value" radius={[0,5,5,0]} maxBarSize={24} isAnimationActive={false}>
                      {cycleData.map((d, i) => <Cell key={i} fill={d.value === minCycle ? '#3B82F6' : '#93C5FD'} />)}
                      <LabelList dataKey="value" position="right" formatter={v => `${v}d`} style={{ fontSize:11, fill:'#555', fontWeight:600 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Get the full picture - gamified data-source completeness */}
      <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'14px 16px', marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:'#111' }}>Get the full picture</div>
            <div style={{ fontSize:11.5, color:'#888', marginTop:2 }}>Connect your other data sources to unlock traffic, spend, ROI and CPA on top of HubSpot.</div>
          </div>
          <button onClick={() => onNavigate?.('integrations')} style={{ fontSize:12, fontWeight:700, color:'#fff', background:'#111', border:'none', borderRadius:8, padding:'8px 14px', cursor:'pointer', flexShrink:0 }}>Connect data sources →</button>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:12 }}>
          {[
            { label:'HubSpot', on:true },
            { label:'Analytics (GA4)', on:conns.ga4 },
            { label:'Search Console', on:conns.gsc },
            { label:'Google Ads', on:false },
            { label:'Meta Ads', on:false },
            { label:'Stripe', on:false },
          ].map(b => (
            <span key={b.label} onClick={() => !b.on && onNavigate?.('integrations')}
              style={{ fontSize:11.5, fontWeight:600, padding:'4px 11px', borderRadius:20, cursor: b.on ? 'default' : 'pointer',
                background: b.on ? '#F0FDF4' : '#F3F4F6', color: b.on ? '#059669' : '#aaa', border:`1px solid ${b.on ? '#BBF7D0' : '#E2E5EA'}` }}>
              {b.on ? '✓ ' : '+ '}{b.label}
            </span>
          ))}
        </div>
      </div>

      {/* Source table */}
      <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'12px 14px', overflowX:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#111' }}>Source breakdown</div>
        </div>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
          <thead>
            <tr style={{ borderBottom:'1px solid #F3F4F6' }}>
              {['Source','Contacts','Opps','Deals','Won','Win %','Conv %','Revenue','Rev / Lead','Avg Deal','Avg Cycle','CPA'].map(h => (
                <th key={h} style={{ textAlign: h === 'Source' ? 'left' : 'right', padding:'6px 8px', fontSize:10, fontWeight:600, color: h === 'CPA' ? '#ccc' : '#999', textTransform:'uppercase', letterSpacing:'.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sourcesWithRevLead.map(s => (
              <React.Fragment key={s.source}>
              <tr onClick={() => setExpanded(expanded === s.source ? null : s.source)}
                style={{ borderBottom:'1px solid #F9FAFB', cursor:'pointer', background: expanded === s.source ? '#F7F8FA' : 'transparent' }}>
                <td style={{ padding:'8px', fontWeight:500, color:'#111' }}>{expanded === s.source ? '▾ ' : '▸ '}{fmtSrc(s.source)}</td>
                <td style={{ padding:'8px', textAlign:'right', color:'#666' }}>{s.contacts}</td>
                <td style={{ padding:'8px', textAlign:'right', color:'#666' }}>{s.opportunities || 0}</td>
                <td style={{ padding:'8px', textAlign:'right', color:'#666' }}>{s.deals}</td>
                <td style={{ padding:'8px', textAlign:'right', color:'#059669', fontWeight:600 }}>{s.won}</td>
                <td style={{ padding:'8px', textAlign:'right', color: s.winRate > 30 ? '#059669' : s.winRate > 15 ? '#F59E0B' : '#EF4444', fontWeight:600 }}>{s.winRate}%</td>
                <td style={{ padding:'8px', textAlign:'right', color: s.conversionRate >= 5 ? '#059669' : s.conversionRate >= 2 ? '#F59E0B' : '#999', fontWeight:600 }} title="Contacts that became customers">{s.conversionRate}%</td>
                <td style={{ padding:'8px', textAlign:'right', color:'#111', fontWeight:600 }}>{fmt$(s.revenue)}</td>
                <td style={{ padding:'8px', textAlign:'right', color: s.revPerLead > 0 ? barColor(s.revPerLead, maxRevLead) : '#ccc', fontWeight: s.revPerLead > 0 ? 700 : 400 }}>
                  {s.revPerLead > 0 ? `$${s.revPerLead.toLocaleString()}` : '-'}
                </td>
                <td style={{ padding:'8px', textAlign:'right', color:'#666' }}>{fmt$(s.avgDealSize)}</td>
                <td style={{ padding:'8px', textAlign:'right', color:'#666' }}>{s.avgSalesCycle ? `${s.avgSalesCycle}d` : '-'}</td>
                <td onClick={e => { e.stopPropagation(); onNavigate?.('integrations'); }} title="Connect Google Ads to see real cost per acquisition" style={{ padding:'8px', textAlign:'right', cursor:'pointer' }}>
                  <span style={{ filter:'blur(3.5px)', color:'#F97316', fontWeight:700, userSelect:'none' }}>${30 + (s.source.length * 17) % 90}</span>
                </td>
              </tr>
              {expanded === s.source && (
                <tr>
                  <td colSpan={12} style={{ padding:'12px 14px', background:'#FAFBFC', borderBottom:'1px solid #F0F1F4' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:10 }}>
                      {[
                        { l:'Contacts', v:s.contacts }, { l:'MQLs', v:s.mqls }, { l:'SQLs', v:s.sqls },
                        { l:'Opportunities', v:s.opportunities }, { l:'Customers', v:s.customers },
                      ].map((st, i, arr) => (
                        <React.Fragment key={st.l}>
                          <div style={{ textAlign:'center', minWidth:64 }}>
                            <div style={{ fontSize:16, fontWeight:800, color:'#111' }}>{st.v ?? 0}</div>
                            <div style={{ fontSize:10, color:'#888', textTransform:'uppercase', letterSpacing:'.04em' }}>{st.l}</div>
                          </div>
                          {i < arr.length - 1 && <span style={{ color:'#CBD5E1', fontSize:14 }}>→</span>}
                        </React.Fragment>
                      ))}
                    </div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      {[
                        `Win rate ${s.winRate}%`,
                        `Contact→customer ${s.conversionRate}%`,
                        `Avg deal ${fmt$(s.avgDealSize)}`,
                        s.avgSalesCycle ? `Avg cycle ${s.avgSalesCycle}d` : null,
                        `Revenue ${fmt$(s.revenue)}`,
                      ].filter(Boolean).map(chip => (
                        <span key={chip} style={{ fontSize:11.5, color:'#555', background:'#fff', border:'1px solid #E2E5EA', borderRadius:12, padding:'3px 10px' }}>{chip}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
