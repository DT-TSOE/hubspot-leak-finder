import React, { useState } from 'react';
import { api } from '../utils/api';

const fmtH = h => h == null ? '-' : h < 1 ? `${Math.round(h * 60)}m` : h < 48 ? `${Math.round(h)}h` : `${Math.round(h / 24)}d`;
const fmtDays = d => d == null ? '-' : d < 7 ? `${Math.round(d)}d` : d < 60 ? `${Math.round(d / 7)}w` : `${Math.round(d / 30)}mo`;

export default function GoalsModal({ data, dealProfiles, existingGoals, onClose, onSave }) {
  const fc = dealProfiles && !dealProfiles.insufficient ? dealProfiles.fastestClose : null;
  const salesDims = data?.sales?.dimensions || [];
  const mktDims = data?.marketing?.dimensions || [];

  const winRateDim = salesDims.find(d => d.key === 'winRate');
  const speedDim = salesDims.find(d => d.key === 'speedToLead');
  const cycleDim = salesDims.find(d => d.key === 'salesCycle');
  const coverageDim = mktDims.find(d => d.key === 'followUpCoverage');

  const METRICS = [
    {
      key: 'followUpCoverage',
      label: 'Lead Outreach Rate',
      unit: '%',
      current: coverageDim?.value != null ? Math.round(coverageDim.value) : null,
      currentFmt: v => v != null ? `${v}%` : 'No data',
      suggested: 80,
      suggestedNote: 'best practice',
      min: 1, max: 100, step: 5,
      lowerIsBetter: false,
    },
    {
      key: 'winRate',
      label: 'Win rate',
      unit: '%',
      current: winRateDim?.value != null ? Math.round(winRateDim.value) : null,
      currentFmt: v => v != null ? `${v}%` : 'No data',
      suggested: winRateDim?.value != null ? Math.min(70, Math.round(winRateDim.value) + 10) : 35,
      suggestedNote: 'target improvement',
      min: 1, max: 100, step: 1,
      lowerIsBetter: false,
    },
    {
      key: 'speedToLead',
      label: 'First response time',
      unit: 'h',
      current: speedDim?.value != null ? speedDim.value : null,
      currentFmt: fmtH,
      suggested: fc?.speedHours?.median != null ? Math.max(0.5, Math.round(fc.speedHours.median * 2) / 2) : 4,
      suggestedNote: fc?.speedHours?.median != null ? 'your fastest wins' : 'best practice',
      min: 0.5, max: 168, step: 0.5,
      lowerIsBetter: true,
    },
    {
      key: 'salesCycle',
      label: 'Sales cycle',
      unit: 'days',
      current: cycleDim?.value != null ? cycleDim.value : null,
      currentFmt: fmtDays,
      suggested: fc?.cycleRange?.median != null ? Math.max(1, Math.round(fc.cycleRange.median)) : 21,
      suggestedNote: fc?.cycleRange?.median != null ? 'your fastest wins' : 'best practice',
      min: 1, max: 365, step: 1,
      lowerIsBetter: true,
    },
  ];

  const [goals, setGoals] = useState(() => {
    const g = {};
    METRICS.forEach(m => { g[m.key] = existingGoals?.[m.key] ?? m.suggested; });
    return g;
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try { await api.saveGoals(goals); onSave(goals); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,.55)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '40px 16px' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, padding: '26px 28px', boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#43A047', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>Your targets</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#111', marginBottom: 4 }}>What does good look like for you?</div>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 24, lineHeight: 1.5 }}>
          Suggested targets come from your fastest-closing deals. Accept them or set your own -- your health meters will show how close you are to each goal.
        </div>

        {METRICS.map(m => {
          const val = goals[m.key];
          const pct = m.current != null && val > 0
            ? Math.min(100, Math.round(m.lowerIsBetter ? (val / m.current) * 100 : (m.current / val) * 100))
            : null;
          const barColor = pct == null ? '#ccc' : pct >= 100 ? '#10B981' : pct >= 60 ? '#D97706' : '#EF4444';
          const isDefault = val === m.suggested;

          return (
            <div key={m.key} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #F3F4F6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{m.label}</div>
                <div style={{ fontSize: 11, color: '#aaa' }}>
                  Currently: <span style={{ color: '#555', fontWeight: 600 }}>{m.currentFmt(m.current)}</span>
                </div>
              </div>

              {pct != null && (
                <div style={{ position: 'relative', height: 5, borderRadius: 3, background: '#F0F1F4', overflow: 'hidden', marginBottom: 10 }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '40%', background: 'rgba(239,68,68,.13)' }} />
                  <div style={{ position: 'absolute', left: '40%', top: 0, bottom: 0, width: '30%', background: 'rgba(217,119,6,.13)' }} />
                  <div style={{ position: 'absolute', left: '70%', top: 0, bottom: 0, right: 0, background: 'rgba(16,185,129,.13)' }} />
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: barColor, borderRadius: 3, transition: 'width .3s' }} />
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ fontSize: 10.5, color: '#aaa' }}>
                  Target <span style={{ color: '#6366F1', fontWeight: 600 }}>({m.suggestedNote})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {!isDefault && (
                    <button onClick={() => setGoals(g => ({ ...g, [m.key]: m.suggested }))}
                      style={{ fontSize: 10.5, color: '#6366F1', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                      reset
                    </button>
                  )}
                  <input
                    type="number"
                    value={val}
                    min={m.min}
                    max={m.max}
                    step={m.step}
                    onChange={e => { const n = parseFloat(e.target.value); if (!isNaN(n)) setGoals(g => ({ ...g, [m.key]: n })); }}
                    style={{ width: 72, padding: '5px 8px', borderRadius: 7, border: '1px solid #E2E5EA', fontSize: 14, fontWeight: 700, color: '#111', textAlign: 'center', background: '#F7F8FA' }}
                  />
                  <span style={{ fontSize: 12, color: '#888', minWidth: 28 }}>{m.unit}</span>
                </div>
              </div>
            </div>
          );
        })}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
          <button disabled={saving} onClick={save}
            style={{ flex: 1, background: '#111', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : 'Save my targets'}
          </button>
          {onClose && <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#999', fontSize: 13, cursor: 'pointer' }}>Cancel</button>}
        </div>
      </div>
    </div>
  );
}
