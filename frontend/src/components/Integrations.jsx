import React, { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';

function SeedButton() {
  const [status, setStatus] = useState('idle');
  const [log, setLog] = useState('');
  const logRef = useRef(null);
  const BASE = process.env.REACT_APP_API_URL || '';

  const run = async () => {
    setStatus('running'); setLog('');
    try {
      const res = await fetch(`${BASE}/api/admin/seed`, { method: 'POST', credentials: 'include' });
      const reader = res.body.getReader(); const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        setLog(prev => prev + decoder.decode(value));
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
      }
      setStatus('done');
    } catch (e) { setLog(e.message); setStatus('error'); }
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
        {log && <pre ref={logRef} style={{ margin: 0, padding: '10px 12px', background: '#111', color: '#4CAF50', fontSize: 11, borderRadius: 7, maxHeight: 200, overflowY: 'auto', fontFamily: 'monospace', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{log}</pre>}
        {status === 'done' && <div style={{ marginTop: 10, fontSize: 12, color: '#059669', fontWeight: 600 }}>Reload the page and switch tabs to see your data.</div>}
      </div>
    </div>
  );
}

const INTEGRATIONS = [
  {
    id: 'hubspot', name: 'HubSpot', category: 'CRM', logo: '🟠', color: '#FF7A59',
    description: 'Your deal pipeline, contacts, lifecycle stages, and revenue data. The foundation everything else builds on.',
    unlocks: ['Pipeline health score', 'Funnel analysis', 'Lead scoring', 'Stage aging', 'Source quality'],
    getStatus: async () => { const s = await api.authStatus(); return s.connected ? 'connected' : 'disconnected'; },
  },
  {
    id: 'ga4', name: 'Google Analytics 4', category: 'Analytics', logo: '📊', color: '#4285F4',
    description: 'Website traffic by channel — see which pages and campaigns actually generate pipeline.',
    unlocks: ['Traffic → Lead conversion', 'Sessions and users by channel', 'Which campaigns drive pipeline'],
    connectUrl: '/ga4/connect',
    getStatus: async () => { const s = await api.ga4Status(); return s.connected ? 'connected' : 'available'; },
  },
  {
    id: 'search-console', name: 'Google Search Console', category: 'SEO', logo: '🔍', color: '#34A853',
    description: 'Search impressions, clicks, and top queries — the very top of your acquisition funnel.',
    unlocks: ['Real impressions on the Marketing funnel', 'Top search queries driving traffic', 'Clicks and CTR by query'],
    connectUrl: '/gsc/connect',
    getStatus: async () => { const s = await api.gscStatus(); return s.connected ? 'connected' : 'available'; },
  },
  {
    id: 'google-ads', name: 'Google Ads', category: 'Paid Media', logo: '🎯', color: '#FBBC04',
    description: 'Which ad campaigns and keywords generate closed deals, not just clicks.',
    unlocks: ['Cost per lead by campaign', 'Cost per acquisition by keyword', 'ROAS from actual closed revenue'],
    comingSoon: true,
  },
  {
    id: 'meta-ads', name: 'Meta Ads', category: 'Paid Media', logo: '📘', color: '#1877F2',
    description: 'Facebook and Instagram ad performance mapped all the way to pipeline outcomes.',
    unlocks: ['Which campaigns close deals', 'Cost per acquisition by ad set', 'Audience quality by win rate'],
    comingSoon: true,
  },
  {
    id: 'stripe', name: 'Stripe', category: 'Revenue', logo: '💳', color: '#635BFF',
    description: 'Verify actual revenue against HubSpot deal amounts and track real MRR.',
    unlocks: ['Actual revenue vs HubSpot estimates', 'MRR and ARR trend', 'True customer LTV', 'Payment failure signals'],
    comingSoon: true,
  },
  {
    id: 'quickbooks', name: 'QuickBooks Online', category: 'Revenue', logo: '📗', color: '#2CA01C',
    description: 'Connect your accounting data for verified revenue and true customer value.',
    unlocks: ['Actual invoiced and paid revenue', 'True LTV by source', 'Revenue vs pipeline accuracy'],
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
    description: 'Weekly pipeline digest and critical alerts delivered straight to your team.',
    unlocks: ['Weekly health score digest', 'Alert when leads go 24h uncontacted', 'At-risk deal notifications'],
    comingSoon: true,
  },
];

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

  const connected = INTEGRATIONS.filter(i => statuses[i.id] === 'connected');
  const available = INTEGRATIONS.filter(i => statuses[i.id] === 'available' || statuses[i.id] === 'disconnected' || statuses[i.id] === 'error' || statuses[i.id] === 'loading');
  const soon = INTEGRATIONS.filter(i => statuses[i.id] === 'soon' || i.comingSoon);

  const IntegrationCard = ({ integration, status, showConnect = false }) => {
    const isConnected = status === 'connected';
    return (
      <div style={{ background: '#fff', border: `1px solid ${isConnected ? '#BBF7D0' : '#E2E5EA'}`, borderRadius: 12, padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: `${integration.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
            {integration.logo}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>{integration.name}</div>
              {isConnected && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#ECFDF5', color: '#059669', border: '1px solid #BBF7D0' }}>Connected</span>}
              {status === 'error' && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#FEF2F2', color: '#DC2626' }}>Error</span>}
            </div>
            <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>{integration.description}</div>
          </div>
        </div>

        {/* Unlocks */}
        <div style={{ background: isConnected ? '#F0FDF4' : '#F7F8FA', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: isConnected ? '#059669' : '#aaa', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
            {isConnected ? 'Unlocked' : 'Unlocks'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {integration.unlocks.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                <span style={{ color: isConnected ? '#059669' : '#ccc', fontSize: 12, flexShrink: 0, marginTop: 1 }}>{isConnected ? '✓' : '○'}</span>
                <span style={{ fontSize: 12, color: isConnected ? '#333' : '#999' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        {showConnect && integration.connectUrl && !isConnected && (
          <a href={`${process.env.REACT_APP_API_URL || ''}${integration.connectUrl}`}
            style={{ display: 'block', textAlign: 'center', padding: '10px', borderRadius: 8, background: '#111', color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            Connect {integration.name} →
          </a>
        )}
        {status === 'disconnected' && integration.connectUrl && (
          <a href={`${process.env.REACT_APP_API_URL || ''}${integration.connectUrl}`}
            style={{ display: 'block', textAlign: 'center', padding: '10px', borderRadius: 8, background: '#fff', color: '#111', fontSize: 13, fontWeight: 700, textDecoration: 'none', border: '1px solid #E2E5EA' }}>
            Reconnect →
          </a>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Intro */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: '#666', lineHeight: 1.7, maxWidth: 600 }}>
          Every connection unlocks more of your revenue picture. HubSpot alone gives you pipeline health — add your ad platforms and you get cost-per-acquisition, add accounting tools and you get verified revenue.
        </div>
      </div>

      {/* Connected */}
      {connected.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            ✓ Connected ({connected.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {connected.map(i => <IntegrationCard key={i.id} integration={i} status={statuses[i.id]} />)}
          </div>
        </div>
      )}

      {/* Available to connect */}
      {available.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            Available to connect
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {available.map(i => <IntegrationCard key={i.id} integration={i} status={statuses[i.id]} showConnect />)}
          </div>
        </div>
      )}

      {/* Coming soon */}
      {soon.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            Coming soon
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {soon.map(integration => (
              <div key={integration.id} style={{ background: '#fff', border: '1px solid #F3F4F6', borderRadius: 12, padding: '20px', opacity: 0.6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: `${integration.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                    {integration.logo}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 2 }}>{integration.name}</div>
                    <div style={{ fontSize: 12, color: '#999', lineHeight: 1.5 }}>{integration.description}</div>
                  </div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#D97706', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 6, padding: '5px 10px', display: 'inline-block' }}>Coming soon</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <SeedButton />
    </div>
  );
}
