import React, { useState, useRef, useEffect } from 'react';

const PRESETS = [
  { label: 'All time',      value: null },
  { label: 'Last 7 days',   value: 7 },
  { label: 'Last 30 days',  value: 30 },
  { label: 'Last 60 days',  value: 60 },
  { label: 'Last 90 days',  value: 90 },
  { label: 'Last 6 months', value: 180 },
  { label: 'Last year',     value: 365 },
];

const fmt = d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const toInputDate = d => new Date(d).toISOString().split('T')[0];
const today = () => toInputDate(Date.now());
const daysAgoStr = n => toInputDate(Date.now() - n * 86400000);

function getLabel(value) {
  if (!value) return 'All time';
  if (typeof value === 'number') return PRESETS.find(p => p.value === value)?.label || 'Custom';
  return `${fmt(value.start)} - ${fmt(value.end)}`;
}

function getSubLabel(value) {
  if (!value) return 'All available data';
  if (typeof value === 'number') {
    return `${fmt(daysAgoStr(value))} - ${fmt(Date.now())}`;
  }
  return `${fmt(value.start)} to ${fmt(value.end)}`;
}

export default function DateRangePicker({ value, onChange, locked, onLocked }) {
  const [open, setOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [startDate, setStartDate] = useState(daysAgoStr(30));
  const [endDate, setEndDate] = useState(today());
  const ref = useRef(null);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setShowCustom(false); } };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handlePreset = (preset) => {
    if (locked && preset !== null) { onLocked?.(); return; }
    onChange(preset);
    setOpen(false);
    setShowCustom(false);
  };

  const handleCustomApply = () => {
    if (!startDate || !endDate) return;
    if (locked) { onLocked?.(); return; }
    onChange({ start: startDate, end: endDate });
    setOpen(false);
    setShowCustom(false);
  };

  const isCustom = value && typeof value === 'object';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => { setOpen(o => !o); setShowCustom(false); }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 12px', borderRadius: 8,
          border: `1px solid ${open ? '#6366F1' : '#E2E5EA'}`,
          background: open ? '#F5F3FF' : '#fff',
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="1" y="2.5" width="12" height="10.5" rx="1.5" stroke="#6366F1" strokeWidth="1.2"/>
          <path d="M1 5.5h12" stroke="#6366F1" strokeWidth="1.2"/>
          <path d="M4 1v3M10 1v3" stroke="#6366F1" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#111', lineHeight: 1.2 }}>{getLabel(value)}</div>
          <div style={{ fontSize: 10, color: '#888', lineHeight: 1.2 }}>{getSubLabel(value)}</div>
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
          {!showCustom ? (
            <div style={{ padding: '6px 0' }}>
              {PRESETS.map(preset => {
                const active = value === preset.value && !isCustom;
                return (
                  <button key={String(preset.value)} onClick={() => handlePreset(preset.value)}
                    style={{ width: '100%', textAlign: 'left', padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 13, background: active ? '#F5F3FF' : 'transparent', color: active ? '#6366F1' : '#333', fontWeight: active ? 700 : 400, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {preset.label}
                    {active && <span style={{ color: '#6366F1' }}>✓</span>}
                  </button>
                );
              })}
              <div style={{ borderTop: '1px solid #F3F4F6', margin: '4px 0' }} />
              <button onClick={() => { setShowCustom(true); if (isCustom) { setStartDate(value.start); setEndDate(value.end); } }}
                style={{ width: '100%', textAlign: 'left', padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 13, background: isCustom ? '#F5F3FF' : 'transparent', color: isCustom ? '#6366F1' : '#555', fontWeight: isCustom ? 700 : 400, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                Custom range
                {isCustom && <span style={{ color: '#6366F1' }}>✓</span>}
              </button>
            </div>
          ) : (
            <div style={{ padding: '14px 16px', width: 260 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>Custom range</span>
                <button onClick={() => setShowCustom(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#aaa', lineHeight: 1 }}>←</button>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 4 }}>Start date</label>
                <input type="date" value={startDate} max={endDate || today()} onChange={e => setStartDate(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #E2E5EA', fontSize: 12, background: '#F7F8FA', color: '#111', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 4 }}>End date</label>
                <input type="date" value={endDate} min={startDate} max={today()} onChange={e => setEndDate(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #E2E5EA', fontSize: 12, background: '#F7F8FA', color: '#111', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowCustom(false)}
                  style={{ flex: 1, padding: '8px', borderRadius: 7, border: '1px solid #E2E5EA', background: '#fff', fontSize: 12, cursor: 'pointer', color: '#666' }}>
                  Cancel
                </button>
                <button onClick={handleCustomApply} disabled={!startDate || !endDate || startDate > endDate}
                  style={{ flex: 1, padding: '8px', borderRadius: 7, border: 'none', background: '#6366F1', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#fff', opacity: (!startDate || !endDate || startDate > endDate) ? 0.5 : 1 }}>
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
