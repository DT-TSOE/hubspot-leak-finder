import React, { useState, useEffect, useCallback } from 'react';
import FunnelChart from './FunnelChart';
import StageTimingTable from './StageTimingTable';
import { api } from '../utils/api';

const CARD = { background: '#fff', border: '1px solid #E2E5EA', borderRadius: 10, padding: '14px 16px', marginBottom: 12 };
const MKT_STAGES = ['Lead', 'MQL', 'SQL'];
const MKT_TIMING_KEYS = ['lead_to_marketingqualifiedlead', 'marketingqualifiedlead_to_salesqualifiedlead'];

// Marketing funnel: Impressions → Traffic → Leads → MQL → SQL.
// Traffic comes from GA4 once connected; Impressions still needs Google Ads.
export default function MarketingPipeline({ funnelData, onNavigate }) {
  const [ga4, setGa4] = useState(null);
  const [properties, setProperties] = useState(null);

  const loadTraffic = useCallback(() => api.ga4Traffic().then(setGa4).catch(() => setGa4({ connected: false })), []);
  useEffect(() => { loadTraffic(); }, [loadTraffic]);
  useEffect(() => {
    if (ga4?.connected && ga4.needsProperty && properties == null) {
      api.ga4Properties().then(r => setProperties(r.properties || [])).catch(() => setProperties([]));
    }
  }, [ga4, properties]);

  const selectProperty = async (id, name) => { await api.ga4SelectProperty(id, name); setGa4(null); await loadTraffic(); };

  if (!funnelData?.funnel) return <div style={{ textAlign: 'center', padding: '3rem', color: '#888', fontSize: 13 }}>Loading marketing funnel…</div>;
  const { funnel } = funnelData;
  const stages = funnel.funnelStages.filter(s => MKT_STAGES.includes(s.label));
  const timings = Object.fromEntries(Object.entries(funnel.stageTimes || {}).filter(([k]) => MKT_TIMING_KEYS.includes(k)));
  const leadCount = stages[0]?.count || 0;
  const sqlCount = stages[stages.length - 1]?.count || 0;
  const conv = leadCount > 0 ? ((sqlCount / leadCount) * 100).toFixed(1) : '0';

  const trafficConnected = !!(ga4?.connected && !ga4.needsProperty && ga4.totalSessions != null);
  const impressions = (leadCount > 0 ? leadCount * 420 : 48200).toLocaleString(); // still placeholder — needs Ads
  const trafficVal = trafficConnected ? ga4.totalSessions.toLocaleString() : (leadCount > 0 ? leadCount * 26 : 3140).toLocaleString();

  // A funnel bar — real (unlocked) or locked/blurred upsell.
  const funnelBar = (label, val, width, { locked }) => (
    <div key={label} onClick={() => locked && onNavigate?.('integrations')} title={locked ? 'Connect to unlock' : undefined}
      style={{ position: 'relative', width, margin: '0 auto 6px', height: 38, borderRadius: 7, cursor: locked ? 'pointer' : 'default', overflow: 'hidden',
        background: locked ? '#EEF1F5' : '#EFF4FF', border: `1px ${locked ? 'dashed #CBD5E1' : 'solid #BFD4FF'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px' }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: locked ? '#7A8493' : '#1D4ED8', filter: locked ? 'blur(2px)' : 'none' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 800, color: locked ? '#5B6472' : '#111', filter: locked ? 'blur(2.5px)' : 'none' }}>{val}</span>
      {locked && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <span style={{ fontSize: 12 }}>🔒</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#FF7A59' }}>Unlock →</span>
        </div>
      )}
    </div>
  );

  return (
    <div>
      {/* --- Top-of-funnel state: connect / pick property / live traffic --- */}
      {!ga4?.connected && (
        <div style={{ ...CARD, borderStyle: 'dashed', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', gap: 8, flex: 1 }}>
            {[{ label: 'Impressions', val: impressions }, { label: 'Traffic', val: trafficVal }].map(s => (
              <div key={s.label} style={{ position: 'relative', flex: 1, textAlign: 'center', padding: '10px 8px', background: '#F7F8FA', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ fontSize: 10, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.05em' }}>{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#5B6472', filter: 'blur(2.5px)', userSelect: 'none' }}>{s.val}</div>
                <div style={{ position: 'absolute', top: 6, right: 8, fontSize: 11 }}>🔒</div>
              </div>
            ))}
          </div>
          <div style={{ flex: 1.4, fontSize: 12, color: '#666', lineHeight: 1.5 }}>
            <strong style={{ color: '#111' }}>See real traffic on your funnel.</strong> Connect Google Analytics to pull sessions and channels on top of your HubSpot leads.
            <button onClick={() => onNavigate?.('integrations')} style={{ display: 'block', marginTop: 6, fontSize: 11, fontWeight: 700, color: '#FF7A59', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>Connect Google Analytics →</button>
          </div>
        </div>
      )}

      {ga4?.connected && ga4.needsProperty && (
        <div style={{ ...CARD, borderColor: '#BFD4FF', background: '#F5F9FF' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 4 }}>✅ Google Analytics connected — pick your property</div>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>Choose which GA4 property feeds your traffic data.</div>
          {properties == null ? <div style={{ fontSize: 12, color: '#888' }}>Loading properties…</div>
            : properties.length === 0 ? <div style={{ fontSize: 12, color: '#888' }}>No GA4 properties found on this Google account.</div>
            : (
              <select defaultValue="" onChange={e => { const p = properties.find(x => x.id === e.target.value); if (p) selectProperty(p.id, p.name); }}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: '#fff', minWidth: 260 }}>
                <option value="" disabled>Select a property…</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name} ({p.account})</option>)}
              </select>
            )}
        </div>
      )}

      {trafficConnected && (
        <div style={{ ...CARD, borderColor: '#BFD4FF' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>Traffic — last {ga4.days} days <span style={{ fontSize: 11, fontWeight: 400, color: '#888' }}>· via GA4 {ga4.propertyName ? `· ${ga4.propertyName}` : ''}</span></div>
            <div style={{ display: 'flex', gap: 18 }}>
              <div style={{ textAlign: 'right' }}><div style={{ fontSize: 20, fontWeight: 800, color: '#111' }}>{ga4.totalSessions.toLocaleString()}</div><div style={{ fontSize: 10, color: '#999' }}>SESSIONS</div></div>
              <div style={{ textAlign: 'right' }}><div style={{ fontSize: 20, fontWeight: 800, color: '#111' }}>{ga4.totalUsers.toLocaleString()}</div><div style={{ fontSize: 10, color: '#999' }}>USERS</div></div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(ga4.byChannel || []).slice(0, 6).map(c => (
              <span key={c.channel} style={{ fontSize: 11.5, color: '#555', background: '#F7F8FA', border: '1px solid #E2E5EA', borderRadius: 12, padding: '3px 10px' }}>
                {c.channel} <strong style={{ color: '#111' }}>{c.sessions.toLocaleString()}</strong>
              </span>
            ))}
          </div>
          <button onClick={() => onNavigate?.('integrations')} style={{ marginTop: 10, fontSize: 11, fontWeight: 700, color: '#FF7A59', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
            🔒 Connect Google Ads to add Impressions & spend →
          </button>
        </div>
      )}

      {/* --- Lead metrics --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 12 }}>
        {[
          { label: 'Leads', value: leadCount.toLocaleString(), color: '#111' },
          { label: 'SQLs', value: sqlCount.toLocaleString(), color: '#111' },
          { label: 'Lead → SQL', value: `${conv}%`, color: parseFloat(conv) < 10 ? '#EF4444' : '#059669' },
        ].map(m => (
          <div key={m.label} style={{ background: '#fff', border: '1px solid #E2E5EA', borderRadius: 10, padding: '13px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* --- Funnel: Impressions (locked) → Traffic (real if connected) → Lead → MQL → SQL --- */}
      <div style={CARD}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 10 }}>Acquisition funnel — Impressions → Traffic → Lead → MQL → SQL</div>
        {funnelBar('Impressions', impressions, '100%', { locked: true })}
        {funnelBar('Traffic', trafficVal, '84%', { locked: !trafficConnected })}
        <FunnelChart funnelStages={stages} biggestLeak={funnel.biggestLeak} stageContacts={funnel.stageContacts} />
      </div>

      {Object.keys(timings).length > 0 && (
        <div style={CARD}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 10 }}>Time between marketing stages</div>
          <StageTimingTable stageTimes={timings} />
        </div>
      )}
    </div>
  );
}
