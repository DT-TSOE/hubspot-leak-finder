import React, { useEffect, useState, useCallback } from 'react';
import InsightCard from '../components/InsightCard';
import SourceQuality from '../components/SourceQuality';
import LeadScoreTable from '../components/LeadScoreTable';
import RevenueTab from '../components/RevenueTab';
import LaJefaChat from '../components/LaJefaChat';
import UpgradePrompt from '../components/UpgradePrompt';
import NotificationBell from '../components/NotificationBell';
import GmDashboard from '../components/GmDashboard';
import Scorecard from '../components/Scorecard';
import GrowthFunnel from '../components/GrowthFunnel';
import StageAging from '../components/StageAging';
import SpeedToLead from '../components/SpeedToLead';
import PipelineReport from '../components/PipelineReport';
import Integrations from '../components/Integrations';
import TourOverlay from '../components/TourOverlay';
import IntegrationHint from '../components/IntegrationHint';
import DateRangePicker from '../components/DateRangePicker';
import PipelineInsights from '../components/PipelineInsights';
import { api } from '../utils/api';
import { getPlanFeatures, getCurrentPlan, setPlan, PLANS } from '../utils/plan';

const SIDEBAR_W = 220;

const NAV = [
  { id: 'dashboard', label: 'Scorecard', icon: '▦', standalone: true },
  {
    type: 'group', label: 'Analyze', items: [
      { id: 'growth-funnel', label: 'Growth Funnel',  feature: 'funnel',       dateFilter: true },
      { id: 'at-risk',       label: 'At Risk',       feature: 'stageAging' },
      { id: 'lead-sources',  label: 'Lead Sources',  feature: 'sourceQuality' },
      { id: 'lead-response', label: 'Lead Response', feature: 'speedToLead' },
      { id: 'revenue',       label: 'Revenue',       feature: 'revenue' },
      { id: 'exports',       label: 'Report',        feature: null },
    ]
  },
  {
    type: 'group', label: 'Playbook', items: [
      { id: 'insights',   label: 'Insights',   feature: 'insights', dateFilter: true },
      { id: 'ask-coach',  label: 'Ask PipeCoach',  feature: 'pipeCoach' },
    ]
  },
];

const ALL_ITEMS = [
  { id: 'dashboard', label: 'Scorecard', standalone: true },
  { id: 'integrations', label: 'Integrations' },
  ...NAV.filter(n => n.type === 'group').flatMap(g => g.items),
];

const NO_DATE_SECTIONS = new Set(['ask-coach', 'integrations', 'exports', 'at-risk']);

