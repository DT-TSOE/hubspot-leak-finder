import React, { useState } from 'react';
import MarketingPipeline from './MarketingPipeline';
import SalesPipeline from './SalesPipeline';
import PipelineInsights from './PipelineInsights';

// Single "Growth Funnel" section with Marketing / Sales sub-tabs.
export default function GrowthFunnel({ funnelData, onNavigate }) {
  const [tab, setTab] = useState('marketing');
  const TABS = [
    { id: 'marketing', label: 'Marketing', sub: 'Lead → SQL' },
    { id: 'sales', label: 'Sales', sub: 'SQL → deal stages' },
  ];
  return (
    <div>
      <div style={{ display: 'inline-flex', background: '#F3F4F6', borderRadius: 10, padding: 3, marginBottom: 14 }}>
        {TABS.map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1, padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: active ? '#fff' : 'transparent', boxShadow: active ? '0 1px 3px rgba(0,0,0,.08)' : 'none' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: active ? '#111' : '#777' }}>{t.label}</span>
              <span style={{ fontSize: 10, color: active ? '#999' : '#aaa' }}>{t.sub}</span>
            </button>
          );
        })}
      </div>

      {tab === 'marketing' && <MarketingPipeline funnelData={funnelData} onNavigate={onNavigate} />}
      {tab === 'sales' && (
        <>
          <SalesPipeline funnelData={funnelData} />
          <PipelineInsights stageInsights={funnelData?.stageInsights} trend={funnelData?.trend} />
        </>
      )}
    </div>
  );
}
