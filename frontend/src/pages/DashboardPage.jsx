import React, { useEffect, useState, useCallback } from 'react';
import FunnelChart from '../components/FunnelChart';
import InsightCard from '../components/InsightCard';
import StageTimingTable from '../components/StageTimingTable';
import SourceTable from '../components/SourceTable';
import LeadScoreTable from '../components/LeadScoreTable';
import { api } from '../utils/api';

const NAV_ITEMS = ['Funnel', 'Insights', 'Behavioral', 'Lead Risk'];
const DATE_OPTIONS = [
  { label: 'All time', value: null },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 60 days', value: 60 },
  { label: 'Last 90 days', value: 90 },
];

export default function DashboardPage({ onDisconnect }) {
  const [activeTab, setActiveTab] = useState(0);
  const [dateRange, setDateRange] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [funnelData, setFunnelData] = useState(null);
  const [insightsData, setInsightsData] = useState(null);
  const [leadsData, setLeadsData] = useState(null);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [exporting, setExporting] = useState(null);

  const loadData = useCallback(async (days) => {
    setLoading(true);
    setError(null);
    try {
      const [funnel, insights] = await Promise.all([
        api.getFunnel(days),
        api.getInsights(days),
      ]);
      setFunnelData(funnel);
      setInsightsData(insights);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLeads = useCallback(async () => {
    if (leadsData) return;
    setLeadsLoading(true);
    try {
      const data = await api.getLeadScores();
      setLeadsData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLeadsLoading(false);
    }
  }, [leadsData]);

  useEffect(() => { loadData(dateRange); }, [dateRange, loadData]);

  useEffect(() => {
    if (activeTab === 3) loadLeads();
  }, [activeTab, loadLeads]);

  const handleDateChange = (val) => {
    setDateRange(val);
    setLeadsData(null);
  };

  const handleExport = async (type) => {
    setExporting(type);
    try {
      if (type === 'leads') await api.exportLeadsCSV();
      else if (type === 'funnel') await api.exportFunnelCSV();
      else if (type === 'digest') await api.exportInsightsText();
    } catch (err) {
      alert('Export failed: ' + err.message);
    } finally {
      setExporting(null);
    }
  };

  const handleDisconnect = async () => {
    await api.disconnect();
    onDisconnect();
  };

  const summary = funnelData?.summary;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background-tertiary)' }}>
      {/* Header */}
      <header style={{
        background: 'var(--color-background-primary)',
        borderBottom: '0.5px solid var(--color-border-tertiary)',
        padding: '0 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 54, position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg,#4F6CF7,#7C5CFC)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>📊</div>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)' }}>Lifecycle Leak Finder</span>
          {summary && (
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginLeft: 4 }}>
              {summary.filteredContacts?.toLocaleString() ?? summary.totalContacts?.toLocaleString()} contacts · {summary.totalDeals?.toLocaleString()} deals
              {summary.dateRange ? ` · last ${summary.dateRange}d` : ' · all time'}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Date range filter */}
          <select
            value={dateRange ?? ''}
            onChange={e => handleDateChange(e.target.value ? parseInt(e.target.value) : null)}
            style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid var(--color-border-secondary)', background: 'var(--color-background-primary)', fontSize: 12, color: 'var(--color-text-primary)', cursor: 'pointer' }}
          >
            {DATE_OPTIONS.map(o => <option key={o.label} value={o.value ?? ''}>{o.label}</option>)}
          </select>

          {/* Export dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              onChange={e => { if (e.target.value) handleExport(e.target.value); e.target.value = ''; }}
              defaultValue=""
              style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid var(--color-border-secondary)', background: 'var(--color-background-primary)', fontSize: 12, color: 'var(--color-text-primary)', cursor: 'pointer' }}
            >
              <option value="" disabled>{exporting ? 'Exporting…' : '⬇ Export'}</option>
              <option value="funnel">Funnel data (CSV)</option>
              <option value="leads">Lead risk scores (CSV)</option>
              <option value="digest">Insights digest (TXT)</option>
            </select>
          </div>

          <button onClick={() => loadData(dateRange)} disabled={loading} style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid var(--color-border-secondary)', background: 'transparent', fontSize: 12, cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
            {loading ? '…' : '↺'}
          </button>
          <button onClick={handleDisconnect} style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid var(--color-border-secondary)', background: 'transparent', fontSize: 12, cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
            Disconnect
          </button>
        </div>
      </header>

      {/* Tab nav */}
      <div style={{ background: 'var(--color-background-primary)', borderBottom: '0.5px solid var(--color-border-tertiary)', padding: '0 20px', display: 'flex' }}>
        {NAV_ITEMS.map((tab, i) => (
          <button key={tab} onClick={() => setActiveTab(i)} style={{
            padding: '11px 14px', border: 'none', background: 'transparent', fontSize: 13,
            cursor: 'pointer', color: activeTab === i ? '#4F6CF7' : 'var(--color-text-secondary)',
            borderBottom: activeTab === i ? '2px solid #4F6CF7' : '2px solid transparent',
            fontWeight: activeTab === i ? 500 : 400, marginBottom: -1,
          }}>
            {tab}
            {tab === 'Lead Risk' && leadsData?.leads?.filter(l => l.risk === 'high').length > 0 && (
              <span style={{ marginLeft: 6, fontSize: 10, background: '#FEE2E2', color: '#DC2626', padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>
                {leadsData.leads.filter(l => l.risk === 'high').length}
              </span>
            )}
          </button>
        ))}
      </div>

      <main style={{ maxWidth: 920, margin: '0 auto', padding: '20px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-secondary)' }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>⏳</div>
            <p style={{ fontSize: 14 }}>Analyzing your HubSpot data…</p>
          </div>
        )}
        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', color: '#DC2626', fontSize: 13, marginBottom: 16 }}>
            Error: {error}
          </div>
        )}
        {!loading && !error && funnelData && (
          <>
            {activeTab === 0 && <FunnelTab funnelData={funnelData} />}
            {activeTab === 1 && <InsightsTab insightsData={insightsData} />}
            {activeTab === 2 && <BehavioralTab funnelData={funnelData} />}
            {activeTab === 3 && <LeadRiskTab leadsData={leadsData} loading={leadsLoading} onExport={() => handleExport('leads')} />}
          </>
        )}
      </main>
    </div>
  );
}

