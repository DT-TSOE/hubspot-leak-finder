import React, { useEffect, useState, useCallback } from 'react';
import FunnelChart from '../components/FunnelChart';
import InsightCard from '../components/InsightCard';
import StageTimingTable from '../components/StageTimingTable';
import SourceTable from '../components/SourceTable';
import LeadScoreTable from '../components/LeadScoreTable';
import RevenueTab from '../components/RevenueTab';
import LaJefaChat from '../components/LaJefaChat';
import { api } from '../utils/api';

const TABS = ['Funnel','Insights','Revenue','Behavioral','Lead Risk'];
const DATE_OPTS = [{label:'All time',value:null},{label:'Last 30 days',value:30},{label:'Last 60 days',value:60},{label:'Last 90 days',value:90}];
const fmtH = h => { if (h==null) return 'N/A'; if (h<1) return `${Math.round(h*60)}m`; if (h<24) return `${Math.round(h)}h`; return `${Math.round(h/24)}d`; };

function Card({ title, children }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'14px 18px', marginBottom:12 }}>
      {title && <h2 style={{ margin:'0 0 12px', fontSize:13, fontWeight:600, color:'#111' }}>{title}</h2>}
      {children}
    </div>
  );
}

function Metric({ label, value, color, sub }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'13px 16px', textAlign:'center' }}>
      <div style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:700, color:color||'#111' }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:sub.c||'#999', marginTop:3 }}>{sub.t}</div>}
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
  useEffect(() => { api.ga4Status().then(s => setGa4Connected(s.connected)).catch(()=>{}); }, []);
  useEffect(() => { if (tab===4) loadLeads(); if (tab===2) loadRevenue(); }, [tab, loadLeads, loadRevenue]);

  const handleExport = async (type) => {
    setExporting(type);
    try {
      if (type==='leads') await api.exportLeadsCSV();
      else if (type==='funnel') await api.exportFunnelCSV();
      else if (type==='digest') await api.exportInsightsText();
    } catch (err) { alert('Export failed: '+err.message); }
    finally { setExporting(null); }
  };

  const s = funnelData?.summary;
  const highRisk = leadsData?.leads?.filter(l=>l.risk==='high').length||0;

  return (
    <div style={{ minHeight:'100vh', background:'#F7F8FA', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <div style={{ height:3, background:'linear-gradient(90deg,#EF4444,#F59E0B 40%,#10B981)' }}/>

      <header style={{ background:'#fff', borderBottom:'1px solid #E2E5EA', padding:'0 20px', display:'flex', alignItems:'center', justifyContent:'space-between', height:54, position:'sticky', top:0, zIndex:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:30, height:30, borderRadius:8, background:'#F0FBF0', border:'1px solid #C8E6C9', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>
            <img src="/el-pipeador.png" alt="" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top center' }} onError={e=>{e.target.style.display='none'; e.target.parentElement.innerHTML='🤼';}}/>
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:15, color:'#111', letterSpacing:'-0.3px' }}>PipeChamp</div>
            <div style={{ fontSize:9, color:'#43A047', letterSpacing:3, textTransform:'uppercase' }}>Pipeline Hunter</div>
          </div>
          {s && <span style={{ fontSize:11, color:'#ccc', marginLeft:10 }}>{(s.filteredContacts??s.totalContacts)?.toLocaleString()} contacts · {s.totalDeals?.toLocaleString()} deals{s.dateRange?` · last ${s.dateRange}d`:''}</span>}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {!ga4Connected && <a href="/ga4/connect" style={{ fontSize:11, color:'#3B82F6', textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}><span style={{ width:6, height:6, borderRadius:'50%', background:'#ccc', display:'inline-block' }}/>Connect GA4</a>}
          {ga4Connected && <span style={{ fontSize:11, color:'#059669', display:'flex', alignItems:'center', gap:4 }}><span style={{ width:6, height:6, borderRadius:'50%', background:'#059669', display:'inline-block' }}/>GA4</span>}
          <select value={days??''} onChange={e=>{setDays(e.target.value?parseInt(e.target.value):null); setLeadsData(null); setRevenueData(null);}} style={{ padding:'5px 10px', borderRadius:6, border:'1px solid #E2E5EA', fontSize:11, color:'#555', background:'#fff' }}>
            {DATE_OPTS.map(o=><option key={o.label} value={o.value??''}>{o.label}</option>)}
          </select>
          <select onChange={e=>{if(e.target.value)handleExport(e.target.value); e.target.value='';}} defaultValue="" style={{ padding:'5px 10px', borderRadius:6, border:'1px solid #E2E5EA', fontSize:11, color:'#555', background:'#fff' }}>
            <option value="" disabled>{exporting?'Exporting…':'⬇ Export'}</option>
            <option value="funnel">Funnel (CSV)</option>
            <option value="leads">Lead scores (CSV)</option>
            <option value="digest">Insights (TXT)</option>
          </select>
          <button onClick={()=>loadMain(days)} disabled={loading} style={{ padding:'5px 12px', borderRadius:6, border:'1px solid #E2E5EA', background:'#fff', fontSize:11, cursor:'pointer', color:'#555' }}>{loading?'…':'↺'}</button>
          <button onClick={()=>{api.disconnect(); onDisconnect();}} style={{ padding:'5px 12px', borderRadius:6, border:'1px solid #E2E5EA', background:'#fff', fontSize:11, cursor:'pointer', color:'#888' }}>Disconnect</button>
        </div>
      </header>

      <div style={{ background:'#fff', borderBottom:'1px solid #E2E5EA', padding:'0 20px', display:'flex' }}>
        {TABS.map((t,i)=>(
          <button key={t} onClick={()=>setTab(i)} style={{ padding:'11px 14px', border:'none', background:'transparent', fontSize:13, cursor:'pointer', color:tab===i?'#111':'#888', borderBottom:tab===i?'2px solid #111':'2px solid transparent', fontWeight:tab===i?600:400, marginBottom:-1 }}>
            {t}
            {t==='Lead Risk'&&highRisk>0&&<span style={{ marginLeft:5, fontSize:9, background:'#FEE2E2', color:'#DC2626', padding:'1px 5px', borderRadius:8, fontWeight:700 }}>{highRisk}</span>}
          </button>
        ))}
      </div>

      <main style={{ maxWidth:920, margin:'0 auto', padding:20, paddingBottom:100 }}>
        {loading && <div style={{ textAlign:'center', padding:'4rem', color:'#888', fontSize:14 }}>Analyzing your HubSpot data…</div>}
        {error && <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'12px 16px', color:'#DC2626', fontSize:13, marginBottom:14 }}>Error: {error}</div>}

        {!loading && !error && funnelData && (
          <>
            {tab===0 && (() => {
              const { funnel } = funnelData;
              const total = funnel.funnelStages[0]?.count||0;
              const customers = funnel.funnelStages[funnel.funnelStages.length-1]?.count||0;
              const overall = total>0?((customers/total)*100).toFixed(1):0;
              return <>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:12 }}>
                  <Metric label="Contacts Analyzed" value={total.toLocaleString()}/>
                  <Metric label="Overall Conversion" value={`${overall}%`} color={parseFloat(overall)<5?'#EF4444':'#059669'} sub={{ t:parseFloat(overall)<5?'Below benchmark':'On track', c:parseFloat(overall)<5?'#EF4444':'#059669' }}/>
                  <Metric label="Customers" value={customers.toLocaleString()} color="#FF7A59"/>
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
                <Card title="Lifecycle funnel"><FunnelChart funnelStages={funnel.funnelStages} biggestLeak={funnel.biggestLeak}/></Card>
                <Card title="Time between stages"><StageTimingTable stageTimes={funnel.stageTimes}/></Card>
              </>;
            })()}

            {tab===1 && (() => {
              if (!insightsData?.insights?.length) return (
                <div style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'2rem', textAlign:'center' }}>
                  <div style={{ fontSize:28, marginBottom:12 }}>🔍</div>
                  <div style={{ fontSize:15, fontWeight:600, color:'#111', marginBottom:6 }}>Not enough data yet</div>
                  <div style={{ fontSize:13, color:'#888', maxWidth:360, margin:'0 auto', lineHeight:1.6 }}>PipeChamp needs contacts with lifecycle stage history and a few closed deals to generate insights. Once your pipeline has more activity, La Jefa will surface exactly what to fix.</div>
                </div>
              );
              return <>
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:18, fontWeight:700, color:'#111', letterSpacing:'-0.3px', marginBottom:3 }}>{insightsData.insights.length} issues found</div>
                  <div style={{ fontSize:12, color:'#888' }}>Click any card to see supporting data and the recommended fix.</div>
                </div>
                {insightsData.insights.map((ins,i)=><InsightCard key={i} insight={ins}/>)}
              </>;
            })()}

            {tab===2 && <RevenueTab data={revenueData} loading={revenueLoading}/>}

            {tab===3 && (() => {
              const { behavioral } = funnelData;
              return <>
                <Card title="Win rate by lead source"><SourceTable sources={behavioral.bySource}/></Card>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
                  <Metric label="Median touches (won)" value={behavioral.activityLevels.wonMedianTouches??'N/A'} color="#059669"/>
                  <Metric label="Median touches (lost)" value={behavioral.activityLevels.lostMedianTouches??'N/A'} color="#EF4444"/>
                  <Metric label="Speed to lead (won)" value={fmtH(behavioral.speedToLead.wonMedianHours)} color="#059669"/>
                  <Metric label="Speed to lead (lost)" value={fmtH(behavioral.speedToLead.lostMedianHours)} color="#EF4444"/>
                </div>
              </>;
            })()}

            {tab===4 && (() => {
              if (leadsLoading) return <div style={{ textAlign:'center', padding:'3rem', color:'#888', fontSize:13 }}>Scoring leads…</div>;
              const high = leadsData?.leads?.filter(l=>l.risk==='high').length||0;
              return <>
                {high>0 && (
                  <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderLeft:'4px solid #EF4444', borderRadius:10, padding:'12px 16px', marginBottom:12, display:'flex', alignItems:'center', gap:12 }}>
                    <span style={{ fontSize:18, flexShrink:0 }}>📉</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'#DC2626' }}>{high} leads at high risk of going cold</div>
                      <div style={{ fontSize:11, color:'#EF4444', marginTop:1 }}>Act before these contacts drop off permanently.</div>
                    </div>
                    <button onClick={()=>handleExport('leads')} style={{ padding:'5px 12px', borderRadius:6, border:'1px solid #FECACA', background:'#fff', fontSize:11, cursor:'pointer', color:'#DC2626', flexShrink:0 }}>Export CSV</button>
                  </div>
                )}
                <Card title={`Lead risk scores${leadsData?` — ${leadsData.total} active leads`:''}`}>
                  <LeadScoreTable leads={leadsData?.leads}/>
                </Card>
              </>;
            })()}
          </>
        )}
      </main>

      <LaJefaChat/>
    </div>
  );
}
