import React, { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';

const fmt$ = n => n != null && n > 0 ? '$' + Math.round(n).toLocaleString() : '—';
const fmtPct = n => n != null ? `${n}%` : '—';
const fmtSource = s => s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : s;

function ReportSection({ title, children }) {
  return (
    <div className="report-section" style={{ marginBottom: 32 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #E2E5EA' }}>{title}</div>
      {children}
    </div>
  );
}

function MetricRow({ items }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 12, marginBottom: 8 }}>
      {items.map((m, i) => (
        <div key={i} style={{ background: m.alert ? '#FEF2F2' : '#F7F8FA', border: `1px solid ${m.alert ? '#FECACA' : '#E2E5EA'}`, borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>{m.label}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: m.alert ? '#DC2626' : m.color || '#111' }}>{m.value}</div>
          {m.sub && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{m.sub}</div>}
        </div>
      ))}
    </div>
  );
}

export default function PipelineReport({ funnelData, insightsData }) {
  const [dashData, setDashData] = useState(null);
  const [sourceData, setSourceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [emailInput, setEmailInput] = useState('');
  const [showEmailBox, setShowEmailBox] = useState(false);
  const reportRef = useRef(null);

  useEffect(() => {
    Promise.all([
      api.getGmDashboard().catch(() => null),
      api.getSourceQuality().catch(() => null),
    ]).then(([dash, src]) => {
      setDashData(dash);
      setSourceData(src);
      setLoading(false);
    });
  }, []);

  const handlePrint = () => window.print();

  const handleEmail = (to) => {
    const score = dashData?.pipelineHealthScore;
    const funnel = funnelData?.funnel;
    const metrics = dashData?.metricCards || [];
    const winRate = metrics.find(m => m.id === 'win_rate')?.value || '—';
    const atRisk = metrics.find(m => m.id === 'at_risk')?.value || '—';

    const subject = encodeURIComponent(`PipeChamp Pipeline Report — ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`);
    const body = encodeURIComponent([
      `PIPECHAMP PIPELINE HEALTH REPORT`,
      `Generated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
      ``,
      `Pipeline Health Score: ${score?.score ?? '—'}/100 (Grade ${score?.grade ?? '—'})`,
      ``,
      `KEY METRICS`,
      `Win Rate: ${winRate}`,
      `Records At Risk: ${atRisk}`,
      `Total Contacts: ${funnelData?.summary?.totalContacts?.toLocaleString() ?? '—'}`,
      `Total Deals: ${funnelData?.summary?.totalDeals?.toLocaleString() ?? '—'}`,
      ``,
      `BIGGEST LEAK`,
      funnel?.biggestLeak ? funnel.biggestLeak.description : 'No significant leaks detected',
      ``,
      `TOP ISSUES`,
      ...(insightsData?.insights?.slice(0, 3).map((ins, i) => `${i + 1}. [${ins.type}] ${ins.title}`) || ['No insights available']),
      ``,
      `View full report: https://hubspot-leak-finder.vercel.app`,
    ].join('\n'));

    window.location.href = `mailto:${to || ''}?subject=${subject}&body=${body}`;
    setShowEmailBox(false);
    setEmailInput('');
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '4rem', color: '#888', fontSize: 14 }}>Building your report…</div>
  );

  const score = dashData?.pipelineHealthScore;
  const metrics = dashData?.metricCards || [];
  const funnel = funnelData?.funnel;
  const insights = insightsData?.insights || [];
  const topIssues = insights.filter(i => i.severity === 'high').slice(0, 3).length
    ? insights.filter(i => i.severity === 'high').slice(0, 3)
    : insights.slice(0, 3);
  const sources = sourceData?.sources?.slice(0, 6) || [];

  const scoreColor = !score?.score ? '#999' : score.score >= 70 ? '#10B981' : score.score >= 50 ? '#F59E0B' : '#EF4444';
  const getMetric = (id) => metrics.find(m => m.id === id);
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <>
      {/* Print CSS */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          .pipe-report-root { display: block !important; position: fixed; top: 0; left: 0; width: 100%; }
          .no-print { display: none !important; }
          .report-section { break-inside: avoid; }
        }
      `}</style>

      <div className="pipe-report-root">
        {/* Action bar — hidden on print */}
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#111', letterSpacing: '-0.3px' }}>Pipeline Health Report</div>
            <div style={{ fontSize: 12, color: '#888' }}>Generated {today} · Scroll to review, then download or share</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {showEmailBox && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="email"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleEmail(emailInput)}
                  placeholder="recipient@email.com"
                  style={{ padding: '7px 11px', borderRadius: 7, border: '1px solid #E2E5EA', fontSize: 12, width: 200, outline: 'none' }}
                  autoFocus
                />
                <button onClick={() => handleEmail(emailInput)} style={{ padding: '7px 14px', borderRadius: 7, border: 'none', background: '#111', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Send</button>
                <button onClick={() => setShowEmailBox(false)} style={{ padding: '7px 10px', borderRadius: 7, border: '1px solid #E2E5EA', background: '#fff', fontSize: 12, cursor: 'pointer', color: '#888' }}>✕</button>
              </div>
            )}
            {!showEmailBox && (
              <button onClick={() => setShowEmailBox(true)} style={{ padding: '8px 16px', borderRadius: 7, border: '1px solid #E2E5EA', background: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer', color: '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
                ✉ Email report
              </button>
            )}
            <button onClick={handlePrint} style={{ padding: '8px 16px', borderRadius: 7, border: 'none', background: '#111', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              ⬇ Download PDF
            </button>
          </div>
        </div>

        {/* Report body */}
        <div ref={reportRef} style={{ background: '#fff', border: '1px solid #E2E5EA', borderRadius: 12, padding: '32px 36px' }}>

          {/* Report header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, paddingBottom: 24, borderBottom: '2px solid #111' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#43A047', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>PipeChamp · Pipeline Hunter</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#111', letterSpacing: '-0.5px', marginBottom: 4 }}>Pipeline Health Report</div>
              <div style={{ fontSize: 13, color: '#888' }}>Generated {today}</div>
            </div>
            {score && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 48, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{score.score ?? '—'}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: scoreColor }}>Grade {score.grade || '—'} · /100</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Pipeline Health Score</div>
              </div>
            )}
          </div>

          {/* Health dimensions */}
          {score?.dimensions && (
            <ReportSection title="Health Breakdown">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.entries(score.dimensions).map(([key, dim]) => {
                  const labels = { conversion: 'Conversion', speed: 'Speed to Lead', activity: 'Activity', winRate: 'Win Rate', flow: 'Pipeline Flow' };
                  const c = dim.score >= 70 ? '#10B981' : dim.score >= 50 ? '#F59E0B' : '#EF4444';
                  return (
                    <div key={key} style={{ flex: '1 1 140px', background: '#F7F8FA', border: `1px solid ${c}22`, borderLeft: `3px solid ${c}`, borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>{labels[key] || key}</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: c }}>{dim.score}</div>
                    </div>
                  );
                })}
              </div>
            </ReportSection>
          )}

          {/* Key metrics */}
          <ReportSection title="Key Metrics">
            <MetricRow items={[
              { label: 'Win Rate', value: getMetric('win_rate')?.value || '—', color: '#111' },
              { label: 'Avg Sales Cycle', value: getMetric('sales_cycle')?.value || '—', color: '#111' },
              { label: 'Revenue at Risk', value: getMetric('at_risk') ? `${getMetric('at_risk').value} records` : '—', alert: true },
              { label: 'Speed to Lead', value: getMetric('speed')?.value || '—', color: '#111' },
            ]} />
            <MetricRow items={[
              { label: 'Total Contacts', value: funnelData?.summary?.totalContacts?.toLocaleString() || '—' },
              { label: 'Total Deals', value: funnelData?.summary?.totalDeals?.toLocaleString() || '—' },
              { label: 'Top Revenue Source', value: fmtSource(getMetric('top_revenue_source')?.value) || '—', color: '#059669' },
              { label: 'Worst Conversion Source', value: fmtSource(getMetric('worst_source')?.value) || '—', alert: true },
            ]} />
          </ReportSection>

          {/* Funnel */}
          {funnel?.funnelStages?.length > 0 && (
            <ReportSection title="Lifecycle Funnel">
              {funnel.biggestLeak && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderLeft: '3px solid #EF4444', borderRadius: 7, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#DC2626', fontWeight: 600 }}>
                  ⚠ Biggest Leak: {funnel.biggestLeak.description}
                </div>
              )}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#F7F8FA' }}>
                    {['Stage', 'Contacts', 'Conversion Rate', 'Drop-off', 'Drop-off Rate'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#555', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: '1px solid #E2E5EA' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {funnel.funnelStages.map((s, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F7F8FA' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 500, color: '#111' }}>{s.label}</td>
                      <td style={{ padding: '8px 12px', color: '#333' }}>{s.count?.toLocaleString()}</td>
                      <td style={{ padding: '8px 12px', color: s.conversionRate < 20 ? '#F59E0B' : '#059669', fontWeight: 600 }}>{fmtPct(s.conversionRate)}</td>
                      <td style={{ padding: '8px 12px', color: '#666' }}>{s.dropOff?.toLocaleString()}</td>
                      <td style={{ padding: '8px 12px', color: s.dropOffRate > 60 ? '#EF4444' : '#888', fontWeight: s.dropOffRate > 60 ? 700 : 400 }}>{fmtPct(s.dropOffRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ReportSection>
          )}

          {/* Top Issues */}
          {topIssues.length > 0 && (
            <ReportSection title="Top Issues Detected">
              {topIssues.map((ins, i) => {
                const sevColor = { high: '#EF4444', medium: '#F59E0B', low: '#059669' }[ins.severity] || '#888';
                return (
                  <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: i < topIssues.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                    <div style={{ width: 4, flexShrink: 0, borderRadius: 2, background: sevColor }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: sevColor, textTransform: 'uppercase', letterSpacing: '.05em' }}>{ins.severity}</span>
                        <span style={{ fontSize: 10, color: '#aaa' }}>·</span>
                        <span style={{ fontSize: 10, color: '#888' }}>{ins.type}</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 3 }}>{ins.title}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>{ins.dataPoint}</div>
                    </div>
                  </div>
                );
              })}
            </ReportSection>
          )}

          {/* Lead Sources */}
          {sources.length > 0 && (
            <ReportSection title="Lead Sources">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#F7F8FA' }}>
                    {['Source', 'Contacts', 'Deals', 'Won', 'Win %', 'Revenue', 'Avg Deal'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#555', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: '1px solid #E2E5EA' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sources.map((s, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F7F8FA' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 500, color: '#111' }}>{fmtSource(s.source)}</td>
                      <td style={{ padding: '8px 12px', color: '#333' }}>{s.contacts}</td>
                      <td style={{ padding: '8px 12px', color: '#333' }}>{s.deals}</td>
                      <td style={{ padding: '8px 12px', color: '#059669', fontWeight: 600 }}>{s.won}</td>
                      <td style={{ padding: '8px 12px', color: s.winRate >= 40 ? '#059669' : s.winRate >= 20 ? '#F59E0B' : '#EF4444', fontWeight: 600 }}>{fmtPct(s.winRate)}</td>
                      <td style={{ padding: '8px 12px', color: '#333' }}>{fmt$(s.revenue)}</td>
                      <td style={{ padding: '8px 12px', color: '#333' }}>{fmt$(s.avgDealSize)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ReportSection>
          )}

          {/* Footer */}
          <div style={{ borderTop: '1px solid #E2E5EA', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 11, color: '#aaa' }}>Generated by PipeChamp · hubspot-leak-finder.vercel.app</div>
            <div style={{ fontSize: 11, color: '#aaa' }}>{today}</div>
          </div>
        </div>
      </div>
    </>
  );
}
