import React, { useState } from 'react';

const SEVERITY_STYLES = {
  high:   { bg: '#FEF2F2', border: '#FECACA', badge: '#DC2626', badgeBg: '#FEE2E2', label: 'High priority' },
  medium: { bg: '#FFFBEB', border: '#FDE68A', badge: '#D97706', badgeBg: '#FEF3C7', label: 'Medium priority' },
  low:    { bg: '#F0FDF4', border: '#BBF7D0', badge: '#059669', badgeBg: '#DCFCE7', label: 'Low priority' },
};

const TYPE_ICONS = {
  'Funnel Leak':       '◈',
  'Speed to Lead':     '⚡',
  'Source Performance':'◎',
  'Engagement Gap':    '⬡',
  'Stage Delay':       '⏱',
};

export default function InsightCard({ insight, index }) {
  const [expanded, setExpanded] = useState(false);
  const sev = SEVERITY_STYLES[insight.severity] || SEVERITY_STYLES.low;
  const icon = TYPE_ICONS[insight.type] || '●';

  return (
    <div
      style={{
        border: `1px solid ${sev.border}`,
        borderRadius: 10,
        background: sev.bg,
        padding: '16px 20px',
        marginBottom: 12,
        cursor: 'pointer',
        transition: 'box-shadow 0.15s',
      }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          fontSize: 20,
          lineHeight: 1,
          marginTop: 2,
          color: sev.badge,
        }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 11,
              fontWeight: 500,
              color: sev.badge,
              background: sev.badgeBg,
              padding: '2px 8px',
              borderRadius: 4,
            }}>
              {insight.type}
            </span>
            <span style={{
              fontSize: 11,
              color: sev.badge,
              background: sev.badgeBg,
              padding: '2px 8px',
              borderRadius: 4,
            }}>
              {sev.label}
            </span>
          </div>
          <p style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 500,
            color: 'var(--color-text-primary)',
            lineHeight: 1.4,
          }}>
            {insight.title}
          </p>
        </div>
        <span style={{
          fontSize: 18,
          color: 'var(--color-text-secondary)',
          transform: expanded ? 'rotate(90deg)' : 'rotate(0)',
          transition: 'transform 0.2s',
          flexShrink: 0,
        }}>›</span>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${sev.border}` }}>
          <div style={{ marginBottom: 12 }}>
            <span style={{
              fontSize: 11,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--color-text-secondary)',
            }}>
              Supporting data
            </span>
            <p style={{
              margin: '4px 0 0',
              fontSize: 14,
              color: 'var(--color-text-primary)',
              lineHeight: 1.5,
            }}>
              {insight.dataPoint}
            </p>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.7)',
            borderRadius: 8,
            padding: '12px 14px',
            border: `1px solid ${sev.border}`,
          }}>
            <span style={{
              fontSize: 11,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: sev.badge,
            }}>
              Recommended action
            </span>
            <p style={{
              margin: '4px 0 0',
              fontSize: 14,
              color: 'var(--color-text-primary)',
              lineHeight: 1.55,
            }}>
              {insight.action}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
