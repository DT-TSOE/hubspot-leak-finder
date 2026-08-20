import React, { useState } from 'react';

// Horizontal distribution bars — a quick-insight chart for a breakdown
// (e.g. urgency: Critical/High/Medium, or risk: high/medium/low).
// items: [{ label, count, color }]
export function DistributionBars({ items }) {
  const max = Math.max(1, ...items.map(i => i.count));
  const total = items.reduce((s, i) => s + i.count, 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map(it => (
        <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 82, flexShrink: 0, fontSize: 11.5, color: '#555', fontWeight: 600 }}>{it.label}</div>
          <div style={{ flex: 1, height: 16, background: '#F0F1F4', borderRadius: 5, overflow: 'hidden' }}>
            <div style={{ width: `${(it.count / max) * 100}%`, minWidth: it.count > 0 ? 5 : 0, height: '100%', background: it.color, borderRadius: 5, transition: 'width .35s ease' }} />
          </div>
          <div style={{ width: 84, flexShrink: 0, textAlign: 'right', fontSize: 12.5, color: '#111', fontWeight: 700 }}>
            {it.count.toLocaleString()}
            <span style={{ fontSize: 10.5, color: '#aaa', fontWeight: 500 }}>{total ? ` · ${Math.round((it.count / total) * 100)}%` : ''}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// A section card whose detail body collapses. The `summary` (a quick-insight
// chart) stays visible; clicking the header expands/collapses `children`.
export function CollapsibleCard({ title, subtitle, count, summary, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E5EA', borderRadius: 12, marginBottom: 12, overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px 12px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>
            {title}{count != null && <span style={{ color: '#9CA3AF', fontWeight: 600 }}> · {count.toLocaleString()}</span>}
          </div>
          {subtitle && <div style={{ fontSize: 11.5, color: '#888', marginTop: 2 }}>{subtitle}</div>}
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          {open ? 'Hide' : 'Details'}
          <span style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .2s', display: 'inline-block' }}>▸</span>
        </span>
      </button>
      {summary && <div style={{ padding: '2px 18px 16px' }}>{summary}</div>}
      {open && <div style={{ padding: '14px 18px 18px', borderTop: '1px solid #F3F4F6' }}>{children}</div>}
    </div>
  );
}
