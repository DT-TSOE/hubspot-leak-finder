import React, { useEffect, useState, useCallback } from 'react';
import FunnelChart from '../components/FunnelChart';
import InsightCard from '../components/InsightCard';
import StageTimingTable from '../components/StageTimingTable';
import SourceTable from '../components/SourceTable';
import LeadScoreTable from '../components/LeadScoreTable';
import RevenueTab from '../components/RevenueTab';
import LaJefaChat from '../components/LaJefaChat';
import UpgradePrompt from '../components/UpgradePrompt';
import NotificationBell from '../components/NotificationBell';
import GmDashboard from '../components/GmDashboard';
import SourceQuality from '../components/SourceQuality';
import StageAging from '../components/StageAging';
import SpeedToLead from '../components/SpeedToLead';
import { api } from '../utils/api';
import { getPlanFeatures, getCurrentPlan, setPlan, PLANS } from '../utils/plan';

const TABS = [
  { id: 'home', label: 'Home', feature: 'gmDashboard' },
  { id: 'funnel', label: 'Funnel', feature: 'funnel' },
  { id: 'insights', label: 'Insights', feature: 'insights' },
  { id: 'sources', label: 'Sources', feature: 'sourceQuality' },
  { id: 'speed', label: 'Speed-to-Lead', feature: 'speedToLead' },
  { id: 'aging', label: 'Stage Aging', feature: 'stageAging' },
  { id: 'leads', label: 'Lead Risk', feature: 'leadRisk' },
  { id: 'revenue', label: 'Revenue', feature: 'revenue' },
];

const DATE_OPTS = [
  { label: 'All time', value: null },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 60 days', value: 60 },
  { label: 'Last 90 days', value: 90 }
];

function PlanBadge({ onUpgrade }) {
  const plan = getCurrentPlan();
  const colors = { free: { bg:'#F3F4F6', text:'#555' }, starter: { bg:'#EFF6FF', text:'#1D4ED8' }, pro: { bg:'#ECFDF5', text:'#059669' } };
  const c = colors[plan] || colors.free;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:6, background:c.bg, color:c.text, textTransform:'uppercase', letterSpacing:'.05em' }}>
        {PLANS[plan]?.name || 'Free'}
      </span>
      {plan !== 'pro' && (
        <button onClick={onUpgrade} style={{ fontSize:10, fontWeight:600, color:'#FF7A59', background:'transparent', border:'1px solid #FF7A59', borderRadius:5, padding:'2px 8px', cursor:'pointer' }}>
          Upgrade
        </button>
      )}
    </div>
  );
}

