import React, { useState } from 'react';

const DIRECTION_CONFIG = {
  improving: { color: '#0E7C6D', bg: 'rgba(46,191,154,0.08)', border: 'rgba(46,191,154,0.3)', icon: '↑', label: 'Improving' },
  declining:  { color: '#C2410C', bg: 'rgba(232,86,42,0.08)', border: 'rgba(232,86,42,0.25)', icon: '↓', label: 'Declining' },
  stable:     { color: '#1B72C7', bg: 'rgba(27,114,199,0.08)', border: 'rgba(27,114,199,0.25)', icon: '→', label: 'Stable' },
};

function TrendCard({ trend }) {
  if (!trend) return null;
  const d = DIRECTION_CONFIG[trend.direction] || DIRECTION_CONFIG.stable;
  const halfDays = Math.round(trend.periodDays / 2);

  return (
    <div style={{ background: d.bg, border: `1px solid ${d.border}`, borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: d.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#fff', fontWeight: 800, flexShrink: 0 }}>
          {d.icon}
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: d.color, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Pipeline {d.label}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>
            Lead-to-MQL conversion {trend.direction === 'stable' ? 'is holding steady' : `${trend.direction === 'improving' ? 'up' : 'down'} ${Math.abs(trend.change)}pp`} vs the first half of this period
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
        <div style={{ background: '#fff', borderRadius: 7, padding: '8px 12px', flex: 1 }}>
          <div style={{ color: '#888', marginBottom: 2 }}>First {halfDays} days</div>
          <div style={{ fontWeight: 700, color: '#111', fontSize: 15 }}>{trend.firstHalf.mqlRate}%</div>
          <div style={{ color: '#888', fontSize: 11 }}>{trend.firstHalf.count} leads</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', color: '#ccc', fontSize: 16 }}>→</div>
        <div style={{ background: '#fff', borderRadius: 7, padding: '8px 12px', flex: 1, border: `1px solid ${d.border}` }}>
          <div style={{ color: '#888', marginBottom: 2 }}>Last {halfDays} days</div>
          <div style={{ fontWeight: 700, color: d.color, fontSize: 15 }}>{trend.secondHalf.mqlRate}%</div>
          <div style={{ color: '#888', fontSize: 11 }}>{trend.secondHalf.count} leads</div>
        </div>
      </div>
    </div>
  );
}

function StageInsightRow({ insight }) {
  const [expanded, setExpanded] = useState(false);
  const advRate = insight.total > 0 ? Math.round((insight.advanced.count / insight.total) * 100) : 0;
  const hasComparison = insight.advanced.medianTouches != null && insight.dropped.medianTouches != null;

  return (
    <div style={{ borderBottom: '1px solid #F3F4F6', paddingBottom: 12, marginBottom: 12 }}>
      <button onClick={() => setExpanded(e => !e)}
        style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: expanded ? 10 : 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{insight.label} to {insight.nextLabel}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#243A52', background: '#F3F4F6', padding: '2px 8px', borderRadius: 8 }}>
                {advRate}% advance
              </span>
            </div>
            {insight.predictor && !expanded && (
              <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }} className="truncate">
                {insight.predictor.slice(0, 100)}{insight.predictor.length > 100 ? '…' : ''}
              </div>
            )}
          </div>
          <span style={{ color: '#aaa', fontSize: 14, transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }}>›</span>
        </div>
      </button>

      {expanded && (
        <div>
          {/* Advanced vs Dropped comparison */}
          {hasComparison && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <div style={{ background: 'rgba(46,191,154,0.06)', border: '1px solid rgba(46,191,154,0.25)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#0E7C6D', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
                  Contacts that advanced ({insight.advanced.count})
                </div>
                {insight.advanced.medianTouches != null && (
                  <div style={{ fontSize: 12, color: '#333', marginBottom: 3 }}>
                    <strong>{insight.advanced.medianTouches}</strong> median touches
                  </div>
                )}
                {insight.advanced.medianDaysToAdvance != null && (
                  <div style={{ fontSize: 12, color: '#333' }}>
                    Advanced in <strong>{insight.advanced.medianDaysToAdvance} days</strong>
                  </div>
                )}
              </div>
              <div style={{ background: '#F7F8FA', border: '1px solid #E2E5EA', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
                  Contacts that stalled ({insight.dropped.count})
                </div>
                {insight.dropped.medianTouches != null && (
                  <div style={{ fontSize: 12, color: '#333', marginBottom: 3 }}>
                    <strong>{insight.dropped.medianTouches}</strong> median touches
                  </div>
                )}
                {insight.dropped.medianDaysStuck != null && (
                  <div style={{ fontSize: 12, color: '#333' }}>
                    Sitting for <strong>{insight.dropped.medianDaysStuck} days</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Predictor */}
          {insight.predictor && (
            <div style={{ background: '#F7F8FA', border: '1px solid #E2E5EA', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#555', lineHeight: 1.6 }}>
              <strong>Pattern:</strong> {insight.predictor}
            </div>
          )}

          {/* Ask PipeCoach */}
          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => window.dispatchEvent(new CustomEvent('pipecoach:open', { detail: { message: `My ${insight.label} to ${insight.nextLabel} conversion rate is ${advRate}%. ${insight.predictor || ''} What specific actions should I take in HubSpot to improve this conversion rate?` } }))}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#111', border: 'none', borderRadius: 7, padding: '6px 12px', cursor: 'pointer' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>Ask PipeCoach how to fix this</span>
              <span style={{ color: '#4CAF50' }}>→</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PipelineInsights({ stageInsights, trend }) {
  const hasData = (stageInsights?.length > 0) || trend;
  if (!hasData) return null;

  return (
    <div style={{ background: '#fff', border: '1px solid #E2E5EA', borderRadius: 10, padding: '14px 18px', marginTop: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 14 }}>What is driving this</div>

      <TrendCard trend={trend} />

      {stageInsights?.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>
            Stage-by-stage behavior - what separates contacts that advance from those that stall
          </div>
          {stageInsights.map(insight => (
            <StageInsightRow key={insight.stage} insight={insight} />
          ))}
        </div>
      )}
    </div>
  );
}
