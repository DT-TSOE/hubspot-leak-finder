import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';

const fmt = n => n != null ? '$' + Math.round(n).toLocaleString() : '—';

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
        <div style={{ fontSize:28, marginBottom:12 }}>📊</div>
        <div style={{ fontSize:15, fontWeight:600, color:'#111', marginBottom:6 }}>Not enough source data yet</div>
        <div style={{ fontSize:13, color:'#888', maxWidth:380, margin:'0 auto', lineHeight:1.6 }}>Once your contacts have source attribution and a few have closed, this report will show which channels actually produce revenue.</div>
      </div>
    );
  }

  const sourceLabels = {
    hs_analytics_source: 'Original Source',
    hs_analytics_source_data_1: 'Source Detail 1',
    hs_analytics_source_data_2: 'Source Detail 2',
  };

  return (
    <div>
      {/* Property selector */}
      {data.availableProperties?.length > 1 && (
        <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#666' }}>Group by:</span>
          <select value={property} onChange={e => setProperty(e.target.value)}
            style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #E2E5EA', fontSize: 12, background: '#fff' }}>
            {data.availableProperties.map(p => <option key={p} value={p}>{sourceLabels[p] || p}</option>)}
          </select>
        </div>
      )}

      {/* Best/Worst cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 14 }}>
        {data.bestRevenue && (
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Top revenue source</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 2 }}>{data.bestRevenue.source}</div>
            <div style={{ fontSize: 12, color: '#666' }}>{fmt(data.bestRevenue.revenue)} from {data.bestRevenue.won} won deals</div>
          </div>
        )}
        {data.bestWinRate && (
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Best win rate</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 2 }}>{data.bestWinRate.source}</div>
            <div style={{ fontSize: 12, color: '#666' }}>{data.bestWinRate.winRate}% close rate · {fmt(data.bestWinRate.avgDealSize)} avg deal</div>
          </div>
        )}
        {data.worstHighVolume && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>High volume, low conversion</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 2 }}>{data.worstHighVolume.source}</div>
            <div style={{ fontSize: 12, color: '#666' }}>{data.worstHighVolume.contacts} contacts, only {data.worstHighVolume.conversionRate}% become customers</div>
          </div>
        )}
        {data.fastestCycle && (
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#1D4ED8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Fastest closing source</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 2 }}>{data.fastestCycle.source}</div>
            <div style={{ fontSize: 12, color: '#666' }}>{data.fastestCycle.avgSalesCycle} day avg cycle</div>
          </div>
        )}
      </div>

      {/* Source funnel table */}
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
                <td style={{ padding: '8px', fontWeight: 500, color: '#111' }}>{s.source}</td>
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
