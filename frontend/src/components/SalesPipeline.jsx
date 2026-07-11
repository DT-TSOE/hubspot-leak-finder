import React, { useState, useEffect } from 'react';
import FunnelChart from './FunnelChart';
import StageTimingTable from './StageTimingTable';
import { DealStageTable } from './Scorecard';
import { api } from '../utils/api';

const CARD = { background: '#fff', border: '1px solid #E2E5EA', borderRadius: 10, padding: '14px 16px', marginBottom: 12 };
const SALES_STAGES = ['SQL', 'Opportunity', 'Customer'];
const SALES_TIMING_KEYS = ['salesqualifiedlead_to_opportunity', 'opportunity_to_customer'];

// Sales funnel: SQL → deal stages. Lifecycle SQL→Opp→Customer plus the real
// deal-stage conversion table (fetched from the scorecard endpoint).
export default function SalesPipeline({ funnelData }) {
  const [scorecard, setScorecard] = useState(null);
  useEffect(() => { api.getScorecard().then(setScorecard).catch(() => {}); }, []);

  if (!funnelData?.funnel) return <div style={{ textAlign: 'center', padding: '3rem', color: '#888', fontSize: 13 }}>Loading sales funnel…</div>;
  const { funnel } = funnelData;
  const stages = funnel.funnelStages.filter(s => SALES_STAGES.includes(s.label));
  const timings = Object.fromEntries(Object.entries(funnel.stageTimes || {}).filter(([k]) => SALES_TIMING_KEYS.includes(k)));
  const sqlCount = stages[0]?.count || 0;
  const custCount = stages[stages.length - 1]?.count || 0;
  const conv = sqlCount > 0 ? ((custCount / sqlCount) * 100).toFixed(1) : '0';

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 12 }}>
        {[
          { label: 'SQLs', value: sqlCount.toLocaleString(), color: '#111' },
          { label: 'Customers', value: custCount.toLocaleString(), color: '#FF7A59' },
          { label: 'SQL → Customer', value: `${conv}%`, color: parseFloat(conv) < 20 ? '#EF4444' : '#059669' },
        ].map(m => (
          <div key={m.label} style={{ background: '#fff', border: '1px solid #E2E5EA', borderRadius: 10, padding: '13px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div style={CARD}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 10 }}>Sales funnel — SQL → Opportunity → Customer</div>
        <FunnelChart funnelStages={stages} biggestLeak={funnel.biggestLeak} />
      </div>

      {/* Real deal-stage conversion (created→won + per-stage) */}
      {scorecard?.dealStageConversion?.[0] && <DealStageTable pipeline={scorecard.dealStageConversion[0]} />}

      {Object.keys(timings).length > 0 && (
        <div style={CARD}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 10 }}>Time between sales stages</div>
          <StageTimingTable stageTimes={timings} />
        </div>
      )}
    </div>
  );
}
