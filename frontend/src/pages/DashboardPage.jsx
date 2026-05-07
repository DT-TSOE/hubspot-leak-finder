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
import { api } from '../utils/api';
import { canAccess, getPlanFeatures, getCurrentPlan, setPlan, PLANS } from '../utils/plan';

const TABS = ['Funnel', 'Insights', 'Revenue', 'Behavioral', 'Lead Risk'];
const DATE_OPTS = [
  { label: 'All time', value: null },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 60 days', value: 60 },
  { label: 'Last 90 days', value: 90 }
];
const fmtH = h => { if (h == null) return 'N/A'; if (h < 1) return `${Math.round(h * 60)}m`; if (h < 24) return `${Math.round(h)}h`; return `${Math.round(h / 24)}d`; };

function Card({ title, children, action }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'14px 18px', marginBottom:12 }}>
      {(title || action) && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          {title && <h2 style={{ margin:0, fontSize:13, fontWeight:600, color:'#111' }}>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

function Metric({ label, value, color, sub }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'13px 16px', textAlign:'center' }}>
      <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:700, color: color || '#111' }}>{value}</div>
      {sub && <div style={{ fontSize:11, color: sub.c || '#999', marginTop:3 }}>{sub.t}</div>}
    </div>
  );
}

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

function InsightFilters({ activeType, activeSeverity, onTypeChange, onSeverityChange, types, counts }) {
  const TYPES = ['All', ...types];
  const SEVS = ['All', 'High', 'Medium', 'Low'];
  return (
    <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
      <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
        {TYPES.map(t => (
          <button key={t} onClick={() => onTypeChange(t === 'All' ? null : t)}
            style={{ fontSize:10, padding:'3px 10px', borderRadius:12, border:`1px solid ${activeType === (t === 'All' ? null : t) ? '#111' : '#E2E5EA'}`, background:activeType === (t === 'All' ? null : t) ? '#111' : '#fff', color:activeType === (t === 'All' ? null : t) ? '#fff' : '#666', cursor:'pointer', fontWeight:500 }}>
            {t}
          </button>
        ))}
      </div>
      <div style={{ display:'flex', gap:4, marginLeft:'auto' }}>
        {SEVS.map(s => {
          const sc = { High:'#EF4444', Medium:'#F59E0B', Low:'#059669', All:'#555' };
          const active = activeSeverity === (s === 'All' ? null : s.toLowerCase());
          return (
            <button key={s} onClick={() => onSeverityChange(s === 'All' ? null : s.toLowerCase())}
              style={{ fontSize:10, padding:'3px 10px', borderRadius:12, border:`1px solid ${active ? sc[s] : '#E2E5EA'}`, background:active ? sc[s] : '#fff', color:active ? '#fff' : '#666', cursor:'pointer', fontWeight:500 }}>
              {s}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardPage({ onDisconnect }) {
  const [tab, setTab] = useState(0);
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
    try { setLeadsData(await api.getLeadScores()); } catch {}
    finally { setLeadsLoading(false); }
  }, [leadsData]);

  const loadRevenue = useCallback(async () => {
    if (revenueData) return;
    setRevenueLoading(true);
    try { setRevenueData(await api.getRevenue()); } catch {}
    finally { setRevenueLoading(false); }
  }, [revenueData]);

  useEffect(() => { loadMain(days); }, [days, loadMain]);
  useEffect(() => { api.ga4Status().then(s => setGa4Connected(s.connected)).catch(() => {}); }, []);
  useEffect(() => {
    if (tab === 4 && features.leadRisk) loadLeads();
    if (tab === 2 && features.revenue) loadRevenue();
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

  const handleDateChange = (val) => {
    if (!features.dateFilter && val) { setShowUpgrade(true); return; }
    setDays(val); setLeadsData(null); setRevenueData(null);
  };

  const s = funnelData?.summary;
  const highRisk = leadsData?.leads?.filter(l => l.risk === 'high').length || 0;
  const allInsights = insightsData?.insights || [];
  const insightTypes = [...new Set(allInsights.map(i => i.type))];
  const filteredInsights = allInsights.filter(ins => {
    if (insightTypeFilter && ins.type !== insightTypeFilter) return false;
    if (insightSevFilter && ins.severity !== insightSevFilter) return false;
    return true;
  });
  const visibleInsights = features.insightLimit === Infinity
    ? filteredInsights
    : filteredInsights.slice(0, features.insightLimit);

  return (
    <div style={{ minHeight:'100vh', background:'#F7F8FA', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <div style={{ height:3, background:'linear-gradient(90deg,#EF4444,#F59E0B 40%,#10B981)' }} />

      {/* Upgrade modal */}
      {showUpgrade && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={() => setShowUpgrade(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:16, padding:28, maxWidth:400, width:'100%' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div style={{ fontSize:16, fontWeight:700, color:'#111' }}>Upgrade PipeChamp</div>
              <button onClick={() => setShowUpgrade(false)} style={{ background:'transparent', border:'none', fontSize:20, color:'#aaa', cursor:'pointer' }}>✕</button>
            </div>
            {[
              { key:'starter', name:'Starter', price:'$9.99', features:['Up to 5 insights','Lead risk scoring','Behavioral analysis','Date range filters'] },
              { key:'pro', name:'Pro', price:'$49', features:['Unlimited insights','Ask La Jefa AI chat','Revenue & LTV analysis','Full activity analysis','CSV exports','Insight filtering'] }
            ].map(p => (
              <div key={p.key} style={{ border:`2px solid ${plan === p.key ? '#111' : '#E2E5EA'}`, borderRadius:10, padding:'14px 16px', marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <div style={{ fontSize:15, fontWeight:700, color:'#111' }}>{p.name}</div>
                  <div style={{ fontSize:18, fontWeight:700, color:'#111' }}>{p.price}<span style={{ fontSize:12, color:'#999', fontWeight:400 }}>/mo</span></div>
                </div>
                <div style={{ fontSize:11, color:'#666', marginBottom:12, lineHeight:1.7 }}>{p.features.map(f => `✓ ${f}`).join(' · ')}</div>
                <button onClick={() => { setPlan(p.key); setShowUpgrade(false); window.location.reload(); }}
                  style={{ width:'100%', padding:'9px', borderRadius:7, border:'none', background: p.key === 'pro' ? '#111' : '#F3F4F6', color: p.key === 'pro' ? '#fff' : '#111', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                  {plan === p.key ? 'Current plan' : `Switch to ${p.name}`}
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
          {s && <span style={{ fontSize:11, color:'#ccc', marginLeft:10 }}>{(s.filteredContacts ?? s.totalContacts)?.toLocaleString()} contacts · {s.totalDeals?.toLocaleString()} deals</span>}
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <PlanBadge onUpgrade={() => setShowUpgrade(true)} />
          <NotificationBell />

          {!ga4Connected && <a href="/ga4/connect" style={{ fontSize:11, color:'#3B82F6', textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}><span style={{ width:6, height:6, borderRadius:'50%', background:'#ccc', display:'inline-block' }} />Connect GA4</a>}
          {ga4Connected && <span style={{ fontSize:11, color:'#059669', display:'flex', alignItems:'center', gap:4 }}><span style={{ width:6, height:6, borderRadius:'50%', background:'#059669', display:'inline-block' }} />GA4</span>}

          <select value={days ?? ''} onChange={e => handleDateChange(e.target.value ? parseInt(e.target.value) : null)}
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

          <button onClick={() => loadMain(days)} disabled={loading}
            style={{ padding:'5px 12px', borderRadius:6, border:'1px solid #E2E5EA', background:'#fff', fontSize:11, cursor:'pointer', color:'#555' }}>
            {loading ? '…' : '↺'}
          </button>
          <button onClick={() => { api.disconnect(); onDisconnect(); }}
            style={{ padding:'5px 12px', borderRadius:6, border:'1px solid #E2E5EA', background:'#fff', fontSize:11, cursor:'pointer', color:'#888' }}>
            Disconnect
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ background:'#fff', borderBottom:'1px solid #E2E5EA', padding:'0 20px', display:'flex' }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} style={{ padding:'11px 14px', border:'none', background:'transparent', fontSize:13, cursor:'pointer', color:tab === i ? '#111' : '#888', borderBottom:tab === i ? '2px solid #111' : '2px solid transparent', fontWeight:tab === i ? 600 : 400, marginBottom:-1, display:'flex', alignItems:'center', gap:5 }}>
            {t}
            {t === 'Lead Risk' && highRisk > 0 && <span style={{ fontSize:9, background:'#FEE2E2', color:'#DC2626', padding:'1px 5px', borderRadius:8, fontWeight:700 }}>{highRisk}</span>}
            {t === 'Insights' && allInsights.length > 0 && <span style={{ fontSize:9, background:'#F3F4F6', color:'#555', padding:'1px 5px', borderRadius:8 }}>{allInsights.length}</span>}
            {!features[t.toLowerCase().replace(' ', '')] && t !== 'Funnel' && t !== 'Insights' && <span style={{ fontSize:9 }}>🔒</span>}
          </button>
        ))}
      </div>

      <main style={{ maxWidth:920, margin:'0 auto', padding:20, paddingBottom:100 }}>
        {loading && <div style={{ textAlign:'center', padding:'4rem', color:'#888', fontSize:14 }}>Analyzing your HubSpot data…</div>}
        {error && <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'12px 16px', color:'#DC2626', fontSize:13, marginBottom:14 }}>Error: {error}</div>}

        {!loading && !error && funnelData && (
          <>
            {/* FUNNEL TAB */}
            {tab === 0 && (() => {
              const { funnel } = funnelData;
              const total = funnel.funnelStages[0]?.count || 0;
              const customers = funnel.funnelStages[funnel.funnelStages.length - 1]?.count || 0;
              const overall = total > 0 ? ((customers / total) * 100).toFixed(1) : 0;
              return <>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:12 }}>
                  <Metric label="Contacts Analyzed" value={total.toLocaleString()} />
                  <Metric label="Overall Conversion" value={`${overall}%`} color={parseFloat(overall) < 5 ? '#EF4444' : '#059669'} sub={{ t: parseFloat(overall) < 5 ? 'Below benchmark' : 'On track', c: parseFloat(overall) < 5 ? '#EF4444' : '#059669' }} />
                  <Metric label="Customers" value={customers.toLocaleString()} color="#FF7A59" />
                </div>
                {funnel.biggestLeak && (
                  <div style={{ background:'#fff', border:'1px solid #FECACA', borderLeft:'4px solid #EF4444', borderRadius:10, padding:'12px 16px', marginBottom:12, display:'flex', gap:12, alignItems:'flex-start' }}>
                    <div style={{ width:36, height:36, borderRadius:8, background:'#FEF2F2', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>📉</div>
                    <div>
                      <div style={{ fontSize:11, fontWeight:700, color:'#EF4444', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:3 }}>Biggest leak detected</div>
                      <div style={{ fontSize:14, fontWeight:600, color:'#111' }}>{funnel.biggestLeak.description}</div>
                    </div>
                  </div>
                )}
                <Card title="Lifecycle funnel"><FunnelChart funnelStages={funnel.funnelStages} biggestLeak={funnel.biggestLeak} /></Card>
                <Card title="Time between stages"><StageTimingTable stageTimes={funnel.stageTimes} /></Card>
              </>;
            })()}

            {/* INSIGHTS TAB */}
            {tab === 1 && (() => {
              if (!features.insights) {
                return (
                  <div style={{ marginTop:20 }}>
                    <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'16px', marginBottom:16, display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ fontSize:28 }}>🔍</div>
                      <div>
                        <div style={{ fontSize:14, fontWeight:600, color:'#111', marginBottom:3 }}>
                          {allInsights.length > 0 ? `La Jefa found ${allInsights.length} issues in your pipeline` : 'Analyzing your pipeline…'}
                        </div>
                        <div style={{ fontSize:12, color:'#888' }}>Upgrade to see what's breaking your funnel and exactly how to fix it.</div>
                      </div>
                    </div>
                    <UpgradePrompt feature="insights" requiredPlan="starter">
                      Unlock {allInsights.length} pipeline insights
                    </UpgradePrompt>
                  </div>
                );
              }

              if (!allInsights.length) return (
                <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'2rem', textAlign:'center' }}>
                  <div style={{ fontSize:28, marginBottom:12 }}>🔍</div>
                  <div style={{ fontSize:15, fontWeight:600, color:'#111', marginBottom:6 }}>Not enough data yet</div>
                  <div style={{ fontSize:13, color:'#888', maxWidth:360, margin:'0 auto', lineHeight:1.6 }}>Connect more HubSpot activity and closed deals to generate insights.</div>
                </div>
              );

              return <>
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:18, fontWeight:700, color:'#111', letterSpacing:'-0.3px', marginBottom:3 }}>
                    {filteredInsights.length} {insightTypeFilter || insightSevFilter ? 'matching' : ''} issue{filteredInsights.length !== 1 ? 's' : ''} found
                    {(insightTypeFilter || insightSevFilter) && <span style={{ fontSize:13, fontWeight:400, color:'#888' }}> of {allInsights.length} total</span>}
                  </div>
                  <div style={{ fontSize:12, color:'#888', marginBottom:10 }}>Click any card to see supporting data and the exact HubSpot fix.</div>

                  {features.insightFilter ? (
                    <InsightFilters
                      activeType={insightTypeFilter} activeSeverity={insightSevFilter}
                      onTypeChange={setInsightTypeFilter} onSeverityChange={setInsightSevFilter}
                      types={insightTypes}
                    />
                  ) : (
                    <UpgradePrompt feature="insightFilter" requiredPlan="pro" inline>
                      Filter insights by type and severity
                    </UpgradePrompt>
                  )}
                </div>

                {visibleInsights.map((ins, i) => <InsightCard key={i} insight={ins} />)}

                {features.insightLimit !== Infinity && filteredInsights.length > features.insightLimit && (
                  <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:10, padding:'14px 16px', textAlign:'center', marginTop:8 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#92400E', marginBottom:6 }}>
                      +{filteredInsights.length - features.insightLimit} more insights locked
                    </div>
                    <div style={{ fontSize:12, color:'#92400E', marginBottom:12 }}>Upgrade to Pro to see all insights and get La Jefa's full analysis.</div>
                    <button onClick={() => setShowUpgrade(true)} style={{ background:'#F59E0B', color:'#fff', border:'none', borderRadius:7, padding:'8px 20px', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                      Upgrade to Pro — $49/mo
                    </button>
                  </div>
                )}
              </>;
            })()}

            {/* REVENUE TAB */}
            {tab === 2 && (
              features.revenue
                ? <RevenueTab data={revenueData} loading={revenueLoading} />
                : <div style={{ marginTop:20 }}><UpgradePrompt feature="revenue" requiredPlan="pro">Unlock revenue & LTV analysis</UpgradePrompt></div>
            )}

            {/* BEHAVIORAL TAB */}
            {tab === 3 && (() => {
              if (!features.behavioral) return <div style={{ marginTop:20 }}><UpgradePrompt feature="behavioral" requiredPlan="starter">Unlock behavioral analysis</UpgradePrompt></div>;
              const { behavioral } = funnelData;
              return <>
                <Card title="Win rate by lead source"><SourceTable sources={behavioral.bySource} /></Card>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
                  <Metric label="Median touches (won)" value={behavioral.activityLevels.wonMedianTouches ?? 'N/A'} color="#059669" />
                  <Metric label="Median touches (lost)" value={behavioral.activityLevels.lostMedianTouches ?? 'N/A'} color="#EF4444" />
                  <Metric label="Speed to lead (won)" value={fmtH(behavioral.speedToLead.wonMedianHours)} color="#059669" />
                  <Metric label="Speed to lead (lost)" value={fmtH(behavioral.speedToLead.lostMedianHours)} color="#EF4444" />
                </div>
              </>;
            })()}

            {/* LEAD RISK TAB */}
            {tab === 4 && (() => {
              if (!features.leadRisk) return <div style={{ marginTop:20 }}><UpgradePrompt feature="leadRisk" requiredPlan="starter">Unlock lead risk scoring</UpgradePrompt></div>;
              if (leadsLoading) return <div style={{ textAlign:'center', padding:'3rem', color:'#888', fontSize:13 }}>Scoring leads…</div>;
              const high = leadsData?.leads?.filter(l => l.risk === 'high').length || 0;
              return <>
                {high > 0 && (
                  <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderLeft:'4px solid #EF4444', borderRadius:10, padding:'12px 16px', marginBottom:12, display:'flex', alignItems:'center', gap:12 }}>
                    <span style={{ fontSize:18, flexShrink:0 }}>📉</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'#DC2626' }}>{high} leads at high risk of going cold</div>
                      <div style={{ fontSize:11, color:'#EF4444', marginTop:1 }}>Act before these contacts drop off permanently.</div>
                    </div>
                    {features.exports && (
                      <button onClick={() => handleExport('leads')} style={{ padding:'5px 12px', borderRadius:6, border:'1px solid #FECACA', background:'#fff', fontSize:11, cursor:'pointer', color:'#DC2626', flexShrink:0 }}>Export CSV</button>
                    )}
                  </div>
                )}
                <Card title={`Lead risk scores${leadsData ? ` — ${leadsData.total} active leads` : ''}`}>
                  <LeadScoreTable leads={leadsData?.leads} />
                </Card>
              </>;
            })()}
          </>
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
