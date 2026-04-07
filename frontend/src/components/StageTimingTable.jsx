import React from 'react';

export default function StageTimingTable({ stageTimes }) {
  if (!stageTimes || Object.keys(stageTimes).length === 0) {
    return (
      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
        Not enough stage transition data to show timing.
      </p>
    );
  }

  const rows = Object.values(stageTimes);

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--color-border-tertiary)' }}>
            {['Transition', 'Median Days', 'Mean Days', 'Sample'].map(h => (
              <th key={h} style={{
                textAlign: 'left',
                padding: '8px 12px',
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--color-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--color-border-tertiary)' }}>
              <td style={{ padding: '10px 12px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                {row.from} → {row.to}
              </td>
              <td style={{ padding: '10px 12px', color: row.medianDays > 30 ? '#DC2626' : row.medianDays > 14 ? '#D97706' : '#059669' }}>
                {row.medianDays}d
              </td>
              <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>
                {row.meanDays}d
              </td>
              <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>
                {row.sampleSize}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