function Card({ title, children, action }) {
  return (
    <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: '16px 20px', marginBottom: 14 }}>
      {(title || action) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          {title && <h2 style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

function MetricTile({ label, value, color }) {
  return (
    <div style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 500, color: color || 'var(--color-text-primary)' }}>{value}</div>
    </div>
  );
}

function FunnelTab({ funnelData }) {
  const { funnel } = funnelData;
  if (!funnel) return null;
  const stages = funnel.stages || [];
  const total = stages[0]?.count || 0;
  const customers = stages[stages.length - 1]?.count || 0;
  const overall = funnel.overallConversionRate ?? (total > 0 ? ((customers / total) * 100).toFixed(1) : 0);

  const biggestLeak = funnel.biggestLeakByRate ? {
    stage: funnel.biggestLeakByRate,
    description: `Only ${funnel.biggestLeakByRate.conversionRate}% of contacts convert to ${funnel.biggestLeakByRate.label} — ${funnel.biggestLeakByRate.dropOff} contacts lost here.`
  } : null;

  const stageTimes = {};
  stages.slice(1).forEach((stage, i) => {
    if (stage.medianDaysInStage !== null) {
      stageTimes[stage.stage] = {
        from: stages[i].label,
        to: stage.label,
        medianDays: stage.medianDaysInStage,
        meanDays: stage.avgDaysInStage,
        sampleSize: stage.sampleSize,
      };
    }
  });

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
        <MetricTile label="Contacts Analyzed" value={total.toLocaleString()} />
        <MetricTile label="Overall Conversion" value={`${overall}%`} color="#4F6CF7" />
        <MetricTile label="Customers" value={customers.toLocaleString()} color="#10B981" />
      </div>
      {biggestLeak && (
        <div style={{ background: '#FFFBEB', border: '1px solid #F59E0B', borderRadius: 9, padding: '12px 14px', marginBottom: 14, display: 'flex', gap: 10 }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
          <div>
            <p style={{ margin: '0 0 3px', fontWeight: 600, fontSize: 13, color: '#92400E' }}>Biggest Funnel Leak</p>
            <p style={{ margin: 0, fontSize: 13, color: '#78350F' }}>{biggestLeak.description}</p>
          </div>
        </div>
      )}
      <Card title="Lifecycle Funnel">
        <FunnelChart funnelStages={stages} biggestLeak={biggestLeak} />
      </Card>
      <Card title="Time Between Stages">
        <StageTimingTable stageTimes={stageTimes} />
      </Card>
    </>
  );
}

function InsightsTab({ insightsData }) {
  if (!insightsData?.insights?.length) {
    return <Card><p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>Not enough data to generate insights yet.</p></Card>;
  }
  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 3 }}>{insightsData.insights.length} Insights Found</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Click any insight to see supporting data and recommended action.</div>
      </div>
      {insightsData.insights.map((insight, i) => <InsightCard key={i} insight={insight} />)}
    </>
  );
}

function BehavioralTab({ funnelData }) {
  const { behavioral } = funnelData;
  return (
    <>
      <Card title="Win Rate by Lead Source"><SourceTable sources={behavioral.bySource} /></Card>
      <Card title="Activity Levels: Won vs Lost">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <MetricTile label="Median Touches (Won)" value={behavioral.activityLevels.wonMedianTouches ?? 'N/A'} color="#059669" />
          <MetricTile label="Median Touches (Lost)" value={behavioral.activityLevels.lostMedianTouches ?? 'N/A'} color="#DC2626" />
        </div>
      </Card>
      <Card title="Speed to Lead: Won vs Lost">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <MetricTile label="Time to First Contact (Won)" value={formatH(behavioral.speedToLead.wonMedianHours)} color="#059669" />
          <MetricTile label="Time to First Contact (Lost)" value={formatH(behavioral.speedToLead.lostMedianHours)} color="#DC2626" />
        </div>
      </Card>
    </>
  );
}

function LeadRiskTab({ leadsData, loading, onExport }) {
  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-secondary)' }}>⏳ Scoring leads…</div>;
  const highCount = leadsData?.leads?.filter(l => l.risk === 'high').length || 0;
  const medCount = leadsData?.leads?.filter(l => l.risk === 'medium').length || 0;

  return (
    <>
      {highCount > 0 && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 9, padding: '12px 14px', marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 16 }}>🔴</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: '#DC2626' }}>{highCount} high-risk leads</span>
            <span style={{ fontSize: 13, color: '#991B1B' }}> need immediate attention — they're likely going cold.</span>
          </div>
          <button onClick={onExport} style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid #FECACA', background: '#fff', fontSize: 12, cursor: 'pointer', color: '#DC2626', flexShrink: 0 }}>
            Export CSV
          </button>
        </div>
      )}
      <Card title={`Lead Risk Scores${leadsData ? ` — ${leadsData.total} active leads` : ''}`}>
        <LeadScoreTable leads={leadsData?.leads} />
      </Card>
    </>
  );
}

function formatH(hours) {
  if (hours == null) return 'N/A';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}
