import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import Onboarding from './Onboarding';

const fmt$ = n => '$' + Math.round(n || 0).toLocaleString();
const fmt$k = n => n >= 1000 ? '$' + Math.round(n / 1000) + 'k' : '$' + Math.round(n);
const fmtH = h => h == null ? '-' : h < 1 ? `${Math.round(h * 60)}m` : h < 48 ? `${Math.round(h)}h` : `${Math.round(h / 24)}d`;
const fmtDays = d => d < 7 ? `${d}d` : d < 60 ? `${Math.round(d / 7)}w` : `${Math.round(d / 30)}mo`;

function profileRows(p) {
  return [
    p.valueRange?.median != null && { l: 'Avg deal size', v: fmt$k(p.valueRange.median) },
    p.cycleRange?.median != null && { l: 'Avg time to close', v: fmtDays(p.cycleRange.median) },
    p.touches?.median != null && { l: 'Avg touches', v: `${p.touches.median} touches` },
    p.speedHours?.median != null && { l: 'First response', v: fmtH(p.speedHours.median) },
    p.source && { l: 'Top source', v: `${p.source.pct}% ${p.source.label}` },
  ].filter(Boolean);
}

const GRADE_COLOR = { A: '#10B981', B: '#34D399', C: '#F59E0B', D: '#F97316', F: '#EF4444' };
const scoreColor = s => s === null || s === undefined ? '#ccc' : s >= 70 ? '#10B981' : s >= 50 ? '#F59E0B' : '#EF4444';
const meterColor = s => s == null ? '#ccc' : s >= 70 ? '#10B981' : s >= 40 ? '#D97706' : '#EF4444';

