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

  // Plausible placeholder values so the locked funnel feels like real data is
  // right there behind the blur (scaled off actual lead volume when available).
  const impressions = (leadCount > 0 ? leadCount * 420 : 48200).toLocaleString();
  const traffic = (leadCount > 0 ? leadCount * 26 : 3140).toLocaleString();

  return (
    <div>
      {/* Locked top-of-funnel — Impressions & Traffic (needs GA4 / Google Ads) */}
      <div style={{ ...CARD, borderStyle: 'dashed', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', gap: 8, flex: 1 }}>
          {[{ label: 'Impressions', val: impressions }, { label: 'Traffic', val: traffic }].map(s => (
            <div key={s.label} style={{ position: 'relative', flex: 1, textAlign: 'center', padding: '10px 8px', background: '#F7F8FA', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ fontSize: 10, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.05em' }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#5B6472', filter: 'blur(2.5px)', userSelect: 'none' }}>{s.val}</div>
              <div style={{ position: 'absolute', top: 6, right: 8, fontSize: 11 }}>🔒</div>
            </div>
          ))}
        </div>
        <div style={{ flex: 1.4, fontSize: 12, color: '#666', lineHeight: 1.5 }}>
          <strong style={{ color: '#111' }}>Your full acquisition funnel is one click away.</strong> Connect GA4 & Google Ads to see impressions and traffic on top of your HubSpot lead data.
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
        <div style={{ fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 10 }}>Acquisition funnel — Impressions → Traffic → Lead → MQL → SQL</div>
        {/* Locked top-of-funnel bars — tapering into the real funnel below */}
        {[{ label: 'Impressions', val: impressions, w: '100%' }, { label: 'Traffic', val: traffic, w: '84%' }].map(s => (
          <div key={s.label} onClick={() => onNavigate?.('integrations')} title="Connect GA4 & Google Ads to unlock"
            style={{ position: 'relative', width: s.w, margin: '0 auto 6px', height: 38, borderRadius: 7, cursor: 'pointer', overflow: 'hidden',
              background: '#EEF1F5', border: '1px dashed #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px' }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#7A8493', filter: 'blur(2px)', userSelect: 'none' }}>{s.label}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#5B6472', filter: 'blur(2.5px)', userSelect: 'none' }}>{s.val}</span>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <span style={{ fontSize: 12 }}>🔒</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#FF7A59' }}>Unlock →</span>
            </div>
          </div>
        ))}
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
