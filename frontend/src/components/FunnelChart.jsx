import React from 'react';

const STAGE_COLORS = {
  Lead:        { bar: '#4F6CF7', text: '#fff' },
  MQL:         { bar: '#7C5CFC', text: '#fff' },
  SQL:         { bar: '#A855F7', text: '#fff' },
  Opportunity: { bar: '#EC4899', text: '#fff' },
  Customer:    { bar: '#10B981', text: '#fff' },
};

const LEAK_COLOR = '#FEF3C7';
const LEAK_BORDER = '#F59E0B';

export default function FunnelChart({ funnelStages, biggestLeak }) {
  if (!funnelStages?.length) return null;

  const maxCount = funnelStages[0]?.count || 0;

  return (
    <div style={{ width: '100%' }}>
      {funnelStages.map((stage, i) => {
        const isLeak = biggestLeak?.stage?.stage === stage.stage;
        const pct = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
        const color = STAGE_COLORS[stage.label] || { bar: '#6B7280', text: '#fff' };

        return (
          <div key={stage.stage} style={{ marginBottom: 12 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 4,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--color-text-primary)',
                  minWidth: 100,
                }}>{stage.label}</span>
                {isLeak && (
                  <span style={{
                    fontSize: 11,
                    fontWeight: 500,
                    background: LEAK_COLOR,
                    color: '#92400E',
                    border: `1px solid ${LEAK_BORDER}`,
                    borderRadius: 4,
                    padding: '2px 8px',
                  }}>
                    Biggest leak
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  {stage.count.toLocaleString()} contacts
                </span>
                {i > 0 && (
                  <span style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: stage.conversionRate < 25 ? '#DC2626' : stage.conversionRate < 50 ? '#D97706' : '#059669',
                    minWidth: 48,
                    textAlign: 'right',
                  }}>
                    {stage.conversionRate}%
                  </span>
                )}
              </div>
            </div>

            {/* Bar */}
            <div style={{
              height: 36,
              borderRadius: 6,
              background: 'var(--color-background-secondary)',
              overflow: 'hidden',
              border: isLeak ? `1.5px solid ${LEAK_BORDER}` : '1px solid transparent',
            }}>
              <div style={{
                height: '100%',
                width: `${pct}%`,
                background: color.bar,
                borderRadius: 6,
                transition: 'width 0.6s ease',
                display: 'flex',
                alignItems: 'center',
                paddingLeft: pct > 15 ? 12 : 0,
              }}>
                {pct > 15 && (
                  <span style={{ fontSize: 12, color: color.text, fontWeight: 500 }}>
                    {Math.round(pct)}% of total
                  </span>
                )}
              </div>
            </div>

            {/* Drop-off indicator */}
            {i > 0 && stage.dropOff > 0 && (
              <div style={{
                marginTop: 4,
                fontSize: 12,
                color: 'var(--color-text-secondary)',
                paddingLeft: 4,
              }}>
                ↓ {stage.dropOff.toLocaleString()} dropped off here
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