const STATUS_STYLE = {
  good:     { label: 'Good',     bg: '#F0FDF4', color: '#166534', border: '#BBF7D0' },
  watch:    { label: 'Watch',    bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
  critical: { label: 'Critical', bg: '#FEF2F2', color: '#991B1B', border: '#FECACA' },
};

function dimStatus(score) {
  if (score === null || score === undefined) return null;
  return score >= 70 ? 'good' : score >= 40 ? 'watch' : 'critical';
}

function DimensionRow({ dim, comparison }) {
  const status = dimStatus(dim.score);
  const s = status ? STATUS_STYLE[status] : null;
  const mc = meterColor(dim.score);
  const tip = (dim.source || '') + (dim.sample ? `\nBased on ${dim.sample} records.` : '');

  if (dim.showMeter && dim.score != null) {
    const fill = dim.meterFill != null ? dim.meterFill : dim.score;
    return (
      <div title={tip} style={{ padding: '10px 0', borderBottom: '1px solid #F7F8FA', cursor: 'help' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <div style={{ fontSize: 11.5, color: '#888' }}>{dim.label}</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{dim.displayValue || 'No data'}</div>
        </div>
        <div style={{ position: 'relative', height: 6, borderRadius: 4, background: '#F0F1F4', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '40%', background: 'rgba(239,68,68,.13)' }} />
          <div style={{ position: 'absolute', left: '40%', top: 0, bottom: 0, width: '30%', background: 'rgba(217,119,6,.13)' }} />
          <div style={{ position: 'absolute', left: '70%', top: 0, bottom: 0, right: 0, background: 'rgba(16,185,129,.13)' }} />
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${fill}%`, background: mc, borderRadius: 4, transition: 'width .6s ease' }} />
        </div>
        {comparison && <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>{comparison}</div>}
      </div>
    );
  }

  return (
    <div title={tip} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: '1px solid #F7F8FA', cursor: 'help' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11.5, color: '#888', marginBottom: 2 }}>{dim.label}</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{dim.displayValue || (dim.sample ? `${dim.sample} records` : 'No data')}</div>
        {comparison && <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{comparison}</div>}
      </div>
      {s && (
        <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: s.bg, color: s.color, border: `1px solid ${s.border}`, flexShrink: 0, marginTop: 2, whiteSpace: 'nowrap' }}>
          {s.label}
        </span>
      )}
    </div>
  );
}

const GA4_PREVIEW_ROWS = [
  { label: 'Website sessions', value: '1,240 / mo' },
  { label: 'Session → lead rate', value: '2.4%' },
  { label: 'Top traffic channel', value: 'Organic search' },
];

function FunnelCard({ title, subtitle, grade, dimensions, locked, unlockHint, comparisons, showGa4Cta, onTabChange }) {
  const color = grade ? (GRADE_COLOR[grade] || '#ccc') : '#ccc';
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E5EA', borderRadius: 12, padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{title}</div>
          <div style={{ fontSize: 11, color: '#999' }}>{subtitle}</div>
        </div>
        {!locked && grade && (
          <span style={{ fontSize: 26, fontWeight: 800, color }}>{grade}</span>
        )}
      </div>
      <div style={{ filter: locked ? 'blur(5px)' : 'none', userSelect: locked ? 'none' : 'auto', pointerEvents: locked ? 'none' : 'auto' }} aria-hidden={locked}>
        {dimensions.filter(d => !d.hidden).map(d => <DimensionRow key={d.key} dim={d} comparison={comparisons?.[d.key]} />)}
      </div>
      {locked && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 20px', background: 'rgba(255,255,255,.45)' }}>
          <div style={{ fontSize: 22, marginBottom: 6 }}>🔒</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 4 }}>Your {title} grade is locked</div>
          <div style={{ fontSize: 12, color: '#555', lineHeight: 1.5, maxWidth: 260 }}>{unlockHint}</div>
        </div>
      )}
      {showGa4Cta && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #F0F1F4', position: 'relative' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#bbb', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Lead generation</div>
          <div style={{ filter: 'blur(2px)', userSelect: 'none', pointerEvents: 'none' }}>
            {GA4_PREVIEW_ROWS.map(row => (
              <div key={row.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid #F7F8FA' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11.5, color: '#888', marginBottom: 2 }}>{row.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{row.value}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button onClick={() => onTabChange?.('marketing')}
              style={{ background: '#111', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.18)' }}>
              Connect GA4 to unlock →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DealStageTable({ pipeline }) {
  if (!pipeline) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E5EA', borderRadius: 12, padding: '16px 18px', marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 12 }}>Deal conversion -- {pipeline.pipelineLabel}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
        <span style={{ fontSize: 34, fontWeight: 800, color: '#111', lineHeight: 1 }}>{pipeline.createdToWon}%</span>
        <span style={{ fontSize: 13, color: '#555', fontWeight: 600 }}>of deals created become customers</span>
        <span style={{ fontSize: 12, color: '#999' }}>· {pipeline.won} won out of {pipeline.dealCount} created</span>
      </div>
      <div style={{ fontSize: 11.5, color: '#888', lineHeight: 1.55, marginBottom: 14 }}>
        {pipeline.skipHeavy
          ? "Your deals aren't moving through HubSpot stages consistently, so created → won is your most reliable number. The stage breakdown below needs more data to be meaningful."
          : 'Your overall win rate. Below: of every deal that entered each stage, the share that eventually won.'}
      </div>
      {!pipeline.skipHeavy && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#999', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                <th style={{ padding: '6px 8px 6px 0', fontWeight: 600 }}>Stage</th>
                <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>Created</th>
                <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>Won</th>
                <th style={{ padding: '6px 0 6px 8px', fontWeight: 600, textAlign: 'right' }}>Conversion</th>
              </tr>
            </thead>
            <tbody>
              {pipeline.stages.map(s => (
                <tr key={s.stageId} style={{ borderTop: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '8px 8px 8px 0', color: '#333', fontWeight: 500 }}>{s.label}</td>
                  <td style={{ padding: '8px', textAlign: 'right', color: '#666' }}>{s.everReached}</td>
                  <td style={{ padding: '8px', textAlign: 'right', color: '#666' }}>{s.won}</td>
                  <td style={{ padding: '8px 0 8px 8px', textAlign: 'right', fontWeight: 700, color: s.conversionPct === null ? '#ccc' : scoreColor(s.conversionPct) }}>
                    {s.conversionPct === null ? <span style={{ color: '#ccc' }}>low sample</span> : `${s.conversionPct}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function HoverCard({ children, popover }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      {children}
      {open && popover && (
        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, zIndex: 30, width: 300,
          background: '#111', color: '#fff', borderRadius: 10, padding: '12px 14px', fontSize: 11.5, lineHeight: 1.5,
          textAlign: 'left', boxShadow: '0 8px 28px rgba(0,0,0,.22)' }}>
          {popover}
        </div>
      )}
    </div>
  );
}

export default function Scorecard({ onScoreLoad, onTabChange }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [interested, setInterested] = useState(false);
  const [showTriage, setShowTriage] = useState(false);
  const [triageContacts, setTriageContacts] = useState(null);
  const [triageLoading, setTriageLoading] = useState(false);
  const [spamCount, setSpamCount] = useState(0);
  const [marking, setMarking] = useState(false);
  const [triageSort, setTriageSort] = useState('suspicious');
  const [triageFilter, setTriageFilter] = useState(null);

  const loadTriage = async () => {
    if (triageContacts) { setShowTriage(v => !v); return; }
    setShowTriage(true);
    setTriageLoading(true);
    try {
      const d = await api.getSpeedToLead();
      setTriageContacts(d.triageCandidates || []);
      setSpamCount(d.spamCount || 0);
    } catch {} finally { setTriageLoading(false); }
  };

  const handleSpam = async (id, currentlySpam) => {
    setMarking(true);
    try {
      const res = await api.markSpam([id], currentlySpam ? 'remove' : 'add');
      setSpamCount(res.spamCount || 0);
      setTriageContacts(prev => prev.map(c => c.id === id ? { ...c, isSpam: !currentlySpam } : c));
    } catch {} finally { setMarking(false); }
  };

  const load = useCallback(() => {
    return api.getScorecard()
      .then(d => {
        setData(d);
        if (onScoreLoad && d.overall) onScoreLoad(d.overall);
        if (!d.personalized && !localStorage.getItem('pipechamp_onboard_dismissed')) setShowOnboarding(true);
      })
      .catch(e => setError(e.message));
  }, [onScoreLoad]);

  useEffect(() => { load(); }, [load]);

  if (error) return <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'14px 18px', color:'#DC2626', marginBottom:14 }}>Couldn't build scorecard: {error}</div>;
  if (!data) return <div style={{ textAlign:'center', padding:'2.5rem', color:'#888', fontSize:14 }}>Calculating your pipeline health...</div>;

  const { overall, marketing, sales, revenueImpact, dealStageConversion, personalized, trend, dealProfiles, lifecycleMaintained } = data;
  const scoreDelta = trend?.overallScoreDelta;
  const mc = meterColor(overall.score);
  const lastMonthScore = (scoreDelta != null && overall.score != null) ? overall.score - scoreDelta : null;

  // Period-over-period comparisons for marketing dimension rows
  const marketingComparisons = {};
  const leadsCaptDim = marketing?.dimensions?.find(d => d.key === 'leadsCapt');
  if (leadsCaptDim?.prevValue != null && leadsCaptDim?.value != null) {
    const diff = leadsCaptDim.value - leadsCaptDim.prevValue;
    const sign = diff > 0 ? '+' : '';
    marketingComparisons.leadsCapt = `${leadsCaptDim.prevValue} last 90d (${sign}${diff})`;
  }

  // Best-customer comparisons for sales dimension rows
  const salesComparisons = {};
  if (dealProfiles && !dealProfiles.insufficient) {
    const fc = dealProfiles.fastestClose;
    if (fc?.speedHours?.median != null) salesComparisons.speedToLead = `Your fast wins: ${fmtH(fc.speedHours.median)}`;
    if (fc?.cycleRange?.median != null) salesComparisons.salesCycle = `Your fast wins: ${fmtDays(fc.cycleRange.median)}`;
  }

  return (
    <div>
      {/* Health meter header */}
      <div style={{ background: '#fff', border: '1px solid #E2E5EA', borderRadius: 12, padding: '20px 24px', marginBottom: 12, display: 'flex', alignItems: 'flex-start', gap: 24 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#43A047', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Pipeline health</div>

          {/* Score + delta badge */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 48, fontWeight: 800, color: mc, lineHeight: 1, letterSpacing: '-1px' }}>{overall.score ?? '-'}</span>
            <span style={{ fontSize: 15, color: '#bbb' }}>/100</span>
            {scoreDelta != null && scoreDelta !== 0 && (
              <span style={{ fontSize: 12, fontWeight: 700, color: scoreDelta > 0 ? '#059669' : '#DC2626', background: scoreDelta > 0 ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${scoreDelta > 0 ? '#BBF7D0' : '#FECACA'}`, borderRadius: 20, padding: '3px 10px' }}>
                {scoreDelta > 0 ? '↑' : '↓'} {Math.abs(scoreDelta)} pts this month
              </span>
            )}
          </div>

          {/* Progress bar with colour zones */}
          <div style={{ position: 'relative', height: 10, borderRadius: 6, background: '#F0F1F4', overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '40%', background: 'rgba(239,68,68,.13)' }} />
            <div style={{ position: 'absolute', left: '40%', top: 0, bottom: 0, width: '30%', background: 'rgba(217,119,6,.13)' }} />
            <div style={{ position: 'absolute', left: '70%', top: 0, bottom: 0, right: 0, background: 'rgba(16,185,129,.13)' }} />
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${overall.score ?? 0}%`, background: mc, borderRadius: 6, transition: 'width .8s ease' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '40% 30% 30%', fontSize: 10, color: '#bbb', marginBottom: 14 }}>
            <span>Critical</span>
            <span>Needs work</span>
            <span>Healthy</span>
          </div>

          {/* Last month stat + M/S grade pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            {lastMonthScore != null && (
              <div style={{ background: '#F7F8FA', border: '1px solid #E2E5EA', borderRadius: 8, padding: '5px 12px', display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 10, color: '#aaa' }}>Last month</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>{lastMonthScore}</span>
                {scoreDelta !== 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: scoreDelta > 0 ? '#059669' : '#DC2626' }}>
                    {scoreDelta > 0 ? '↑' : '↓'}{Math.abs(scoreDelta)}
                  </span>
                )}
              </div>
            )}
            <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 12, background: '#F7F8FA', border: '1px solid #E2E5EA', color: '#555' }}>
              <span style={{ color: GRADE_COLOR[marketing.grade] || '#ccc', fontWeight: 700 }}>●</span> Marketing <strong style={{ color: '#111' }}>{marketing.grade || '-'}</strong>
            </span>
            <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 12, background: '#F7F8FA', border: '1px solid #E2E5EA', color: '#555' }}>
              <span style={{ color: GRADE_COLOR[sales.grade] || '#ccc', fontWeight: 700 }}>●</span> Sales <strong style={{ color: '#111' }}>{sales.grade || '-'}</strong>
            </span>
          </div>

          {lifecycleMaintained === false && (
            <div style={{ marginBottom: 10, fontSize: 11, color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '6px 10px', lineHeight: 1.5 }}>
              Marketing metrics are limited: this account doesn't tag HubSpot lifecycle stages. The Sales side and deal-based metrics are the reliable read.
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => setShowOnboarding(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#888', background: 'none', border: '1px solid #E2E5EA', borderRadius: 7, padding: '4px 10px', cursor: 'pointer' }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="4" x2="13" y2="4"/><line x1="3" y1="8" x2="13" y2="8"/><line x1="3" y1="12" x2="13" y2="12"/><circle cx="6" cy="4" r="1.5" fill="white"/><circle cx="10" cy="8" r="1.5" fill="white"/><circle cx="6" cy="12" r="1.5" fill="white"/></svg>
              Adjust to your business goals
            </button>
            <button onClick={loadTriage} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: showTriage ? '#C2410C' : '#888', background: 'none', border: `1px solid ${showTriage ? '#FDE68A' : '#E2E5EA'}`, borderRadius: 7, padding: '4px 10px', cursor: 'pointer' }}>
              🧹 Clean your data{spamCount > 0 && <span style={{ color: '#059669', fontWeight: 600 }}> · {spamCount} filtered</span>}
            </button>
          </div>
        </div>

        {/* Revenue opportunity */}
        {revenueImpact?.total > 0 && (
          <HoverCard popover={
            <div>
              <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 12 }}>Where this comes from</div>
              {revenueImpact.items.map(i => (
                <div key={i.key} style={{ marginBottom: 9 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontWeight: 700, marginBottom: 3 }}>
                    <span>{i.title}</span><span style={{ color: '#34D399' }}>{fmt$(i.amount)}</span>
                  </div>
                  <div style={{ opacity: 0.75, fontWeight: 400 }}>{i.how}</div>
                </div>
              ))}
              <div style={{ opacity: 0.5, marginTop: 6, fontSize: 10, borderTop: '1px solid rgba(255,255,255,.15)', paddingTop: 6 }}>Calculated from your actual deals and contacts.</div>
            </div>
          }>
            <div style={{ textAlign: 'right', flexShrink: 0, cursor: 'help', paddingLeft: 16, borderLeft: '1px solid #F0F1F4' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                Revenue opportunity
                <span style={{ fontSize: 10, color: '#aaa', fontWeight: 400, border: '1px solid #E2E5EA', borderRadius: '50%', width: 14, height: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>i</span>
              </div>
              <div style={{ fontSize: 30, fontWeight: 800, color: '#059669', letterSpacing: '-0.5px', lineHeight: 1 }}>{fmt$(revenueImpact.total)}</div>
            </div>
          </HoverCard>
        )}
      </div>

      {/* Clean your data triage panel -- expands inline below header */}
      {showTriage && (
        <div style={{ background: '#fff', border: '1px solid #FDE68A', borderRadius: 10, marginBottom: 12, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid #FDE68A', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>Data cleanup</span>
            {spamCount > 0 && <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>· {spamCount} filtered out</span>}
            <span style={{ fontSize: 11.5, color: '#92400E', flex: 1 }}>Spam contacts skew your response time, conversion, and source quality scores.</span>
            <button onClick={() => setShowTriage(false)} style={{ fontSize: 11, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>Hide ↑</button>
          </div>
          <div style={{ padding: '10px 16px', opacity: marking ? 0.6 : 1, transition: 'opacity .15s' }}>
            {triageLoading && <div style={{ fontSize: 12, color: '#92400E', padding: '8px 0' }}>Loading contacts...</div>}
            {triageContacts && (() => {
              const SIGNAL_LABELS = { noEmail: 'No email', noName: 'No name', suspiciousEmail: 'Suspicious email', consumerEmail: 'Consumer email', neverTouched: 'Never touched', unknownSource: 'Unknown source' };
              const FILTERS = ['noEmail', 'noName', 'neverTouched', 'consumerEmail', 'suspiciousEmail'];
              const sorted = [...triageContacts].sort((a, b) => {
                if (triageSort === 'suspicious') return b.spamScore - a.spamScore;
                if (triageSort === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
              });
              const visible = triageFilter ? sorted.filter(c => c.signals?.includes(triageFilter)) : sorted;
              return (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                    <select value={triageSort} onChange={e => setTriageSort(e.target.value)}
                      style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid #FDE68A', background: '#fff', color: '#92400E', cursor: 'pointer' }}>
                      <option value="suspicious">Most suspicious first</option>
                      <option value="newest">Newest first</option>
                      <option value="oldest">Oldest first</option>
                    </select>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {FILTERS.map(f => (
                        <button key={f} onClick={() => setTriageFilter(triageFilter === f ? null : f)}
                          style={{ fontSize: 10, padding: '3px 8px', borderRadius: 10, border: `1px solid ${triageFilter === f ? '#C2410C' : '#FDE68A'}`, background: triageFilter === f ? '#C2410C' : '#fff', color: triageFilter === f ? '#fff' : '#92400E', cursor: 'pointer', fontWeight: 500 }}>
                          {SIGNAL_LABELS[f]}
                        </button>
                      ))}
                    </div>
                    <span style={{ fontSize: 11, color: '#aaa', marginLeft: 'auto' }}>{visible.length} contacts</span>
                  </div>
                  {visible.length === 0 && <div style={{ fontSize: 12, color: '#92400E', padding: '8px 0' }}>No contacts match this filter.</div>}
                  {visible.map((c, i) => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < visible.length - 1 ? '1px solid #FEF3C7' : 'none' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: c.isSpam ? '#bbb' : '#111', textDecoration: c.isSpam ? 'line-through' : 'none' }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: '#999', marginBottom: c.signals?.length ? 3 : 0 }}>{[c.email, c.source, c.stage].filter(Boolean).join(' · ')}</div>
                        {c.signals?.length > 0 && (
                          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                            {c.signals.map(s => (
                              <span key={s} style={{ fontSize: 9.5, padding: '1px 6px', borderRadius: 8, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', fontWeight: 500 }}>
                                {SIGNAL_LABELS[s]}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button disabled={marking} onClick={() => handleSpam(c.id, c.isSpam)}
                        style={{ fontSize: 10.5, fontWeight: 700, borderRadius: 6, padding: '4px 10px', cursor: marking ? 'default' : 'pointer', flexShrink: 0, minWidth: 78, textAlign: 'center', background: c.isSpam ? '#F0FDF4' : '#FEF2F2', color: c.isSpam ? '#059669' : '#DC2626', border: `1px solid ${c.isSpam ? '#BBF7D0' : '#FECACA'}` }}>
                        {c.isSpam ? '↩ Not spam' : 'Mark spam'}
                      </button>
                    </div>
                  ))}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Marketing vs Sales funnel cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <FunnelCard title="Marketing" subtitle="Leads captured -> qualified" grade={marketing.grade} dimensions={marketing.dimensions}
          locked={marketing.locked} unlockHint="You told us you run Sales Hub only. Add Marketing Hub (or update your setup) to grade lead generation and qualification."
          comparisons={marketingComparisons} showGa4Cta={!marketing.locked} onTabChange={onTabChange} />
        <FunnelCard title="Sales" subtitle="Qualified lead -> closed deal" grade={sales.grade} dimensions={sales.dimensions}
          locked={sales.locked} unlockHint="You told us you run Marketing Hub only. Add Sales Hub to grade deal conversion and win rate."
          comparisons={salesComparisons} />
      </div>

      {/* Best deals profile */}
      {dealProfiles && !dealProfiles.insufficient && (
        <div style={{ background: '#fff', border: '1px solid #E2E5EA', borderRadius: 12, padding: '16px 18px', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>Your best deals look like this</div>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 14 }}>Behavioral patterns of your winning segments · based on {dealProfiles.wonCount} won deals</div>
          <div style={{ display: 'grid', gridTemplateColumns: dealProfiles.fastestClose ? '1fr 1fr' : '1fr', gap: 12 }}>
            {[
              { title: 'Highest-value customers', tag: 'top 25% by deal size', p: dealProfiles.highestValue, accent: '#059669' },
              dealProfiles.fastestClose && { title: 'Fastest closes', tag: 'fastest 25% by cycle', p: dealProfiles.fastestClose, accent: '#3B82F6' },
            ].filter(Boolean).map(card => (
              <div key={card.title} style={{ border: '1px solid #F0F1F4', borderRadius: 10, padding: '14px', borderTop: `3px solid ${card.accent}` }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{card.title}</div>
                <div style={{ fontSize: 10.5, color: '#999', marginBottom: 10 }}>{card.tag} · {card.p.sample} deals</div>
                {profileRows(card.p).map(r => (
                  <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #F9FAFB', fontSize: 12.5 }}>
                    <span style={{ color: '#888' }}>{r.l}</span>
                    <span style={{ color: '#111', fontWeight: 600, textAlign: 'right' }}>{r.v}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, fontSize: 12.5, color: '#7C2D12', lineHeight: 1.5 }}>
              <strong style={{ color: '#111' }}>Want to know who these buyers actually are - and where to find more like them?</strong> Job titles, company profiles, and lookalike targeting.
            </div>
            {interested ? (
              <span style={{ fontSize: 12, fontWeight: 700, color: '#059669', flexShrink: 0 }}>✓ We'll be in touch</span>
            ) : (
              <button onClick={() => { api.recordInterest('customer-profiles').catch(() => {}); setInterested(true); }}
                style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: '#fff', background: '#C2410C', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}>
                I want this →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Deal-stage conversion table */}
      <DealStageTable pipeline={dealStageConversion && dealStageConversion[0]} />

      {showOnboarding && (
        <Onboarding
          onClose={() => { localStorage.setItem('pipechamp_onboard_dismissed', '1'); setShowOnboarding(false); }}
          onComplete={() => { setShowOnboarding(false); setData(null); load(); }}
        />
      )}
    </div>
  );
}
