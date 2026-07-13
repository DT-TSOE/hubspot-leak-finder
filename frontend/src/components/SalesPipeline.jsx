import React, { useState, useEffect } from 'react';
import StageTimingTable from './StageTimingTable';
import { DealStageTable } from './Scorecard';
import { api } from '../utils/api';

const CARD = { background: '#fff', border: '1px solid #E2E5EA', borderRadius: 10, padding: '14px 16px', marginBottom: 12 };
const fmt$ = n => '$' + Math.round(n || 0).toLocaleString();
const fmtH = h => h == null ? '-' : h < 1 ? `${Math.round(h * 60)}m` : h < 48 ? `${Math.round(h)}h` : `${Math.round(h / 24)}d`;
const fmtDays = d => d == null ? '-' : d < 7 ? `${Math.round(d)}d` : d < 60 ? `${Math.round(d / 7)}w` : `${Math.round(d / 30)}mo`;

const SALES_TIMING_KEYS = ['salesqualifiedlead_to_opportunity', 'opportunity_to_customer'];

const STAGE_COLORS = ['#6366F1', '#8B5CF6', '#A855F7', '#EC4899', '#F59E0B', '#10B981'];

function DealFunnel({ pipeline }) {
  if (!pipeline) return null;

  // When stage data is available, show per-stage bars
  const stages = (pipeline.stages || []).filter(s => s.everReached > 0);
  const hasStages = stages.length >= 2 && !pipeline.skipHeavy;

  if (hasStages) {
    const max = stages[0].everReached;
    return (
      <div>
        {stages.map((s, i) => {
          const pct = max > 0 ? (s.everReached / max) * 100 : 0;
          const prev = stages[i - 1];
          const dropPct = prev ? Math.round(((prev.everReached - s.everReached) / prev.everReached) * 100) : null;
          const dropColor = dropPct === null ? null : dropPct > 60 ? '#EF4444' : dropPct > 35 ? '#F59E0B' : '#10B981';
          const color = STAGE_COLORS[i % STAGE_COLORS.length];
          const convColor = s.conversionPct === null ? '#ccc' : s.conversionPct >= 30 ? '#059669' : s.conversionPct >= 15 ? '#D97706' : '#EF4444';
          return (
            <div key={s.stageId}>
              {i > 0 && dropPct !== null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0 3px 2px', marginBottom: 3 }}>
                  <div style={{ width: 2, height: 14, background: `${dropColor}50`, borderRadius: 1, marginLeft: 6, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: dropColor }}>↓ {dropPct}% drop-off</span>
                  <span style={{ fontSize: 11, color: '#aaa' }}>({prev.everReached - s.everReached} left {prev.label})</span>
                </div>
              )}
              <div style={{ marginBottom: i < stages.length - 1 ? 3 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{s.label}</span>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <span style={{ fontSize: 12, color: '#888' }}>{s.everReached.toLocaleString()} deals</span>
                    {s.conversionPct !== null && <span style={{ fontSize: 12, fontWeight: 700, color: convColor }}>{s.conversionPct}% won</span>}
                  </div>
                </div>
                <div style={{ height: 26, borderRadius: 6, background: '#F3F4F6', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 6, display: 'flex', alignItems: 'center', paddingLeft: pct > 15 ? 10 : 0, transition: 'width .6s ease' }}>
                    {pct > 15 && <span style={{ fontSize: 11, color: 'rgba(255,255,255,.9)', fontWeight: 700 }}>{Math.round(pct)}%</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Fallback: simple Created → Won two-bar funnel (always works)
  const total = pipeline.dealCount || 0;
  const won = pipeline.won || 0;
  const winPct = total > 0 ? Math.round((won / total) * 100) : 0;
  if (total === 0) return null;
  const bars = [
    { label: 'Deals created', count: total, pct: 100, color: '#6366F1' },
    { label: 'Deals won', count: won, pct: winPct, color: '#10B981' },
  ];
  return (
    <div>
      {bars.map((b, i) => {
        const prev = bars[i - 1];
        const dropPct = prev ? 100 - Math.round((b.count / prev.count) * 100) : null;
        return (
          <div key={b.label}>
            {dropPct !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0 3px 2px', marginBottom: 3 }}>
                <div style={{ width: 2, height: 14, background: 'rgba(239,68,68,.3)', borderRadius: 1, marginLeft: 6, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#EF4444' }}>↓ {dropPct}% didn't close</span>
                <span style={{ fontSize: 11, color: '#aaa' }}>({total - won} deals lost or open)</span>
              </div>
            )}
            <div style={{ marginBottom: i < bars.length - 1 ? 3 : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{b.label}</span>
                <span style={{ fontSize: 12, color: '#888' }}>{b.count.toLocaleString()}</span>
              </div>
              <div style={{ height: 26, borderRadius: 6, background: '#F3F4F6', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${b.pct}%`, background: b.color, borderRadius: 6, display: 'flex', alignItems: 'center', paddingLeft: b.pct > 15 ? 10 : 0, transition: 'width .6s ease' }}>
                  {b.pct > 15 && <span style={{ fontSize: 11, color: 'rgba(255,255,255,.9)', fontWeight: 700 }}>{b.pct}%</span>}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function SalesPipeline({ funnelData, days }) {
  const [scorecard, setScorecard] = useState(null);
  const [pipelineIdx, setPipelineIdx] = useState(0);

  useEffect(() => {
    setScorecard(null);
    api.getScorecard(days).then(setScorecard).catch(() => {});
  }, [days]);

  const timings = funnelData?.funnel
    ? Object.fromEntries(Object.entries(funnelData.funnel.stageTimes || {}).filter(([k]) => SALES_TIMING_KEYS.includes(k)))
    : {};

  const salesDims = scorecard?.sales?.dimensions || [];
  const winRateDim = salesDims.find(d => d.key === 'winRate');
  const speedDim = salesDims.find(d => d.key === 'speedToLead');
  const cycleDim = salesDims.find(d => d.key === 'salesCycle');
  const openPipeline = scorecard?.openPipelineValue ?? 0;
  const avgDeal = scorecard?.context?.avgDealSize ?? 0;

  const statCards = [
    winRateDim?.value != null && { label: 'Win Rate', value: `${Math.round(winRateDim.value)}%`, color: winRateDim.value >= 30 ? '#059669' : '#EF4444' },
    avgDeal > 0 && { label: 'Avg Deal Size', value: fmt$(avgDeal), color: '#111' },
    openPipeline > 0 && { label: 'Open Pipeline', value: fmt$(openPipeline), color: '#111' },
    speedDim?.value != null && { label: 'Speed to Lead', value: fmtH(speedDim.value), color: speedDim.value <= 4 ? '#059669' : speedDim.value <= 24 ? '#D97706' : '#EF4444' },
    cycleDim?.value != null && { label: 'Avg Sales Cycle', value: fmtDays(cycleDim.value), color: '#111' },
  ].filter(Boolean);

  if (!scorecard && !funnelData) {
    return <div style={{ textAlign: 'center', padding: '3rem', color: '#888', fontSize: 13 }}>Loading sales data…</div>;
  }

  return (
    <div>
      {/* Key deal metrics */}
      {statCards.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${statCards.length}, 1fr)`, gap: 10, marginBottom: 12 }}>
          {statCards.map(m => (
            <div key={m.label} style={{ background: '#fff', border: '1px solid #E2E5EA', borderRadius: 10, padding: '13px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Deal funnel + conversion breakdown */}
      {scorecard?.dealStageConversion?.length > 0 ? (() => {
        const pipelines = scorecard.dealStageConversion;
        const active = pipelines[Math.min(pipelineIdx, pipelines.length - 1)];
        return (
          <div style={CARD}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>Deal funnel</div>
              {pipelines.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {pipelines.map((p, i) => {
                    const on = i === Math.min(pipelineIdx, pipelines.length - 1);
                    return (
                      <button key={p.pipelineId} onClick={() => setPipelineIdx(i)}
                        style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6, cursor: 'pointer',
                          background: on ? '#111' : '#fff', color: on ? '#fff' : '#555', border: `1px solid ${on ? '#111' : '#E2E5EA'}` }}>
                        {p.pipelineLabel}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <DealFunnel pipeline={active} />
            {!active.skipHeavy && active.stages?.length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #F3F4F6' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Stage breakdown — of deals that entered each stage, % that won</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: '#999', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                      <th style={{ padding: '4px 8px 4px 0', fontWeight: 600 }}>Stage</th>
                      <th style={{ padding: '4px 8px', fontWeight: 600, textAlign: 'right' }}>Entered</th>
                      <th style={{ padding: '4px 0 4px 8px', fontWeight: 600, textAlign: 'right' }}>Win rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {active.stages.map(s => (
                      <tr key={s.stageId} style={{ borderTop: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '7px 8px 7px 0', color: '#333', fontWeight: 500 }}>{s.label}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', color: '#666' }}>{s.everReached}</td>
                        <td style={{ padding: '7px 0 7px 8px', textAlign: 'right', fontWeight: 700, color: s.conversionPct === null ? '#ccc' : s.conversionPct >= 30 ? '#059669' : s.conversionPct >= 15 ? '#D97706' : '#EF4444' }}>
                          {s.conversionPct === null ? <span style={{ color: '#ccc', fontWeight: 400 }}>low sample</span> : `${s.conversionPct}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {active.skipHeavy && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #F3F4F6', fontSize: 12, color: '#888', lineHeight: 1.5 }}>
                Stage-by-stage breakdown isn't available — deals in this pipeline aren't moving through HubSpot stages consistently. The overall win rate above is the most reliable number.
              </div>
            )}
          </div>
        );
      })() : scorecard && (
        <div style={{ ...CARD, textAlign: 'center', color: '#888', fontSize: 13, padding: '2rem' }}>
          No closed deals in this period to calculate conversion.
        </div>
      )}

      {Object.keys(timings).length > 0 && (
        <div style={CARD}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 10 }}>Time between stages</div>
          <StageTimingTable stageTimes={timings} />
        </div>
      )}
    </div>
  );
}
