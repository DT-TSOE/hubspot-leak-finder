import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import Onboarding from './Onboarding';
import GoalsModal from './GoalsModal';
import { Lock, Eraser } from 'lucide-react';

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

function DimensionRow({ dim, comparison, goal }) {
  const status = dimStatus(dim.score);
  const s = status ? STATUS_STYLE[status] : null;
  const tip = (dim.source || '') + (dim.sample ? `\nBased on ${dim.sample} records.` : '');
  const lowerIsBetter = dim.key === 'speedToLead' || dim.key === 'salesCycle';
  const hasMeter = (dim.showMeter && dim.score != null) || (goal != null && dim.value != null);

  if (hasMeter) {
    let fill, mc;
    if (goal != null && dim.value != null) {
      fill = lowerIsBetter
        ? Math.min(100, Math.round((goal / dim.value) * 100))
        : Math.min(100, Math.round((dim.value / goal) * 100));
      mc = fill >= 100 ? '#10B981' : fill >= 60 ? '#D97706' : '#EF4444';
    } else {
      fill = dim.meterFill != null ? dim.meterFill : dim.score;
      mc = meterColor(dim.score);
    }
    const goalTag = goal != null ? (() => {
      if (dim.key === 'leadsCapt') return `/ ${Math.round(goal)}`;
      if (dim.key === 'followUpCoverage' || dim.key === 'winRate') return `/ ${goal}%`;
      if (dim.key === 'speedToLead') return `/ ${fmtH(goal)}`;
      if (dim.key === 'salesCycle') return `/ ${fmtDays(goal)}`;
      return null;
    })() : null;
    return (
      <div title={tip} style={{ padding: '10px 0', borderBottom: '1px solid #F7F8FA', cursor: 'help' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <div style={{ fontSize: 11.5, color: '#888' }}>{dim.label}</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>
            {dim.displayValue || 'No data'}
            {goalTag && <span style={{ fontSize: 11, fontWeight: 400, color: '#bbb', marginLeft: 4 }}>{goalTag}</span>}
          </div>
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

function FunnelCard({ title, subtitle, grade, dimensions, locked, unlockHint, comparisons, showGa4Cta, onTabChange, goals }) {
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
        {dimensions.filter(d => !d.hidden).map(d => <DimensionRow key={d.key} dim={d} comparison={comparisons?.[d.key]} goal={goals?.[d.key]} />)}
      </div>
      {locked && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 20px', background: 'rgba(255,255,255,.45)' }}>
          <div style={{ marginBottom: 6, display:'flex', justifyContent:'center' }}><Lock size={22} color="#111" /></div>
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

export default function Scorecard({ onScoreLoad, onTabChange, days }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const [goals, setGoals] = useState({});
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
    return api.getScorecard(days)
      .then(d => {
        setData(d);
        if (onScoreLoad && d.overall) onScoreLoad(d.overall);
        if (!d.personalized && !localStorage.getItem('pipechamp_onboard_dismissed')) setShowOnboarding(true);
      })
      .catch(e => setError(e.message));
  }, [onScoreLoad, days]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.getGoals().then(g => setGoals(g || {})).catch(() => {}); }, []);

  if (error) return <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'14px 18px', color:'#DC2626', marginBottom:14 }}>Couldn't build scorecard: {error}</div>;
  if (!data) return <div style={{ textAlign:'center', padding:'2.5rem', color:'#888', fontSize:14 }}>Calculating your pipeline health...</div>;

  const { overall, marketing, sales, revenueImpact, dealStageConversion, personalized, trend, dealProfiles, lifecycleMaintained } = data;
  const scoreDelta = trend?.overallScoreDelta;
  const mc = meterColor(overall.score);
  const lastMonthScore = (scoreDelta != null && overall.score != null) ? overall.score - scoreDelta : null;

  const hasGoals = goals && Object.keys(goals).length > 0;

  // Dimension lookups
  const winRateDim = sales?.dimensions?.find(d => d.key === 'winRate');
  const coverageDim = marketing?.dimensions?.find(d => d.key === 'followUpCoverage');
  const leadToDealDim = marketing?.dimensions?.find(d => d.key === 'leadToDeal');
  const leadsCaptDim = marketing?.dimensions?.find(d => d.key === 'leadsCapt');
  const speedDim = sales?.dimensions?.find(d => d.key === 'speedToLead');
  const cycleDim = sales?.dimensions?.find(d => d.key === 'salesCycle');
  const openPipelineValue = data.openPipelineValue || 0;
  const avgDeal = data.context?.avgDealSize ?? 0;
  const ldr = (leadToDealDim?.value ?? 0) / 100;
  const currentCloseValue = (winRateDim?.value != null && openPipelineValue > 0)
    ? Math.round(openPipelineValue * winRateDim.value / 100)
    : null;

  // Goal close value: pipeline at goal win rate + outreach coverage gains
  // Leads volume is derived from these goals, not user-set
  let goalCloseValue = null;
  if (hasGoals && openPipelineValue > 0) {
    const goalWR = goals.winRate ?? winRateDim?.value ?? 0;
    let total = openPipelineValue * goalWR / 100;
    if (goals.followUpCoverage && coverageDim?.value != null && (coverageDim.sample || 0) > 0) {
      const coverageGain = Math.max(0, goals.followUpCoverage - coverageDim.value);
      total += coverageDim.sample * (coverageGain / 100) * ldr * (goalWR / 100) * avgDeal;
    }
    goalCloseValue = Math.round(total);
  }

  // Derived leads goal: leads needed to achieve goal close value, given conversion rates
  // Changes automatically with date range and other goals — not user-set
  const derivedLeadsGoal = (hasGoals && goalCloseValue && avgDeal > 0 && ldr > 0 && goals.winRate)
    ? Math.round(goalCloseValue / avgDeal / (goals.winRate / 100) / ldr)
    : null;

  // Period-over-period comparisons for marketing dimension rows
  const marketingComparisons = {};
  if (derivedLeadsGoal != null && leadsCaptDim?.value != null) {
    const pct = Math.min(100, Math.round((leadsCaptDim.value / derivedLeadsGoal) * 100));
    marketingComparisons.leadsCapt = `${pct}% of ${derivedLeadsGoal} needed`;
  } else if (leadsCaptDim?.prevValue != null && leadsCaptDim?.value != null) {
    const diff = leadsCaptDim.value - leadsCaptDim.prevValue;
    const sign = diff > 0 ? '+' : '';
    const periodLabel = !days ? '90d' : typeof days === 'number' ? `${days}d` : 'prev period';
    marketingComparisons.leadsCapt = `${leadsCaptDim.prevValue} ${periodLabel} prior (${sign}${diff})`;
  }
  if (goals.followUpCoverage) marketingComparisons.followUpCoverage = `Target: ${goals.followUpCoverage}%`;

  // Best-customer comparisons for sales dimension rows (goals override best-wins)
  const salesComparisons = {};
  if (goals.winRate) salesComparisons.winRate = `Target: ${goals.winRate}%`;
  if (goals.speedToLead) {
    salesComparisons.speedToLead = `Target: ${fmtH(goals.speedToLead)}`;
  } else if (dealProfiles && !dealProfiles.insufficient) {
    const fc = dealProfiles.fastestClose;
    if (fc?.speedHours?.median != null) salesComparisons.speedToLead = `Your fast wins: ${fmtH(fc.speedHours.median)}`;
  }
  if (goals.salesCycle) {
    salesComparisons.salesCycle = `Target: ${fmtDays(goals.salesCycle)}`;
  } else if (dealProfiles && !dealProfiles.insufficient) {
    const fc = dealProfiles.fastestClose;
    if (fc?.cycleRange?.median != null) salesComparisons.salesCycle = `Your fast wins: ${fmtDays(fc.cycleRange.median)}`;
  }

  // Marketing card goals — leadsCapt uses derived goal instead of user-set
  const marketingGoals = derivedLeadsGoal != null
    ? { ...goals, leadsCapt: derivedLeadsGoal }
    : goals;

  // Gaps: where current metrics fall short of goals, sorted by revenue impact
  const gaps = [];
  if (hasGoals && avgDeal > 0) {
    const goalWR = (goals.winRate ?? winRateDim?.value ?? 0) / 100;
    if (goals.winRate && winRateDim?.value != null && goals.winRate > winRateDim.value) {
      const impact = Math.round((goals.winRate - winRateDim.value) / 100 * (winRateDim.sample || 0) * avgDeal);
      gaps.push({ key: 'winRate', label: 'Win rate', current: `${Math.round(winRateDim.value)}%`, goal: `${goals.winRate}%`, detail: `${goals.winRate - Math.round(winRateDim.value)}pt gap to close`, impact, tab: 'revenue' });
    }
    if (goals.followUpCoverage && coverageDim?.value != null && goals.followUpCoverage > coverageDim.value) {
      const extra = (coverageDim.sample || 0) * (goals.followUpCoverage - coverageDim.value) / 100;
      const impact = Math.round(extra * ldr * goalWR * avgDeal);
      gaps.push({ key: 'followUpCoverage', label: 'Lead outreach', current: `${Math.round(coverageDim.value)}%`, goal: `${goals.followUpCoverage}%`, detail: `${Math.round(extra)} more leads need a first touch`, impact, tab: 'lead-response' });
    }
    if (derivedLeadsGoal != null && leadsCaptDim?.value != null && derivedLeadsGoal > leadsCaptDim.value) {
      const extra = Math.round(derivedLeadsGoal - leadsCaptDim.value);
      const impact = Math.round(extra * ldr * goalWR * avgDeal);
      gaps.push({ key: 'leadsCapt', label: 'Leads captured', current: `${Math.round(leadsCaptDim.value)}`, goal: `${derivedLeadsGoal}`, detail: `${extra} more leads needed this period`, impact, tab: 'marketing' });
    }
    if (goals.speedToLead && speedDim?.value != null && goals.speedToLead < speedDim.value) {
      gaps.push({ key: 'speedToLead', label: 'First response', current: fmtH(speedDim.value), goal: fmtH(goals.speedToLead), detail: `${fmtH(Math.round(speedDim.value - goals.speedToLead))} above target`, impact: 0, tab: 'lead-response' });
    }
    if (goals.salesCycle && cycleDim?.value != null && goals.salesCycle < cycleDim.value) {
      gaps.push({ key: 'salesCycle', label: 'Sales cycle', current: fmtDays(cycleDim.value), goal: fmtDays(goals.salesCycle), detail: `${fmtDays(Math.round(cycleDim.value - goals.salesCycle))} above target`, impact: 0, tab: 'revenue' });
    }
    gaps.sort((a, b) => b.impact - a.impact);
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
            <button onClick={() => personalized ? setShowGoals(true) : setShowOnboarding(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: hasGoals ? '#6366F1' : '#888', background: 'none', border: `1px solid ${hasGoals ? '#C7D2FE' : '#E2E5EA'}`, borderRadius: 7, padding: '4px 10px', cursor: 'pointer' }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="4" x2="13" y2="4"/><line x1="3" y1="8" x2="13" y2="8"/><line x1="3" y1="12" x2="13" y2="12"/><circle cx="6" cy="4" r="1.5" fill="white"/><circle cx="10" cy="8" r="1.5" fill="white"/><circle cx="6" cy="12" r="1.5" fill="white"/></svg>
              {hasGoals ? 'Edit your targets' : 'Set your targets'}
            </button>
            <button onClick={loadTriage} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: showTriage ? '#C2410C' : '#888', background: 'none', border: `1px solid ${showTriage ? '#FDE68A' : '#E2E5EA'}`, borderRadius: 7, padding: '4px 10px', cursor: 'pointer' }}>
              <Eraser size={12} /> Clean your data{spamCount > 0 && <span style={{ color: '#059669', fontWeight: 600 }}> · {spamCount} filtered</span>}
            </button>
          </div>
        </div>

        {/* Pipeline numbers: goal close (hero) → current pipeline → expected close */}
        {openPipelineValue > 0 && (
          <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: 16, borderLeft: '1px solid #F0F1F4', minWidth: 120 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#1B72C7', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 2 }}>Goal Pipeline Value</div>
            {goalCloseValue !== null ? (
              <div style={{ fontSize: 30, fontWeight: 800, color: '#1B72C7', letterSpacing: '-0.5px', lineHeight: 1 }}>{fmt$(goalCloseValue)}</div>
            ) : (
              <>
                <div style={{ fontSize: 30, fontWeight: 800, color: '#ccc', lineHeight: 1 }}>—</div>
                <button onClick={() => personalized ? setShowGoals(true) : setShowOnboarding(true)}
                  style={{ fontSize: 10, color: '#6366F1', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2, textDecoration: 'underline', display: 'block', textAlign: 'right' }}>
                  Set your targets
                </button>
              </>
            )}
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 2 }}>Current Pipeline</div>
              <div style={{ fontSize: goalCloseValue !== null ? 20 : 26, fontWeight: 800, color: '#111', letterSpacing: '-0.5px', lineHeight: 1 }}>{fmt$(openPipelineValue)}</div>
            </div>
            {currentCloseValue !== null && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 2 }}>Expected Close</div>
                <div style={{ fontSize: goalCloseValue !== null ? 20 : 22, fontWeight: 800, color: '#555', letterSpacing: '-0.5px', lineHeight: 1 }}>{fmt$(currentCloseValue)}</div>
              </div>
            )}
          </div>
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
          comparisons={marketingComparisons} goals={marketingGoals} showGa4Cta={!marketing.locked} onTabChange={onTabChange} />
        <FunnelCard title="Sales" subtitle="Qualified lead -> closed deal" grade={sales.grade} dimensions={sales.dimensions}
          locked={sales.locked} unlockHint="You told us you run Marketing Hub only. Add Sales Hub to grade deal conversion and win rate."
          comparisons={salesComparisons} goals={goals} />
      </div>

      {/* Gaps in your plan */}
      {hasGoals && gaps.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #E2E5EA', borderRadius: 12, marginBottom: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>Gaps in your plan</div>
            <div style={{ fontSize: 11, color: '#aaa' }}>biggest revenue impact first</div>
          </div>
          {gaps.map((gap, i) => (
            <div key={gap.key} onClick={() => gap.tab && onTabChange?.(gap.tab)}
              style={{ display: 'flex', gap: 14, padding: '12px 20px', borderBottom: i < gaps.length - 1 ? '1px solid #F9FAFB' : 'none', alignItems: 'center', cursor: gap.tab ? 'pointer' : 'default' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{gap.label}</span>
                  <span style={{ fontSize: 11.5, color: '#aaa' }}>{gap.current} → {gap.goal}</span>
                </div>
                <div style={{ fontSize: 12, color: '#666' }}>{gap.detail}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                {gap.impact > 0 && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>{fmt$(gap.impact)}</div>
                    <div style={{ fontSize: 10, color: '#aaa' }}>revenue impact</div>
                  </div>
                )}
                {gap.tab && <span style={{ fontSize: 12, color: '#ccc' }}>→</span>}
              </div>
            </div>
          ))}
          {derivedLeadsGoal != null && derivedLeadsGoal > 0 && leadsCaptDim?.value != null && (
            <div style={{ padding: '10px 20px', background: '#F7F8FA', borderTop: '1px solid #F3F4F6', fontSize: 12, color: '#555', lineHeight: 1.5 }}>
              To achieve your Goal Pipeline Value, you need approximately <strong>{derivedLeadsGoal.toLocaleString()} new leads</strong> per period.
              {derivedLeadsGoal > leadsCaptDim.value && (
                <span style={{ color: '#EF4444', marginLeft: 4 }}>You're currently capturing {Math.round(leadsCaptDim.value)} — {Math.round(derivedLeadsGoal - leadsCaptDim.value)} short.</span>
              )}
            </div>
          )}
        </div>
      )}
      {hasGoals && gaps.length === 0 && (
        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '12px 18px', marginBottom: 12, fontSize: 13, color: '#166534', fontWeight: 600 }}>
          All your targets are on track
        </div>
      )}

      {/* Best deals profile */}
      {dealProfiles && !dealProfiles.insufficient && (
        <div style={{ background: '#fff', border: '1px solid #E2E5EA', borderRadius: 12, padding: '16px 18px', marginBottom: 12 }}>
          <div style={{ marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid #F0F1F4' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>Your best deals look like this</div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Behavioral patterns from {dealProfiles.wonCount} won deals</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: dealProfiles.fastestClose ? '1fr 1fr' : '1fr', gap: 12, marginBottom: 14 }}>
            {[
              { title: 'Highest-value customers', tag: 'top 25% by deal size', p: dealProfiles.highestValue, accent: '#0091AE' },
              dealProfiles.fastestClose && { title: 'Fastest closes', tag: 'fastest 25% by cycle', p: dealProfiles.fastestClose, accent: '#1B72C7' },
            ].filter(Boolean).map(card => (
              <div key={card.title} style={{ background: '#F7F8FA', border: '1px solid #E2E5EA', borderRadius: 10, padding: '14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: card.accent, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{card.title}</div>
                <div style={{ fontSize: 10.5, color: '#999', marginBottom: 10 }}>{card.tag} · {card.p.sample} deals</div>
                {profileRows(card.p).map(r => (
                  <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #EDEEF1', fontSize: 12.5 }}>
                    <span style={{ color: '#888' }}>{r.l}</span>
                    <span style={{ color: '#111', fontWeight: 600, textAlign: 'right' }}>{r.v}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ background: 'rgba(27,114,199,0.05)', border: '1px solid rgba(27,114,199,0.15)', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, fontSize: 12.5, color: '#243A52', lineHeight: 1.5 }}>
              <strong style={{ color: '#111' }}>Want to know who these buyers actually are?</strong> Job titles, company profiles, and lookalike targeting.
            </div>
            {interested ? (
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0091AE', flexShrink: 0 }}>✓ We'll be in touch</span>
            ) : (
              <button onClick={() => { api.recordInterest('customer-profiles').catch(() => {}); setInterested(true); }}
                style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: '#fff', background: '#1B72C7', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}>
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
          onComplete={() => { setShowOnboarding(false); setData(null); load(); setShowGoals(true); }}
        />
      )}
      {showGoals && data && (
        <GoalsModal
          data={data}
          dealProfiles={dealProfiles}
          existingGoals={goals}
          onClose={() => setShowGoals(false)}
          onSave={g => { setGoals(g); setShowGoals(false); }}
        />
      )}
    </div>
  );
}
