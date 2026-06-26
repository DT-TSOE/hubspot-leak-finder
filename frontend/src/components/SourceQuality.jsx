import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { api } from '../utils/api';

const fmt = n => n != null && n > 0 ? '$' + Math.round(n).toLocaleString() : '—';
const fmtK = n => n >= 1000 ? `$${(n/1000).toFixed(0)}k` : `$${n}`;
const fmtSrc = s => s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : s;

const REVENUE_COLORS = ['#059669','#10B981','#34D399','#6EE7B7','#A7F3D0'];
const WINRATE_COLORS = ['#3B82F6','#60A5FA','#93C5FD','#BFDBFE','#DBEAFE'];

function SourceTooltip({ active, payload, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:8, padding:'8px 12px', fontSize:12, boxShadow:'0 2px 8px rgba(0,0,0,.08)', pointerEvents:'none' }}>
      <div style={{ fontWeight:700, color:'#111', marginBottom:3 }}>{payload[0].payload.name}</div>
      <div style={{ color:'#555' }}>{formatter(payload[0].value)}</div>
    </div>
  );
}

function HBarChart({ data, dataKey, formatter, colors }) {
  if (!data?.length) return null;
  return (
    <div style={{ width:'100%', height: data.length * 44 + 16 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left:0, right:16, top:4, bottom:4 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={110} tick={{ fontSize:12, fill:'#555' }} axisLine={false} tickLine={false} />
          <Tooltip content={<SourceTooltip formatter={formatter} />} cursor={false} wrapperStyle={{ pointerEvents:'none' }} />
          <Bar dataKey={dataKey} radius={[0,5,5,0]} maxBarSize={24}>
            {data.map((_,i) => <Cell key={i} fill={colors[i % colors.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function SourceQuality() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [property, setProperty] = useState('hs_analytics_source');

  useEffect(() => {
    setLoading(true);
    api.getSourceQuality(property)
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [property]);

  if (loading) return <div style={{ textAlign:'center', padding:'4rem', color:'#888', fontSize:14 }}>Analyzing your sources…</div>;
  if (error) return <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'14px 18px', color:'#DC2626' }}>Error: {error}</div>;
  if (!data || !data.sources?.length) {
    return (
      <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'2rem', textAlign:'center' }}>
        <div style={{ fontSize:15, fontWeight:600, color:'#111', marginBottom:6 }}>Not enough source data yet</div>
        <div style={{ fontSize:13, color:'#888', maxWidth:380, margin:'0 auto', lineHeight:1.6 }}>Once your contacts have source attribution and a few have closed, this will show which channels actually produce revenue.</div>
      </div>
    );
  }

  const sourceLabels = {
    hs_analytics_source: 'Original Source (first touch)',
    hs_analytics_source_data_1: 'Source Detail',
    hs_analytics_source_data_2: 'Source Detail 2',
  };

  const chartSources = data.sources.filter(s => s.deals >= 1);
  const revenueData = [...chartSources].sort((a,b) => b.revenue - a.revenue).slice(0,6).map(s => ({ name: fmtSrc(s.source), value: s.revenue }));
  const winRateData = [...chartSources].filter(s => s.deals >= 2).sort((a,b) => b.winRate - a.winRate).slice(0,6).map(s => ({ name: fmtSrc(s.source), value: s.winRate }));

  return (
    <div>
      {/* Attribution selector */}
      {data.availableProperties?.length > 1 && (
        <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#666', fontWeight: 500 }}>Attribution:</span>
          <select value={property} onChange={e => setProperty(e.target.value)}
            style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #E2E5EA', fontSize: 12, background: '#fff' }}>
            {data.availableProperties.map(p => <option key={p} value={p}>{sourceLabels[p] || p}</option>)}
          </select>
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 14 }}>
        {data.bestRevenue && (
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Top Revenue Source</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 2 }}>{fmtSrc(data.bestRevenue.source)}</div>
            <div style={{ fontSize: 12, color: '#666' }}>{fmt(data.bestRevenue.revenue)} from {data.bestRevenue.won} won deals</div>
          </div>
        )}
        {data.bestWinRate && (
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Best Win Rate</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 2 }}>{fmtSrc(data.bestWinRate.source)}</div>
            <div style={{ fontSize: 12, color: '#666' }}>{data.bestWinRate.winRate}% close rate · {fmt(data.bestWinRate.avgDealSize)} avg deal</div>
          </div>
        )}
        {data.worstHighVolume && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>High Volume, Low Conversion</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 2 }}>{fmtSrc(data.worstHighVolume.source)}</div>
            <div style={{ fontSize: 12, color: '#666' }}>{data.worstHighVolume.contacts} contacts, only {data.worstHighVolume.winRate}% win rate</div>
          </div>
        )}
        {data.fastestCycle && (
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#1D4ED8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Fastest to Close</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 2 }}>{fmtSrc(data.fastestCycle.source)}</div>
            <div style={{ fontSize: 12, color: '#666' }}>{data.fastestCycle.avgSalesCycle} day avg sales cycle</div>
          </div>
        )}
      </div>

      {/* Charts side by side */}
      {(revenueData.length > 0 || winRateData.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          {revenueData.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #E2E5EA', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#111', marginBottom: 12 }}>Revenue by source</div>
              <HBarChart data={revenueData} dataKey="value" formatter={v => fmt(v)} colors={REVENUE_COLORS} />
            </div>
          )}
          {winRateData.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #E2E5EA', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#111', marginBottom: 12 }}>Win rate by source</div>
              <HBarChart data={winRateData} dataKey="value" formatter={v => `${v}%`} colors={WINRATE_COLORS} />
            </div>
          )}
        </div>
      )}

      {/* Source table */}
      <div style={{ background: '#fff', border: '1px solid #E2E5EA', borderRadius: 10, padding: '12px 14px', overflowX: 'auto' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 10 }}>Source funnel</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
              {['Source', 'Contacts', 'MQLs', 'SQLs', 'Deals', 'Won', 'Revenue', 'Win %', 'Avg Deal', 'Avg Cycle'].map(h => (
                <th key={h} style={{ textAlign: h === 'Source' ? 'left' : 'right', padding: '6px 8px', fontSize: 10, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.sources.map((s, i) => (
              <tr key={s.source} style={{ borderBottom: '1px solid #F9FAFB' }}>
                <td style={{ padding: '8px', fontWeight: 500, color: '#111' }}>{fmtSrc(s.source)}</td>
                <td style={{ padding: '8px', textAlign: 'right', color: '#666' }}>{s.contacts}</td>
                <td style={{ padding: '8px', textAlign: 'right', color: '#666' }}>{s.mqls}</td>
                <td style={{ padding: '8px', textAlign: 'right', color: '#666' }}>{s.sqls}</td>
                <td style={{ padding: '8px', textAlign: 'right', color: '#666' }}>{s.deals}</td>
                <td style={{ padding: '8px', textAlign: 'right', color: '#059669', fontWeight: 600 }}>{s.won}</td>
                <td style={{ padding: '8px', textAlign: 'right', color: '#111', fontWeight: 600 }}>{fmt(s.revenue)}</td>
                <td style={{ padding: '8px', textAlign: 'right', color: s.winRate > 30 ? '#059669' : s.winRate > 15 ? '#F59E0B' : '#EF4444', fontWeight: 600 }}>{s.winRate}%</td>
                <td style={{ padding: '8px', textAlign: 'right', color: '#666' }}>{fmt(s.avgDealSize)}</td>
                <td style={{ padding: '8px', textAlign: 'right', color: '#666' }}>{s.avgSalesCycle ? `${s.avgSalesCycle}d` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
