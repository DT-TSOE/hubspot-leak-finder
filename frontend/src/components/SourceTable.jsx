import React from 'react';

export default function SourceTable({ sources }) {
  if (!sources?.length) {
    return (
      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
        Not enough closed deal data to show source performance.
      </p>
    );
  }

  const maxRate = Math.max(...sources.map(s => s.winRate));

  return (
    <div>
      {sources.map((s, i) => (
        <div key={s.source} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>
              {s.source || 'Unknown'}
            </span>
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
              {s.won}/{s.total} · <span style={{
                fontWeight: 500,
                color: s.winRate > 50 ? '#059669' : s.winRate > 25 ? '#D97706' : '#DC2626'
              }}>{s.winRate}%</span>
            </span>
          </div>
          <div style={{
            height: 8,
            borderRadius: 4,
            background: 'var(--color-background-secondary)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${(s.winRate / maxRate) * 100}%`,
              background: i === 0 ? '#10B981' : '#6B7280',
              borderRadius: 4,
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}
