import React from 'react';
import MarketingPipeline from './MarketingPipeline';
import SalesPipeline from './SalesPipeline';

const TAB_META = {
  marketing: { label: 'Marketing', sub: 'Lead gen & qualification' },
  sales: { label: 'Sales', sub: 'Pipeline & conversion' },
};

export default function GrowthFunnel({ funnelData, onNavigate, days, tab, onTab }) {
  return (
    <div>
      {/* HubSpot-style underline tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid #E2E5EA', marginBottom: 20, gap: 0 }}>
        {['marketing', 'sales'].map(id => {
          const active = tab === id;
          const meta = TAB_META[id];
          return (
            <button key={id} onClick={() => onTab(id)}
              style={{ padding: '10px 24px 10px', border: 'none', background: 'transparent', cursor: 'pointer', position: 'relative', marginBottom: -2, textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? '#243A52' : '#6B7280', lineHeight: 1.2 }}>{meta.label}</div>
              <div style={{ fontSize: 11, color: active ? '#0091AE' : '#9CA3AF', marginTop: 2 }}>{meta.sub}</div>
              {active && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: '#0091AE', borderRadius: '2px 2px 0 0' }} />}
            </button>
          );
        })}
      </div>

      {tab === 'marketing' && <MarketingPipeline funnelData={funnelData} onNavigate={onNavigate} />}
      {tab === 'sales' && <SalesPipeline funnelData={funnelData} days={days} />}
    </div>
  );
}
