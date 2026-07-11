import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';

const fmt$ = n => '$' + Math.round(n || 0).toLocaleString();

const GRADE_COLOR = { A: '#10B981', B: '#34D399', C: '#F59E0B', D: '#F97316', F: '#EF4444' };
const scoreColor = s => s === null || s === undefined ? '#ccc' : s >= 70 ? '#10B981' : s >= 50 ? '#F59E0B' : '#EF4444';

// Big credit-score-style ring for the overall grade.
function GradeRing({ score, grade }) {
  const size = 132, stroke = 12;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - ((score || 0) / 100) * circ;
  const color = grade ? (GRADE_COLOR[grade] || '#ccc') : '#ccc';
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#F3F4F6" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset .8s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 44, fontWeight: 800, color, lineHeight: 1 }}>{grade || '—'}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginTop: 3 }}>{score !== null ? `${score}/100` : 'No data'}</div>
      </div>
    </div>
  );
}

// A single dimension row with a score bar; benchmark + source on hover (title).
function DimensionRow({ dim }) {
  const color = scoreColor(dim.score);
  const tip = `Benchmark: ${dim.benchmark}\nSource: ${dim.source}` + (dim.sample ? `\nBased on ${dim.sample} records` : '');
  return (
    <div title={tip} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid #F7F8FA', cursor: 'help' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: '#333', fontWeight: 500 }}>{dim.label}</div>
        <div style={{ fontSize: 10.5, color: '#aaa', marginTop: 1 }}>benchmark {dim.benchmark}</div>
      </div>
      <div style={{ width: 90, height: 6, background: '#F0F1F4', borderRadius: 4, overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ width: `${dim.score ?? 0}%`, height: '100%', background: color, borderRadius: 4, transition: 'width .6s ease' }} />
      </div>
      <div style={{ width: 34, textAlign: 'right', fontSize: 13, fontWeight: 700, color: dim.score === null ? '#ccc' : '#111', flexShrink: 0 }}>
        {dim.score === null ? '—' : dim.score}
      </div>
    </div>
  );
}

function FunnelCard({ title, subtitle, score, grade, dimensions }) {
  const color = grade ? (GRADE_COLOR[grade] || '#ccc') : '#ccc';
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E5EA', borderRadius: 12, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{title}</div>
          <div style={{ fontSize: 11, color: '#999' }}>{subtitle}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 24, fontWeight: 800, color }}>{grade || '—'}</span>
          <span style={{ fontSize: 12, color: '#888', fontWeight: 600 }}>{score !== null ? `${score}/100` : ''}</span>
        </div>
      </div>
      <div>
        {dimensions.map(d => <DimensionRow key={d.key} dim={d} />)}
      </div>
    </div>
  );
}

// Deal-stage conversion table for the primary pipeline (Dan's flagship view).
function DealStageTable({ pipeline }) {
  if (!pipeline) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E5EA', borderRadius: 12, padding: '16px 18px', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>Deal-stage conversion — {pipeline.pipelineLabel}</div>
        <div style={{ fontSize: 11, color: '#888' }}>{pipeline.createdToWon}% created → won · {pipeline.dealCount} deals</div>
      </div>
      <div style={{ fontSize: 11, color: '#999', marginBottom: 10 }}>
        Of every deal that <strong>ever reached</strong> a stage, the share that went on to close won.
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#999', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.05em' }}>
              <th style={{ padding: '6px 8px 6px 0', fontWeight: 600 }}>Stage</th>
              <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>Ever reached</th>
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
                  {s.conversionPct === null ? <span title="Fewer than 3 deals — not enough to report" style={{ color: '#ccc' }}>low sample</span> : `${s.conversionPct}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Scorecard({ onScoreLoad, onTabChange }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    api.getScorecard()
      .then(d => { if (mounted) { setData(d); if (onScoreLoad && d.overall) onScoreLoad(d.overall); } })
      .catch(e => { if (mounted) setError(e.message); });
    return () => { mounted = false; };
  }, [onScoreLoad]);

  if (error) return <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'14px 18px', color:'#DC2626', marginBottom:14 }}>Couldn’t build scorecard: {error}</div>;
  if (!data) return <div style={{ textAlign:'center', padding:'2.5rem', color:'#888', fontSize:14 }}>Grading your pipeline…</div>;

  const { overall, marketing, sales, revenueImpact, dealStageConversion } = data;
  const headline = overall.score === null ? 'Not enough data to grade yet'
    : overall.score >= 80 ? 'Your pipeline is performing well'
    : overall.score >= 60 ? 'Solid pipeline with clear room to improve'
    : overall.score >= 40 ? 'Your pipeline needs attention'
    : 'Your pipeline has serious leaks';

  return (
    <div>
      {/* Headline: overall grade + revenue opportunity */}
      <div style={{ background: '#fff', border: '1px solid #E2E5EA', borderRadius: 12, padding: '20px 24px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 26 }}>
        <GradeRing score={overall.score} grade={overall.grade} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#43A047', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>Pipeline Grade</div>
          <div style={{ fontSize: 21, fontWeight: 700, color: '#111', letterSpacing: '-0.3px', marginBottom: 10 }}>{headline}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 12, background: '#F7F8FA', border: '1px solid #E2E5EA', color: '#555' }}>
              <span style={{ color: GRADE_COLOR[marketing.grade] || '#ccc', fontWeight: 700 }}>●</span> Marketing <strong style={{ color: '#111' }}>{marketing.grade || '—'}</strong>
            </span>
            <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 12, background: '#F7F8FA', border: '1px solid #E2E5EA', color: '#555' }}>
              <span style={{ color: GRADE_COLOR[sales.grade] || '#ccc', fontWeight: 700 }}>●</span> Sales <strong style={{ color: '#111' }}>{sales.grade || '—'}</strong>
            </span>
          </div>
        </div>
        {revenueImpact?.total > 0 && (
          <div title={revenueImpact.items.map(i => `${i.title}: ${fmt$(i.amount)} — ${i.how}`).join('\n\n')}
            style={{ textAlign: 'right', flexShrink: 0, cursor: 'help', paddingLeft: 12, borderLeft: '1px solid #F0F1F4' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>Revenue Opportunity</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: '#059669', letterSpacing: '-0.5px', lineHeight: 1 }}>{fmt$(revenueImpact.total)}</div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>if gaps closed · hover for math</div>
          </div>
        )}
      </div>

      {/* Marketing vs Sales breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <FunnelCard title="Marketing" subtitle="Generate leads → SQL" score={marketing.score} grade={marketing.grade} dimensions={marketing.dimensions} />
        <FunnelCard title="Sales" subtitle="SQL → opportunity → customer" score={sales.score} grade={sales.grade} dimensions={sales.dimensions} />
      </div>

      {/* Deal-stage conversion table (primary pipeline) */}
      <DealStageTable pipeline={dealStageConversion && dealStageConversion[0]} />
    </div>
  );
}
