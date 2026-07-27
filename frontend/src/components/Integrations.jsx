import React, { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';

// ── Brand logo badge — real logos via Simple Icons CDN ────────────────────────
const LogoBadge = ({ slug, bg, size = 26 }) => (
  <div style={{ background: bg, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10 }}>
    <img
      src={`https://cdn.simpleicons.org/${slug}/ffffff`}
      width={size} height={size}
      alt=""
      style={{ display: 'block' }}
      onError={e => { e.target.style.display = 'none'; }}
    />
  </div>
);

// ── Seed button (dev only) ────────────────────────────────────────────────────
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
            <div style={{ fontSize: 12, color: '#888' }}>Creates 77 contacts, 17 deals, and 5 lead sources in your HubSpot account. Only use on a test account.</div>
          </div>
          <button onClick={run} disabled={status === 'running'}
            style={{ marginLeft: 20, flexShrink: 0, padding: '8px 18px', borderRadius: 8, border: 'none', background: status === 'done' ? '#2EBF9A' : status === 'error' ? '#E8562A' : '#111', color: '#fff', fontSize: 12, fontWeight: 700, cursor: status === 'running' ? 'wait' : 'pointer', opacity: status === 'running' ? 0.7 : 1 }}>
            {status === 'idle' ? 'Load test data' : status === 'running' ? 'Running…' : status === 'done' ? 'Done' : 'Error'}
          </button>
        </div>
        {log && <pre ref={logRef} style={{ margin: 0, padding: '10px 12px', background: '#111', color: '#2EBF9A', fontSize: 11, borderRadius: 7, maxHeight: 200, overflowY: 'auto', fontFamily: 'monospace', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{log}</pre>}
        {status === 'done' && <div style={{ marginTop: 10, fontSize: 12, color: '#0091AE', fontWeight: 600 }}>Reload the page to see your data.</div>}
      </div>
    </div>
  );
}

// ── Integration definitions ───────────────────────────────────────────────────
const INTEGRATIONS = [
  {
    id: 'hubspot', name: 'HubSpot CRM', category: 'CRM',
    logo: <LogoBadge slug="hubspot" bg="#FF7A59" />,
    description: 'Your deal pipeline, contacts, lifecycle stages, and revenue data.',
    unlocks: ['Pipeline health score', 'Funnel analysis', 'Stage aging', 'Lead scoring'],
    getStatus: async () => { const s = await api.authStatus(); return s.connected ? 'connected' : 'disconnected'; },
  },
  {
    id: 'ga4', name: 'Google Analytics 4', category: 'Analytics',
    logo: <LogoBadge slug="googleanalytics" bg="#E37400" />,
    description: 'Website traffic by channel — sessions, users, and which campaigns drive pipeline.',
    unlocks: ['Traffic → Lead conversion', 'Sessions by channel', 'Campaign attribution'],
    connectUrl: '/ga4/connect',
    getStatus: async () => { const s = await api.ga4Status(); return s.connected ? 'connected' : 'available'; },
  },
  {
    id: 'search-console', name: 'Google Search Console', category: 'SEO',
    logo: <LogoBadge slug="googlesearchconsole" bg="#458CF5" />,
    description: 'Search impressions, clicks, and top queries at the top of your acquisition funnel.',
    unlocks: ['Impression data on Marketing funnel', 'Top queries driving traffic', 'CTR by search term'],
    connectUrl: '/gsc/connect',
    getStatus: async () => { const s = await api.gscStatus(); return s.connected ? 'connected' : 'available'; },
  },
  {
    id: 'google-ads', name: 'Google Ads', category: 'Paid Media',
    logo: <LogoBadge slug="googleads" bg="#4285F4" />,
    description: 'Which ad campaigns and keywords generate closed deals, not just clicks.',
    unlocks: ['Cost per lead by campaign', 'True ROAS from closed revenue', 'Keyword → win rate'],
    comingSoon: true,
  },
  {
    id: 'meta-ads', name: 'Meta Ads', category: 'Paid Media',
    logo: <LogoBadge slug="meta" bg="#0082FB" />,
    description: 'Facebook and Instagram ad performance mapped to real pipeline outcomes.',
    unlocks: ['Which campaigns close deals', 'Cost per acquisition by ad set', 'Audience quality by win rate'],
    comingSoon: true,
  },
  {
    id: 'stripe', name: 'Stripe', category: 'Revenue',
    logo: <LogoBadge slug="stripe" bg="#635BFF" />,
    description: 'Verify actual revenue against HubSpot deal amounts and track real MRR.',
    unlocks: ['Actual revenue vs HubSpot estimates', 'MRR and ARR trend', 'True customer LTV'],
    comingSoon: true,
  },
  {
    id: 'quickbooks', name: 'QuickBooks Online', category: 'Revenue',
    logo: <LogoBadge slug="quickbooks" bg="#2CA01C" />,
    description: 'Connect accounting data for verified revenue and true customer value.',
    unlocks: ['Invoiced and paid revenue', 'True LTV by source', 'Revenue vs pipeline accuracy'],
    comingSoon: true,
  },
  {
    id: 'xero', name: 'Xero', category: 'Revenue',
    logo: <LogoBadge slug="xero" bg="#13B5EA" />,
    description: 'Accounting integration for verified revenue data across your pipeline.',
    unlocks: ['Revenue vs HubSpot deal values', 'Customer payment history', 'Invoice to close time'],
    comingSoon: true,
  },
  {
    id: 'slack', name: 'Slack', category: 'Notifications',
    logo: <LogoBadge slug="slack" bg="#4A154B" />,
    description: 'Weekly pipeline digest and critical alerts delivered straight to your team.',
    unlocks: ['Weekly health score digest', 'Uncontacted lead alerts', 'At-risk deal notifications'],
    comingSoon: true,
  },
];

// ── Card ──────────────────────────────────────────────────────────────────────
function IntegrationCard({ integration, status }) {
  const isConnected = status === 'connected';
  const isSoon = status === 'soon' || integration.comingSoon;
  const isAvailable = status === 'available' || status === 'disconnected' || status === 'error';
  const BASE = process.env.REACT_APP_API_URL || '';

  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${isConnected ? 'rgba(46,191,154,0.3)' : '#E5E7EB'}`,
      borderRadius: 14,
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      opacity: isSoon ? 0.65 : 1,
      transition: 'box-shadow .15s, transform .15s',
      position: 'relative',
      overflow: 'hidden',
    }}
      onMouseEnter={e => { if (!isSoon) { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
    >
      {/* Connected stripe */}
      {isConnected && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #1B72C7, #0091AE)' }} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {integration.logo}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 2 }}>{integration.name}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', background: '#F3F4F6', borderRadius: 5, padding: '2px 7px', display: 'inline-block' }}>{integration.category}</div>
          </div>
        </div>
        {isConnected && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 8, background: 'rgba(0,145,174,0.1)', color: '#0091AE', border: '1px solid rgba(0,145,174,0.3)', flexShrink: 0 }}>Connected</span>
        )}
        {isSoon && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 8, background: '#F3F4F6', color: '#888', border: '1px solid #E2E5EA', flexShrink: 0 }}>Coming soon</span>
        )}
      </div>

      {/* Description */}
      <p style={{ fontSize: 13, color: '#555', lineHeight: 1.55, margin: 0 }}>{integration.description}</p>

      {/* Unlocks */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {integration.unlocks.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 11, color: isConnected ? '#0091AE' : '#CBD6E2', flexShrink: 0 }}>✓</span>
            <span style={{ fontSize: 12, color: isConnected ? '#374151' : '#9CA3AF' }}>{item}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      {isAvailable && integration.connectUrl && (
        <a href={`${BASE}${integration.connectUrl}`}
          style={{ display: 'block', textAlign: 'center', padding: '9px', borderRadius: 8, background: '#111', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', marginTop: 'auto' }}>
          Connect →
        </a>
      )}
      {status === 'error' && integration.connectUrl && (
        <a href={`${BASE}${integration.connectUrl}`}
          style={{ display: 'block', textAlign: 'center', padding: '9px', borderRadius: 8, background: 'rgba(27,114,199,0.07)', color: '#1B72C7', fontSize: 12, fontWeight: 700, textDecoration: 'none', border: '1px solid rgba(27,114,199,0.25)', marginTop: 'auto' }}>
          Reconnect →
        </a>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
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
        setStatuses(prev => ({ ...prev, [integration.id]: 'soon' }));
      }
    });
  }, []);

  const connected = INTEGRATIONS.filter(i => statuses[i.id] === 'connected');
  const available = INTEGRATIONS.filter(i => ['available', 'disconnected', 'error'].includes(statuses[i.id]));
  const soon = INTEGRATIONS.filter(i => statuses[i.id] === 'soon' || (i.comingSoon && !statuses[i.id]));

  const Grid = ({ items }) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
      {items.map(i => <IntegrationCard key={i.id} integration={i} status={statuses[i.id]} />)}
    </div>
  );

  const SectionLabel = ({ color, children }) => (
    <div style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>{children}</div>
  );

  return (
    <div>
      <p style={{ fontSize: 13, color: '#666', lineHeight: 1.7, maxWidth: 600, marginBottom: 28 }}>
        Every connection unlocks more of your revenue picture. HubSpot alone gives you pipeline health — add ad platforms for cost-per-acquisition, add accounting tools for verified revenue.
      </p>

      {connected.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <SectionLabel color="#0091AE">Connected ({connected.length})</SectionLabel>
          <Grid items={connected} />
        </div>
      )}

      {available.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <SectionLabel color="#1B72C7">Available to connect</SectionLabel>
          <Grid items={available} />
        </div>
      )}

      {soon.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <SectionLabel color="#9CA3AF">Coming soon</SectionLabel>
          <Grid items={soon} />
        </div>
      )}

      <SeedButton />
    </div>
  );
}