export default function DashboardPage({ onDisconnect }) {
  const [tab, setTab] = useState('home');
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
  const [ga4Connected, setGa4Connected] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const features = getPlanFeatures();

  const loadFunnel = useCallback(async (d) => {
    if (tab !== 'funnel' && tab !== 'insights') return;
    setLoading(true); setError(null);
    try {
      const [funnel, insights] = await Promise.all([api.getFunnel(d), api.getInsights(d)]);
      setFunnelData(funnel); setInsightsData(insights);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [tab]);

  const loadLeads = useCallback(async () => {
    if (leadsData) return;
    setLeadsLoading(true);
    try { setLeadsData(await api.getLeadScores()); } catch {}
    finally { setLeadsLoading(false); }
  }, [leadsData]);

  const loadRevenue = useCallback(async () => {
    if (revenueData) return;
    setRevenueLoading(true);
    try { setRevenueData(await api.getRevenue()); } catch {}
    finally { setRevenueLoading(false); }
  }, [revenueData]);

  useEffect(() => { loadFunnel(days); }, [days, loadFunnel]);
  useEffect(() => { api.ga4Status().then(s => setGa4Connected(s.connected)).catch(() => {}); }, []);
  useEffect(() => {
    if (tab === 'leads' && features.leadRisk) loadLeads();
    if (tab === 'revenue' && features.revenue) loadRevenue();
  }, [tab, features, loadLeads, loadRevenue]);

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

  return (
    <div style={{ minHeight:'100vh', background:'#F7F8FA', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <div style={{ height:3, background:'linear-gradient(90deg,#EF4444,#F59E0B 40%,#10B981)' }} />

      {/* Upgrade modal */}
      {showUpgrade && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={() => setShowUpgrade(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:16, padding:28, maxWidth:420, width:'100%' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div style={{ fontSize:16, fontWeight:700, color:'#111' }}>Upgrade PipeChamp</div>
              <button onClick={() => setShowUpgrade(false)} style={{ background:'transparent', border:'none', fontSize:20, color:'#aaa', cursor:'pointer' }}>✕</button>
            </div>
            {[
              { key:'starter', name:'Starter', price:'$9.99', features:['Pipeline Health Score','Source Quality Report','Stage Aging Report','Speed-to-Lead Monitor','Up to 10 insights','Lead risk scoring','Daily alerts'] },
              { key:'pro', name:'Pro', price:'$49', features:['Everything in Starter','Unlimited insights','Ask La Jefa AI chat','Revenue & LTV analysis','CSV exports','Insight filtering'] }
            ].map(p => (
              <div key={p.key} style={{ border:`2px solid ${getCurrentPlan() === p.key ? '#111' : '#E2E5EA'}`, borderRadius:10, padding:'14px 16px', marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <div style={{ fontSize:15, fontWeight:700, color:'#111' }}>{p.name}</div>
                  <div style={{ fontSize:18, fontWeight:700, color:'#111' }}>{p.price}<span style={{ fontSize:12, color:'#999', fontWeight:400 }}>/mo</span></div>
                </div>
                <div style={{ fontSize:11, color:'#666', marginBottom:12, lineHeight:1.7 }}>{p.features.map(f => `✓ ${f}`).join(' · ')}</div>
                <button onClick={() => { setPlan(p.key); setShowUpgrade(false); window.location.reload(); }}
                  style={{ width:'100%', padding:'9px', borderRadius:7, border:'none', background: p.key === 'pro' ? '#111' : '#F3F4F6', color: p.key === 'pro' ? '#fff' : '#111', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                  {getCurrentPlan() === p.key ? 'Current plan' : `Switch to ${p.name}`}
                </button>
              </div>
            ))}
            <p style={{ fontSize:11, color:'#aaa', textAlign:'center', margin:0 }}>Billing coming soon · For now plans are simulated</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header style={{ background:'#fff', borderBottom:'1px solid #E2E5EA', padding:'0 20px', display:'flex', alignItems:'center', justifyContent:'space-between', height:54, position:'sticky', top:0, zIndex:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:30, height:30, borderRadius:8, background:'#F0FBF0', border:'1px solid #C8E6C9', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>
            <img src="/el-pipeador.png" alt="" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top center' }} onError={e => { e.target.style.display='none'; e.target.parentElement.innerHTML='🤼'; }} />
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:15, color:'#111', letterSpacing:'-0.3px' }}>PipeChamp</div>
            <div style={{ fontSize:9, color:'#43A047', letterSpacing:3, textTransform:'uppercase' }}>Pipeline Hunter</div>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <PlanBadge onUpgrade={() => setShowUpgrade(true)} />
          <NotificationBell />

          {!ga4Connected && <a href="/ga4/connect" style={{ fontSize:11, color:'#3B82F6', textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}><span style={{ width:6, height:6, borderRadius:'50%', background:'#ccc', display:'inline-block' }} />Connect GA4</a>}
          {ga4Connected && <span style={{ fontSize:11, color:'#059669', display:'flex', alignItems:'center', gap:4 }}><span style={{ width:6, height:6, borderRadius:'50%', background:'#059669', display:'inline-block' }} />GA4</span>}

          <select value={days ?? ''} onChange={e => setDays(e.target.value ? parseInt(e.target.value) : null)}
            style={{ padding:'5px 10px', borderRadius:6, border:'1px solid #E2E5EA', fontSize:11, color:'#555', background:'#fff' }}>
            {DATE_OPTS.map(o => <option key={o.label} value={o.value ?? ''}>{o.label}</option>)}
          </select>

          <select onChange={e => { if (e.target.value) handleExport(e.target.value); e.target.value = ''; }} defaultValue=""
            style={{ padding:'5px 10px', borderRadius:6, border:'1px solid #E2E5EA', fontSize:11, color:'#555', background:'#fff' }}>
            <option value="" disabled>{exporting ? 'Exporting…' : '⬇ Export'}</option>
            <option value="funnel">Funnel (CSV)</option>
            <option value="leads">Lead scores (CSV)</option>
            <option value="digest">Insights (TXT)</option>
          </select>

          <button onClick={() => { api.disconnect(); onDisconnect(); }}
            style={{ padding:'5px 12px', borderRadius:6, border:'1px solid #E2E5EA', background:'#fff', fontSize:11, cursor:'pointer', color:'#888' }}>
            Disconnect
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ background:'#fff', borderBottom:'1px solid #E2E5EA', padding:'0 20px', display:'flex', overflowX:'auto' }}>
        {TABS.map(t => {
          const locked = !features[t.feature];
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding:'11px 14px', border:'none', background:'transparent', fontSize:13, cursor:'pointer', color:tab === t.id ? '#111' : '#888', borderBottom:tab === t.id ? '2px solid #111' : '2px solid transparent', fontWeight:tab === t.id ? 600 : 400, marginBottom:-1, display:'flex', alignItems:'center', gap:5, whiteSpace:'nowrap' }}>
              {t.label}
              {locked && t.id !== 'funnel' && <span style={{ fontSize:9 }}>🔒</span>}
            </button>
          );
        })}
      </div>

      <main style={{ maxWidth:1080, margin:'0 auto', padding:20, paddingBottom:100 }}>
        {/* HOME — GM Dashboard */}
        {tab === 'home' && (
          features.gmDashboard
            ? <GmDashboard />
            : <div style={{ marginTop:20 }}><UpgradePrompt feature="gmDashboard" requiredPlan="starter">Unlock the Pipeline Health Dashboard</UpgradePrompt></div>
        )}

        {/* SOURCES */}
        {tab === 'sources' && (
          features.sourceQuality
            ? <SourceQuality />
            : <div style={{ marginTop:20 }}><UpgradePrompt feature="sourceQuality" requiredPlan="starter">Unlock Source Quality Report</UpgradePrompt></div>
        )}

        {/* SPEED-TO-LEAD */}
        {tab === 'speed' && (
          features.speedToLead
            ? <SpeedToLead />
            : <div style={{ marginTop:20 }}><UpgradePrompt feature="speedToLead" requiredPlan="starter">Unlock Speed-to-Lead Monitor</UpgradePrompt></div>
        )}

        {/* STAGE AGING */}
        {tab === 'aging' && (
          features.stageAging
            ? <StageAging />
            : <div style={{ marginTop:20 }}><UpgradePrompt feature="stageAging" requiredPlan="starter">Unlock Stage Aging Report</UpgradePrompt></div>
        )}

        {/* FUNNEL & INSIGHTS — load funnel data */}
        {(tab === 'funnel' || tab === 'insights') && (
          <>
            {loading && <div style={{ textAlign:'center', padding:'4rem', color:'#888', fontSize:14 }}>Analyzing your data…</div>}
            {error && <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'12px 16px', color:'#DC2626', fontSize:13, marginBottom:14 }}>Error: {error}</div>}

            {!loading && !error && funnelData && tab === 'funnel' && (
              <>
                {funnelData.funnel.biggestLeak && (
                  <div style={{ background:'#fff', border:'1px solid #FECACA', borderLeft:'4px solid #EF4444', borderRadius:10, padding:'12px 16px', marginBottom:12, display:'flex', gap:12, alignItems:'flex-start' }}>
                    <div style={{ width:36, height:36, borderRadius:8, background:'#FEF2F2', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>📉</div>
                    <div>
                      <div style={{ fontSize:11, fontWeight:700, color:'#EF4444', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:3 }}>Biggest leak detected</div>
                      <div style={{ fontSize:14, fontWeight:600, color:'#111' }}>{funnelData.funnel.biggestLeak.description}</div>
                    </div>
                  </div>
                )}
                <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'14px 18px', marginBottom:12 }}>
                  <h2 style={{ margin:'0 0 12px', fontSize:13, fontWeight:600, color:'#111' }}>Lifecycle funnel</h2>
                  <FunnelChart funnelStages={funnelData.funnel.funnelStages} biggestLeak={funnelData.funnel.biggestLeak} />
                </div>
                <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'14px 18px' }}>
                  <h2 style={{ margin:'0 0 12px', fontSize:13, fontWeight:600, color:'#111' }}>Time between stages</h2>
                  <StageTimingTable stageTimes={funnelData.funnel.stageTimes} />
                </div>
              </>
            )}

            {!loading && !error && tab === 'insights' && (() => {
              if (!features.insights) return <UpgradePrompt feature="insights" requiredPlan="starter">Unlock pipeline insights</UpgradePrompt>;
              const all = insightsData?.insights || [];
              if (!all.length) return (
                <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'2rem', textAlign:'center' }}>
                  <div style={{ fontSize:28, marginBottom:12 }}>🔍</div>
                  <div style={{ fontSize:15, fontWeight:600, color:'#111', marginBottom:6 }}>Not enough data yet</div>
                  <div style={{ fontSize:13, color:'#888', maxWidth:360, margin:'0 auto', lineHeight:1.6 }}>Connect more activity and closed deals to generate insights.</div>
                </div>
              );
              const visible = features.insightLimit === Infinity ? all : all.slice(0, features.insightLimit);
              return <>
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:18, fontWeight:700, color:'#111', letterSpacing:'-0.3px', marginBottom:3 }}>{all.length} issue{all.length !== 1 ? 's' : ''} found</div>
                  <div style={{ fontSize:12, color:'#888' }}>Click any card to see supporting data and the exact HubSpot fix.</div>
                </div>
                {visible.map((ins, i) => <InsightCard key={i} insight={ins} />)}
                {features.insightLimit !== Infinity && all.length > features.insightLimit && (
                  <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:10, padding:'14px 16px', textAlign:'center', marginTop:8 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#92400E', marginBottom:6 }}>+{all.length - features.insightLimit} more insights locked</div>
                    <button onClick={() => setShowUpgrade(true)} style={{ background:'#F59E0B', color:'#fff', border:'none', borderRadius:7, padding:'8px 20px', fontSize:13, fontWeight:600, cursor:'pointer' }}>Upgrade to Pro</button>
                  </div>
                )}
              </>;
            })()}
          </>
        )}

        {/* LEAD RISK */}
        {tab === 'leads' && (() => {
          if (!features.leadRisk) return <div style={{ marginTop:20 }}><UpgradePrompt feature="leadRisk" requiredPlan="starter">Unlock lead risk scoring</UpgradePrompt></div>;
          if (leadsLoading) return <div style={{ textAlign:'center', padding:'3rem', color:'#888', fontSize:13 }}>Scoring leads…</div>;
          const high = leadsData?.leads?.filter(l => l.risk === 'high').length || 0;
          return <>
            {high > 0 && (
              <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderLeft:'4px solid #EF4444', borderRadius:10, padding:'12px 16px', marginBottom:12, display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ fontSize:18, flexShrink:0 }}>📉</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#DC2626' }}>{high} leads at high risk</div>
                  <div style={{ fontSize:11, color:'#EF4444' }}>Act before these contacts go cold.</div>
                </div>
              </div>
            )}
            <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'14px 18px' }}>
              <h2 style={{ margin:'0 0 12px', fontSize:13, fontWeight:600, color:'#111' }}>Lead risk scores{leadsData ? ` — ${leadsData.total} active leads` : ''}</h2>
              <LeadScoreTable leads={leadsData?.leads} />
            </div>
          </>;
        })()}

        {/* REVENUE */}
        {tab === 'revenue' && (
          features.revenue
            ? <RevenueTab data={revenueData} loading={revenueLoading} />
            : <div style={{ marginTop:20 }}><UpgradePrompt feature="revenue" requiredPlan="pro">Unlock revenue & LTV analysis</UpgradePrompt></div>
        )}
      </main>

      {features.laJefa && <LaJefaChat />}
      {!features.laJefa && (
        <button onClick={() => setShowUpgrade(true)} style={{ position:'fixed', bottom:24, right:24, background:'#111', border:'2px solid #4CAF50', borderRadius:50, padding:'10px 16px', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer', boxShadow:'0 4px 16px rgba(0,0,0,0.2)', zIndex:1000, display:'flex', alignItems:'center', gap:8 }}>
          <span>🔒</span> Ask La Jefa
          <span style={{ fontSize:10, background:'#4CAF50', color:'#fff', borderRadius:4, padding:'1px 6px' }}>Pro</span>
        </button>
      )}
    </div>
  );
}
