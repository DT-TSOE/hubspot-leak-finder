import React from 'react';
import MarketingPipeline from './MarketingPipeline';
import SalesPipeline from './SalesPipeline';

export default function GrowthFunnel({ funnelData, onNavigate, days, tab, onTab }) {
  return (
    <div>
      <div style={{ display: 'inline-flex', background: '#F3F4F6', borderRadius: 10, padding: 3, marginBottom: 14 }}>
        {['marketing', 'sales'].map(id => {
          const active = tab === id;
          return (
            <button key={id} onClick={() => onTab(id)}
              style={{ padding: '7px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: active ? '#fff' : 'transparent', boxShadow: active ? '0 1px 3px rgba(0,0,0,.08)' : 'none' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: active ? '#111' : '#777', textTransform: 'capitalize' }}>{id}</span>
            </button>
          );
        })}
      </div>

      {tab === 'marketing' && <MarketingPipeline funnelData={funnelData} onNavigate={onNavigate} />}
      {tab === 'sales' && <SalesPipeline funnelData={funnelData} days={days} />}
    </div>
  );
}