function Sidebar({ section, onSection, plan, onUpgrade, onDisconnect, ga4Connected, insightCount, atRiskCount, healthScore }) {
  const colors = { free: { bg: '#F3F4F6', text: '#555' }, starter: { bg: '#EFF6FF', text: '#1D4ED8' }, pro: { bg: '#ECFDF5', text: '#059669' } };
  const pc = colors[plan] || colors.free;
  const features = getPlanFeatures();

  const NavItem = ({ item, dataTour }) => {
    const active = section === item.id;
    const locked = item.feature && !features[item.feature];
    return (
      <button data-tour={dataTour} onClick={() => onSection(item.id)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 14px 7px 16px', border: 'none', background: active ? '#F4F4F5' : 'transparent', cursor: 'pointer', borderRadius: 7, marginBottom: 1, borderLeft: active ? '2px solid #111' : '2px solid transparent', textAlign: 'left' }}>
        <span style={{ fontSize: 13, color: active ? '#111' : '#555', fontWeight: active ? 600 : 400 }}>{item.label}</span>
        <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {item.id === 'insights' && insightCount > 0 && <span style={{ fontSize: 9, background: '#F3F4F6', color: '#555', padding: '1px 5px', borderRadius: 8 }}>{insightCount}</span>}
          {item.id === 'at-risk' && atRiskCount > 0 && <span style={{ fontSize: 9, background: '#FEE2E2', color: '#DC2626', padding: '1px 5px', borderRadius: 8 }}>{atRiskCount}</span>}
          {locked && <span style={{ fontSize: 10, color: '#ccc' }}>🔒</span>}
        </span>
      </button>
    );
  };

  return (
    <aside style={{ position: 'fixed', top: 0, left: 0, width: SIDEBAR_W, height: '100vh', background: '#fff', borderRight: '1px solid #E2E5EA', display: 'flex', flexDirection: 'column', zIndex: 20 }}>
      {/* Logo */}
      <div style={{ padding: '16px 16px 14px', borderBottom: '1px solid #F3F4F6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: '#F0FBF0', border: '1px solid #C8E6C9', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
            <img src="/el-pipeador.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} onError={e => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '🤼'; }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#111', letterSpacing: '-0.3px', lineHeight: 1.2 }}>PipeChamp</div>
            <div style={{ fontSize: 8, color: '#43A047', letterSpacing: 2, textTransform: 'uppercase' }}>Pipeline Hunter</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
        {/* Dashboard - with live health score badge */}
        <button data-tour="nav-dashboard" onClick={() => onSection('dashboard')}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px 8px 16px', border: 'none', background: section === 'dashboard' ? '#F4F4F5' : 'transparent', cursor: 'pointer', borderRadius: 8, marginBottom: 4, borderLeft: section === 'dashboard' ? '2px solid #111' : '2px solid transparent', textAlign: 'left' }}>
          <span style={{ fontSize: 14, color: section === 'dashboard' ? '#111' : '#333', fontWeight: 700 }}>Scorecard</span>
          {healthScore ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: 16, fontWeight: 800, lineHeight: 1, color: healthScore.score >= 70 ? '#059669' : healthScore.score >= 50 ? '#D97706' : '#DC2626' }}>
                {healthScore.score}
              </span>
              <span style={{ fontSize: 9, fontWeight: 700, color: healthScore.score >= 70 ? '#059669' : healthScore.score >= 50 ? '#D97706' : '#DC2626', letterSpacing: '.03em' }}>
                Grade {healthScore.grade}
              </span>
            </div>
          ) : (
            <span style={{ width: 28, height: 28, borderRadius: 6, background: '#F3F4F6' }} />
          )}
        </button>

        <div style={{ margin: '8px 0 4px', borderTop: '1px solid #F3F4F6' }} />

        {NAV.filter(n => n.type === 'group').map(group => (
          <div key={group.label} style={{ marginBottom: 8 }} data-tour={`nav-${group.label.toLowerCase()}`}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '6px 16px 4px' }}>{group.label}</div>
            {group.items.map(item => <NavItem key={item.id} item={item} dataTour={`nav-${item.id}`} />)}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid #F3F4F6' }}>
        <button onClick={() => onSection('integrations')}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 7, padding: '7px 8px', border: 'none', background: section === 'integrations' ? '#F4F4F5' : 'transparent', cursor: 'pointer', borderRadius: 7, marginBottom: 8, textAlign: 'left' }}>
          <span style={{ fontSize: 14 }}>⚡</span>
          <span style={{ fontSize: 12, color: section === 'integrations' ? '#111' : '#666', fontWeight: section === 'integrations' ? 600 : 400 }}>Integrations</span>
          {!ga4Connected && <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#F59E0B', display: 'inline-block', flexShrink: 0 }} />}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: pc.bg, color: pc.text, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            {PLANS[plan]?.name || 'Free'}
          </span>
          {plan !== 'pro' && (
            <button onClick={onUpgrade} style={{ fontSize: 11, fontWeight: 600, color: '#FF7A59', background: 'transparent', border: '1px solid #FF7A59', borderRadius: 5, padding: '3px 8px', cursor: 'pointer' }}>
              Upgrade
            </button>
          )}
        </div>
        <button onClick={onDisconnect} style={{ width: '100%', padding: '6px', borderRadius: 6, border: '1px solid #E2E5EA', background: '#fff', fontSize: 11, cursor: 'pointer', color: '#888' }}>
          Disconnect
        </button>
      </div>
    </aside>
  );
}

