import React, { useState, useRef, useEffect } from 'react';

const PRESETS = [
  { label: 'All time',      days: null },
  { label: 'Last 7 days',   days: 7 },
  { label: 'Last 30 days',  days: 30 },
  { label: 'Last 60 days',  days: 60 },
  { label: 'Last 90 days',  days: 90 },
  { label: 'Last 6 months', days: 180 },
  { label: 'Last year',     days: 365 },
];

function getLabel(days) {
  const p = PRESETS.find(p => p.days === days);
  return p ? p.label : 'All time';
}

function getSubLabel(days) {
  if (!days) return 'All available data';
  const end = new Date();
  const start = new Date(Date.now() - days * 86400000);
  const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${fmt(start)} - ${fmt(end)}`;
}

export default function DateRangePicker({ days, onChange, locked, onLocked }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (presetDays) => {
    if (locked && presetDays) { onLocked?.(); return; }
    onChange(presetDays);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 12px', borderRadius: 8,
          border: `1px solid ${open ? '#6366F1' : '#E2E5EA'}`,
          background: open ? '#F5F3FF' : '#fff',
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="1" y="2.5" width="12" height="10.5" rx="1.5" stroke="#6366F1" strokeWidth="1.2"/>
          <path d="M1 5.5h12" stroke="#6366F1" strokeWidth="1.2"/>
          <path d="M4 1v3M10 1v3" stroke="#6366F1" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#111', lineHeight: 1.2 }}>{getLabel(days)}</div>
          <div style={{ fontSize: 10, color: '#888', lineHeight: 1.2 }}>{getSubLabel(days)}</div>
        </div>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ marginLeft: 2, flexShrink: 0 }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="#888" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 200,
          background: '#fff', border: '1px solid #E2E5EA', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,.10)', minWidth: 200, overflow: 'hidden',
        }}>
          <div style={{ padding: '6px 0' }}>
            {PRESETS.map(preset => {
              const active = preset.days === days;
              return (
                <button
                  key={preset.label}
                  onClick={() => handleSelect(preset.days)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '8px 16px',
                    border: 'none', cursor: 'pointer', fontSize: 13,
                    background: active ? '#F5F3FF' : 'transparent',
                    color: active ? '#6366F1' : '#333',
                    fontWeight: active ? 700 : 400,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  {preset.label}
                  {active && <span style={{ color: '#6366F1', fontSize: 14 }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
