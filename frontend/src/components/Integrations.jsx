import React, { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';

function SeedButton() {
  const [status, setStatus] = useState('idle'); // idle | running | done | error
  const [log, setLog] = useState('');
  const logRef = useRef(null);

  const BASE = process.env.REACT_APP_API_URL || '';

  const run = async () => {
    setStatus('running');
    setLog('');
    try {
      const res = await fetch(`${BASE}/api/admin/seed`, { method: 'POST', credentials: 'include' });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setLog(prev => prev + decoder.decode(value));
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
      }
      setStatus('done');
    } catch (e) {
      setLog(e.message);
      setStatus('error');
    }
  };

  return (
    <div style={{ marginTop: 32, borderTop: '1px solid #F3F4F6', paddingTop: 24 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Developer</div>
      <div style={{ background: '#F7F8FA', border: '1px solid #E2E5EA', borderRadius: 10, padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: log ? 12 : 0 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 3 }}>Load test data</div>
            <div style={{ fontSize: 12, color: '#888' }}>Creates 77 contacts, 17 deals, and 5 lead sources in your HubSpot account so every PipeChamp feature has data to show. Only use on a test account.</div>
          </div>
          <button onClick={run} disabled={status === 'running'}
            style={{ marginLeft: 20, flexShrink: 0, padding: '8px 18px', borderRadius: 8, border: 'none', background: status === 'done' ? '#059669' : status === 'error' ? '#DC2626' : '#111', color: '#fff', fontSize: 12, fontWeight: 700, cursor: status === 'running' ? 'wait' : 'pointer', opacity: status === 'running' ? 0.7 : 1 }}>
            {status === 'idle' ? 'Load test data' : status === 'running' ? 'Running...' : status === 'done' ? 'Done' : 'Error'}
          </button>
        </div>
        {log && (
          <pre ref={logRef} style={{ margin: 0, padding: '10px 12px', background: '#111', color: '#4CAF50', fontSize: 11, borderRadius: 7, maxHeight: 200, overflowY: 'auto', fontFamily: 'monospace', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {log}
          </pre>
        )}
        {status === 'done' && (
          <div style={{ marginTop: 10, fontSize: 12, color: '#059669', fontWeight: 600 }}>
            Reload the page and switch tabs to see your data.
          </div>
        )}
      </div>
    </div>
  );
}

const INTEGRATIONS = [
  {
    id: 'hubspot', name: 'HubSpot', category: 'CRM', logo: '🟠', color: '#FF7A59',
    description: 'Contacts, deals, lifecycle stages, and pipeline health.',
    unlocks: ['Pipeline health score', 'Funnel analysis', 'Lead scoring', 'Stage aging', 'Source quality'],
    getStatus: async () => { const s = await api.authStatus(); return s.connected ? 'connected' : 'disconnected'; },
  },
  {
    id: 'ga4', name: 'Google Analytics 4', category: 'Analytics', logo: '📊', color: '#4285F4',
    description: 'Connect website traffic to see which pages and campaigns drive pipeline.',
    unlocks: ['Traffic to lead conversion rate', 'Which pages generate the most pipeline', 'Bounce rate vs lead quality'],
    connectUrl: '/ga4/connect',
    getStatus: async () => { const s = await api.ga4Status(); return s.connected ? 'connected' : 'available'; },
  },
  {
    id: 'google-ads', name: 'Google Ads', category: 'Paid Media', logo: '🎯', color: '#4285F4',
    description: 'See exactly which ad campaigns and keywords generate closed deals.',
    unlocks: ['Cost per lead by campaign', 'Cost per acquisition by keyword', 'ROAS based on actual closed revenue'],
    comingSoon: true,
  },
  {
    id: 'meta-ads', name: 'Meta Ads', category: 'Paid Media', logo: '📘', color: '#1877F2',
    description: 'Facebook and Instagram ad performance mapped to pipeline outcomes.',
    unlocks: ['Which campaigns generate closed deals', 'Cost per acquisition by ad set', 'Audience quality by win rate'],
    comingSoon: true,
  },
  {
    id: 'search-console', name: 'Search Console', category: 'SEO', logo: '🔍', color: '#34A853',
    description: 'Which organic keywords and pages are generating leads that actually convert.',
    unlocks: ['Keyword to closed deal attribution', 'Which pages produce the best leads', 'Organic vs paid lead quality comparison'],
    comingSoon: true,
  },
  {
    id: 'stripe', name: 'Stripe', category: 'Revenue', logo: '💳', color: '#635BFF',
    description: 'Verify actual revenue against HubSpot deal amounts and track MRR.',
    unlocks: ['Actual revenue vs HubSpot estimates', 'MRR and ARR trend', 'True customer LTV', 'Payment failure and churn signals'],
    comingSoon: true,
  },
  {
    id: 'quickbooks', name: 'QuickBooks Online', category: 'Revenue', logo: '📗', color: '#2CA01C',
    description: 'Connect your accounting data for verified revenue and true customer value.',
    unlocks: ['Actual invoiced and paid revenue', 'True customer LTV by source', 'Revenue vs pipeline accuracy'],
    comingSoon: true,
  },
  {
    id: 'xero', name: 'Xero', category: 'Revenue', logo: '📘', color: '#00B4D8',
    description: 'Accounting integration for verified revenue data across your pipeline.',
    unlocks: ['Actual revenue vs HubSpot deal values', 'Customer payment history', 'Invoice to close time by source'],
    comingSoon: true,
  },
  {
    id: 'slack', name: 'Slack', category: 'Notifications', logo: '💬', color: '#4A154B',
    description: 'Weekly pipeline digest and critical alerts delivered to your team.',
    unlocks: ['Weekly health score digest in Slack', 'Instant alert when leads go 24h uncontacted', 'At-risk deal notifications'],
    comingSoon: true,
  },
];

const CATEGORY_ORDER = ['CRM', 'Analytics', 'Paid Media', 'SEO', 'Revenue', 'Notifications'];

export default function Integrations() {
  const [statuses, setStatuses] = useState({});

  useEffect(() => {
    INTEGRATIONS.forEach(async (integration) => {
      if (integration.getStatus) {
        try {
          const status = await integration.getStatus();
          setStatuses(prev => ({ ...prev, [integration.id]: status }));
        } catch {
          setStatuses(prev => ({ ...prev, [integration.id]: 'error' }));
        }
      } else {
        setStatuses(prev => ({ ...prev, [integration.id]: integration.comingSoon ? 'soon' : 'available' }));
      }
    });
  }, []);

  const categories = CATEGORY_ORDER.filter(c => INTEGRATIONS.some(i => i.category === c));

  const StatusBadge = ({ status }) => {
    const map = {
      connected:    { bg:'#ECFDF5', text:'#059669', label:'Connected' },
      available:    { bg:'#EFF6FF', text:'#3B82F6', label:'Connect' },
      disconnected: { bg:'#F3F4F6', text:'#888',    label:'Reconnect' },
      soon:         { bg:'#FFFBEB', text:'#92400E', label:'Coming Soon' },
      error:        { bg:'#FEF2F2', text:'#DC2626', label:'Error' },
    };
    const s = map[status] || map.available;
    return <span style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20, background:s.bg, color:s.text }}>{s.label}</span>;
  };

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:13, color:'#888', maxWidth:560, lineHeight:1.7 }}>
          Every integration you connect unlocks more accurate insights. HubSpot alone gives you pipeline health — add ad platforms and you get cost per acquisition, add accounting tools and you get verified revenue, add Slack and PipeChamp comes to you.
        </div>
      </div>

      {categories.map(category => (
        <div key={category} style={{ marginBottom:28 }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#aaa', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12 }}>{category}</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:12 }}>
            {INTEGRATIONS.filter(i => i.category === category).map(integration => {
              const status = statuses[integration.id] || 'loading';
              return (
                <div key={integration.id} style={{ background:'#fff', border:'1px solid #E2E5EA', borderRadius:10, padding:'16px 18px', opacity: integration.comingSoon ? 0.75 : 1 }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:10 }}>
                    <div style={{ width:40, height:40, borderRadius:10, background:`${integration.color}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
                      {integration.logo}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:3 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:'#111' }}>{integration.name}</div>
                        {status !== 'loading' && (
                          integration.connectUrl && status !== 'connected'
                            ? <a href={integration.connectUrl} style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20, background:'#EFF6FF', color:'#3B82F6', textDecoration:'none' }}>Connect</a>
                            : <StatusBadge status={status} />
                        )}
                      </div>
                      <div style={{ fontSize:12, color:'#888', lineHeight:1.5 }}>{integration.description}</div>
                    </div>
                  </div>

                  {/* What you unlock */}
                  <div style={{ background:'#F7F8FA', borderRadius:7, padding:'8px 10px' }}>
                    <div style={{ fontSize:10, fontWeight:700, color:'#aaa', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5 }}>
                      {status === 'connected' ? 'Unlocked' : 'Unlocks'}
                    </div>
                    {integration.unlocks.map((item, i) => (
                      <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:6, marginBottom: i < integration.unlocks.length - 1 ? 4 : 0 }}>
                        <span style={{ color: status === 'connected' ? '#059669' : '#aaa', fontSize:11, marginTop:1, flexShrink:0 }}>{status === 'connected' ? '✓' : '○'}</span>
                        <span style={{ fontSize:12, color: status === 'connected' ? '#333' : '#999' }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <SeedButton />
    </div>
  );
}