function TopBar({ section, loading, onRefresh, insightsData }) {
  const item = ALL_ITEMS.find(i => i.id === section);
  return (
    <div style={{ background: '#fff', borderBottom: '1px solid #E2E5EA', padding: '0 24px', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>{item?.label || section}</span>
        {insightsData?.insights && <span style={{ fontSize: 11, color: '#aaa', marginLeft: 4 }}>{insightsData.insights.length} insights</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <NotificationBell />
        <button onClick={onRefresh} disabled={loading}
          style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #E2E5EA', background: '#fff', fontSize: 11, cursor: 'pointer', color: '#555' }}>
          {loading ? '…' : '↺'}
        </button>
      </div>
    </div>
  );
}

// Date filter bar - sits at the top of content area, below the sticky nav
function ContentDateBar({ section, days, onDays, onLockedDays }) {
  const features = getPlanFeatures();
  if (NO_DATE_SECTIONS.has(section)) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 16 }}>
      <DateRangePicker
        value={days}
        onChange={onDays}
        locked={!features.dateFilter}
        onLocked={onLockedDays}
      />
    </div>
  );
}

function Metric({ label, value, color, sub }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E5EA', borderRadius: 10, padding: '13px 16px', textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || '#111' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: sub.c || '#999', marginTop: 3 }}>{sub.t}</div>}
    </div>
  );
}

