import React from 'react';
import FunnelChart from './FunnelChart';
import StageTimingTable from './StageTimingTable';

const CARD = { background: '#fff', border: '1px solid #E2E5EA', borderRadius: 10, padding: '14px 16px', marginBottom: 12 };
const MKT_STAGES = ['Lead', 'MQL', 'SQL'];
const MKT_TIMING_KEYS = ['lead_to_marketingqualifiedlead', 'marketingqualifiedlead_to_salesqualifiedlead'];

// Marketing funnel: Impressions → Traffic → Leads → MQL → SQL.
// Impressions/Traffic need GA4/Ads, so they render as a locked teaser on top.
export default function MarketingPipeline({ funnelData, onNavigate }) {
  if (!funnelData?.funnel) return <div style={{ textAlign: 'center', padding: '3rem', color: '#888', fontSize: 13 }}>Loading marketing funnel…</div>;
  const { funnel } = funnelData;
  const stages = funnel.funnelStages.filter(s => MKT_STAGES.includes(s.label));
  const timings = Object.fromEntries(Object.entries(funnel.stageTimes || {}).filter(([k]) => MKT_TIMING_KEYS.includes(k)));
  const leadCount = stages[0]?.count || 0;
  const sqlCount = stages[stages.length - 1]?.count || 0;
  const conv = leadCount > 0 ? ((sqlCount / leadCount) * 100).toFixed(1) : '0';

  return (
    <div>
      {/* Locked top-of-funnel — Impressions & Traffic (needs GA4 / Google Ads) */}
      <div style={{ ...CARD, borderStyle: 'dashed', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ display: 'flex', gap: 8, flex: 1 }}>
          {['Impressions', 'Traffic'].map(s => (
            <div key={s} style={{ flex: 1, textAlign: 'center', padding: '10px 8px', background: '#F7F8FA', borderRadius: 8, filter: 'blur(0.4px)' }}>
              <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.05em' }}>{s}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#C7CDD6' }}>🔒</div>
            </div>
          ))}
        </div>
        <div style={{ flex: 1.4, fontSize: 12, color: '#666', lineHeight: 1.5 }}>
          <strong style={{ color: '#111' }}>See your full acquisition funnel.</strong> Connect GA4 & Google Ads to add impressions and traffic on top of your HubSpot lead data.
          <button onClick={() => onNavigate?.('integrations')} style={{ display: 'block', marginTop: 6, fontSize: 11, fontWeight: 700, color: '#FF7A59', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>Connect integrations →</button>
        </div>
      </div>

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

      <div style={CARD}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 10 }}>Acquisition funnel — Lead → MQL → SQL</div>
        <FunnelChart funnelStages={stages} biggestLeak={funnel.biggestLeak} />
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