function Card({ title, children, action }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E5EA', borderRadius: 10, padding: '14px 18px', marginBottom: 12 }}>
      {(title || action) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          {title && <h2 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111' }}>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

function InsightFilters({ activeType, activeSeverity, onTypeChange, onSeverityChange, types }) {
  const TYPES = ['All', ...types];
  const SEVS = ['All', 'High', 'Medium', 'Low'];
  const sc = { High: '#EF4444', Medium: '#F59E0B', Low: '#059669', All: '#555' };
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {TYPES.map(t => {
          const active = activeType === (t === 'All' ? null : t);
          return <button key={t} onClick={() => onTypeChange(t === 'All' ? null : t)} style={{ fontSize: 10, padding: '3px 10px', borderRadius: 12, border: `1px solid ${active ? '#111' : '#E2E5EA'}`, background: active ? '#111' : '#fff', color: active ? '#fff' : '#666', cursor: 'pointer', fontWeight: 500 }}>{t}</button>;
        })}
      </div>
      <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
        {SEVS.map(s => {
          const active = activeSeverity === (s === 'All' ? null : s.toLowerCase());
          return <button key={s} onClick={() => onSeverityChange(s === 'All' ? null : s.toLowerCase())} style={{ fontSize: 10, padding: '3px 10px', borderRadius: 12, border: `1px solid ${active ? sc[s] : '#E2E5EA'}`, background: active ? sc[s] : '#fff', color: active ? '#fff' : '#666', cursor: 'pointer', fontWeight: 500 }}>{s}</button>;
        })}
      </div>
    </div>
  );
}

const VALID_SECTIONS = new Set(['dashboard','growth-funnel','at-risk','lead-sources','lead-response','revenue','exports','insights','ask-coach','integrations']);

export default function DashboardPage({ onDisconnect }) {
  const [section, setSection] = useState(() => {
    const path = window.location.pathname.slice(1);
    return VALID_SECTIONS.has(path) ? path : 'dashboard';
  });
  const [days, setDays] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [funnelData, setFunnelData] = useState(null);
  const [insightsData, setInsightsData] = useState(null);
  const [leadsData, setLeadsData] = useState(null);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [revenueData, setRevenueData] = useState(null);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [exporting, setExporting] = useState(null);
  const [funnelTab, setFunnelTab] = useState('marketing');
  const [ga4Connected, setGa4Connected] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [healthScore, setHealthScore] = useState(null);
  const [insightTypeFilter, setInsightTypeFilter] = useState(null);
  const [insightSevFilter, setInsightSevFilter] = useState(null);

  const features = getPlanFeatures();
  const plan = getCurrentPlan();

  const loadMain = useCallback(async (d) => {
    setLoading(true); setError(null);
    try {
      const [funnel, insights] = await Promise.all([api.getFunnel(d), api.getInsights(d)]);
      setFunnelData(funnel); setInsightsData(insights);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  const loadLeads = useCallback(async () => {
    if (leadsData) return;
    setLeadsLoading(true);
    try { setLeadsData(await api.getLeadScores(days)); } catch {}
    finally { setLeadsLoading(false); }
  }, [leadsData, days]);

  const loadRevenue = useCallback(async () => {
    if (revenueData) return;
    setRevenueLoading(true);
    try { setRevenueData(await api.getRevenue(days)); } catch {}
    finally { setRevenueLoading(false); }
  }, [revenueData, days]);

  // URL routing - back/forward browser navigation
  const navigateTo = useCallback((sectionId) => {
    setSection(sectionId);
    const url = `/${sectionId}`;
    if (window.location.pathname !== url) {
      window.history.pushState({ section: sectionId }, '', url);
    }
  }, []);

  useEffect(() => {
    // Set initial URL state
    const path = window.location.pathname.slice(1);
    const initial = VALID_SECTIONS.has(path) ? path : 'dashboard';
    window.history.replaceState({ section: initial }, '', `/${initial}`);

    const handlePop = (e) => {
      const sec = e.state?.section;
      if (sec && VALID_SECTIONS.has(sec)) setSection(sec);
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  useEffect(() => { loadMain(days); }, [days, loadMain]);
  useEffect(() => { api.ga4Status().then(s => setGa4Connected(s.connected)).catch(() => {}); }, []);
  useEffect(() => {
    if (section === 'at-risk' && features.stageAging) loadLeads();
    if (section === 'revenue' && features.revenue) loadRevenue();
  }, [section, features, loadLeads, loadRevenue]);

  const handleExport = async (type) => {
    if (!features.exports) { setShowUpgrade(true); return; }
    setExporting(type);
    try {
      if (type === 'leads') await api.exportLeadsCSV();
      else if (type === 'funnel') await api.exportFunnelCSV();
      else if (type === 'digest') await api.exportInsightsText();
    } catch (err) { alert('Export failed: ' + err.message); }
    finally { setExporting(null); }
  };

  const handleDays = (val) => {
    if (!features.dateFilter && val !== null) { setShowUpgrade(true); return; }
    setDays(val); setLeadsData(null); setRevenueData(null);
  };

  const handleDisconnect = () => { api.disconnect(); onDisconnect(); };

  const allInsights = insightsData?.insights || [];
  const insightTypes = [...new Set(allInsights.map(i => i.type))];
  const filteredInsights = allInsights.filter(ins => {
    if (insightTypeFilter && ins.type !== insightTypeFilter) return false;
    if (insightSevFilter && ins.severity !== insightSevFilter) return false;
    return true;
  });
  const visibleInsights = features.insightLimit === Infinity ? filteredInsights : filteredInsights.slice(0, features.insightLimit);
  const highRiskLeads = leadsData?.leads?.filter(l => l.risk === 'high').length || 0;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F7F8FA', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>

      {/* Upgrade modal */}
      {showUpgrade && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowUpgrade(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 400, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>Upgrade PipeChamp</div>
              <button onClick={() => setShowUpgrade(false)} style={{ background: 'transparent', border: 'none', fontSize: 20, color: '#aaa', cursor: 'pointer' }}>✕</button>
            </div>
            {[
              { key: 'starter', name: 'Starter', price: '$9.99', features: ['Up to 5 insights', 'Lead risk scoring', 'Behavioral analysis', 'Date range filters'] },
              { key: 'pro', name: 'Pro', price: '$49', features: ['Unlimited insights', 'Ask PipeCoach AI', 'Revenue & LTV analysis', 'Full activity analysis', 'CSV exports', 'Insight filtering'] }
            ].map(p => (
              <div key={p.key} style={{ border: `2px solid ${plan === p.key ? '#111' : '#E2E5EA'}`, borderRadius: 10, padding: '14px 16px', marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>{p.name}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#111' }}>{p.price}<span style={{ fontSize: 12, color: '#999', fontWeight: 400 }}>/mo</span></div>
                </div>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 12, lineHeight: 1.7 }}>{p.features.map(f => `✓ ${f}`).join(' · ')}</div>
                <button onClick={() => { setPlan(p.key); setShowUpgrade(false); window.location.reload(); }}
                  style={{ width: '100%', padding: '9px', borderRadius: 7, border: 'none', background: p.key === 'pro' ? '#111' : '#F3F4F6', color: p.key === 'pro' ? '#fff' : '#111', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  {plan === p.key ? 'Current plan' : `Switch to ${p.name}`}
                </button>
              </div>
            ))}
            <p style={{ fontSize: 11, color: '#aaa', textAlign: 'center', margin: 0 }}>Billing coming soon · Plans are simulated for now</p>
          </div>
        </div>
      )}

      <Sidebar section={section} onSection={navigateTo} plan={plan} onUpgrade={() => setShowUpgrade(true)} onDisconnect={handleDisconnect} ga4Connected={ga4Connected} insightCount={allInsights.length} atRiskCount={highRiskLeads} healthScore={healthScore} />

      <div style={{ marginLeft: SIDEBAR_W, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <TopBar section={section} loading={loading} onRefresh={() => loadMain(days)} insightsData={insightsData} />

        <main style={{ maxWidth: 960, width: '100%', margin: '0 auto', padding: '20px 24px 100px' }}>

          <ContentDateBar section={section} days={days} onDays={handleDays} onLockedDays={() => setShowUpgrade(true)} />

          {loading && section !== 'dashboard' && (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#888', fontSize: 14 }}>Analyzing your HubSpot data…</div>
          )}
          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', color: '#DC2626', fontSize: 13, marginBottom: 14 }}>Error: {error}</div>
          )}

          {/* DASHBOARD */}
          {section === 'dashboard' && <GmDashboard funnelData={funnelData} insightsData={insightsData} onTabChange={navigateTo} onScoreLoad={setHealthScore} days={days} />}

          {!loading && !error && funnelData && (

            <>
              {/* GROWTH FUNNEL - Marketing / Sales sub-tabs */}
              {section === 'growth-funnel' && (
                <GrowthFunnel funnelData={funnelData} onNavigate={navigateTo} days={days} tab={funnelTab} onTab={setFunnelTab} />
              )}

              {/* AT RISK - Stage Aging + Lead Risk merged */}
              {section === 'at-risk' && (() => {
                if (!features.stageAging) return <div style={{ marginTop: 20 }}><UpgradePrompt feature="stageAging" requiredPlan="starter">Unlock At Risk analysis</UpgradePrompt></div>;
                return <>
                  <StageAging days={days} />
                  {features.leadRisk && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 10 }}>Lead Risk Scores</div>
                      {leadsLoading
                        ? <div style={{ textAlign: 'center', padding: '2rem', color: '#888', fontSize: 13 }}>Scoring leads…</div>
                        : leadsData && <Card title={`${leadsData.total} active leads scored`} action={features.exports && <button onClick={() => handleExport('leads')} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #E2E5EA', background: '#fff', fontSize: 11, cursor: 'pointer', color: '#555' }}>{exporting === 'leads' ? '…' : 'Export CSV'}</button>}><LeadScoreTable leads={leadsData.leads} /></Card>
                      }
                    </div>
                  )}
                </>;
              })()}

              {/* LEAD SOURCES */}
              {section === 'lead-sources' && (
                features.sourceQuality
                  ? <SourceQuality days={days} onNavigate={navigateTo} />
                  : <div style={{ marginTop: 20 }}><UpgradePrompt feature="sourceQuality" requiredPlan="starter">Unlock Lead Sources analysis</UpgradePrompt></div>
              )}

              {/* LEAD RESPONSE */}
              {section === 'lead-response' && (
                features.speedToLead
                  ? <>
                      <SpeedToLead days={days} />
                      <IntegrationHint icon="💬" name="Slack" feature="Lead Response Alerts" benefit="Get notified the moment a lead goes 24+ hours without contact, so you never let a deal go cold." onConnect={() => navigateTo('integrations')} preview="rows" />
                    </>
                  : <div style={{ marginTop: 20 }}><UpgradePrompt feature="speedToLead" requiredPlan="starter">Unlock Lead Response analysis</UpgradePrompt></div>
              )}

              {/* REVENUE */}
              {section === 'revenue' && (
                features.revenue
                  ? <RevenueTab data={revenueData} loading={revenueLoading} onNavigate={navigateTo} days={days} />
                  : <div style={{ marginTop: 20 }}><UpgradePrompt feature="revenue" requiredPlan="pro">Unlock Revenue & LTV analysis</UpgradePrompt></div>
              )}

              {/* EXPORTS - scrollable pipeline report + download/email */}
              {section === 'exports' && (
                <PipelineReport funnelData={funnelData} insightsData={insightsData} />
              )}

              {/* placeholder - integrations rendered outside funnelData gate below */}

              {/* INSIGHTS */}
              {section === 'insights' && (() => {
                if (!features.insights) return (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ background: '#fff', border: '1px solid #E2E5EA', borderRadius: 10, padding: '16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ fontSize: 28 }}>🔍</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 3 }}>{allInsights.length > 0 ? `PipeCoach found ${allInsights.length} issues in your pipeline` : 'Analyzing your pipeline…'}</div>
                        <div style={{ fontSize: 12, color: '#888' }}>Upgrade to see what's breaking your funnel and exactly how to fix it.</div>
                      </div>
                    </div>
                    <UpgradePrompt feature="insights" requiredPlan="starter">Unlock {allInsights.length} pipeline insights</UpgradePrompt>
                  </div>
                );
                if (!allInsights.length) return (
                  <div style={{ background: '#fff', border: '1px solid #E2E5EA', borderRadius: 10, padding: '2rem', textAlign: 'center' }}>
                    <div style={{ fontSize: 28, marginBottom: 12 }}>🔍</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#111', marginBottom: 6 }}>Not enough data yet</div>
                    <div style={{ fontSize: 13, color: '#888', maxWidth: 360, margin: '0 auto', lineHeight: 1.6 }}>Connect more HubSpot activity and closed deals to generate insights.</div>
                  </div>
                );
                return <>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#111', letterSpacing: '-0.3px', marginBottom: 3 }}>
                      {filteredInsights.length} {insightTypeFilter || insightSevFilter ? 'matching' : ''} issue{filteredInsights.length !== 1 ? 's' : ''} found
                      {(insightTypeFilter || insightSevFilter) && <span style={{ fontSize: 13, fontWeight: 400, color: '#888' }}> of {allInsights.length} total</span>}
                    </div>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>Click any card to see supporting data. Ask PipeCoach for step-by-step HubSpot instructions.</div>
                    {features.insightFilter
                      ? <InsightFilters activeType={insightTypeFilter} activeSeverity={insightSevFilter} onTypeChange={setInsightTypeFilter} onSeverityChange={setInsightSevFilter} types={insightTypes} />
                      : <UpgradePrompt feature="insightFilter" requiredPlan="pro" inline>Filter insights by type and severity</UpgradePrompt>
                    }
                  </div>
                  {visibleInsights.map((ins, i) => <InsightCard key={i} insight={ins} />)}
                  {features.insightLimit !== Infinity && filteredInsights.length > features.insightLimit && (
                    <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '14px 16px', textAlign: 'center', marginTop: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#92400E', marginBottom: 6 }}>+{filteredInsights.length - features.insightLimit} more insights locked</div>
                      <div style={{ fontSize: 12, color: '#92400E', marginBottom: 12 }}>Upgrade to Pro to see all insights and ask PipeCoach for personalised fixes.</div>
                      <button onClick={() => setShowUpgrade(true)} style={{ background: '#F59E0B', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Upgrade to Pro - $49/mo</button>
                    </div>
                  )}
                </>;
              })()}

              {/* ASK COACH */}
              {section === 'ask-coach' && (
                features.pipeCoach
                  ? <div style={{ maxWidth: 700, margin: '0 auto' }}><LaJefaChat inline /></div>
                  : <div style={{ marginTop: 20 }}><UpgradePrompt feature="pipeCoach" requiredPlan="pro">Unlock PipeCoach - your AI pipeline advisor</UpgradePrompt></div>
              )}
            </>
          )}
        </main>
      </div>

      {/* INTEGRATIONS - outside funnelData gate so it always renders */}
      {section === 'integrations' && (
        <div style={{ marginLeft: SIDEBAR_W, flex: 1 }}>
          <div style={{ maxWidth: 960, width: '100%', margin: '0 auto', padding: '20px 24px 100px' }}>
            <Integrations />
          </div>
        </div>
      )}

      {/* Floating PipeCoach button on all sections except ask-coach */}
      {section !== 'ask-coach' && (
        features.pipeCoach
          ? <LaJefaChat />
          : <button onClick={() => setShowUpgrade(true)} style={{ position: 'fixed', bottom: 24, right: 24, background: '#111', border: '2px solid #4CAF50', borderRadius: 50, padding: '10px 16px', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.2)', zIndex: 1000, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🔒</span> Ask PipeCoach
            <span style={{ fontSize: 10, background: '#4CAF50', color: '#fff', borderRadius: 4, padding: '1px 6px' }}>Pro</span>
          </button>
      )}

      <TourOverlay />
    </div>
  );
}
