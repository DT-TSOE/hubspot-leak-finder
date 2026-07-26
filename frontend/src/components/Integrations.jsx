import React, { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';

// ── Real brand logos ──────────────────────────────────────────────────────────
const HubSpotLogo = () => (
  <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
    <circle cx="30" cy="30" r="30" fill="#FF7A59"/>
    <path d="M34.5 22.5v-4.2a3.3 3.3 0 0 0 1.9-3 3.3 3.3 0 0 0-3.3-3.3 3.3 3.3 0 0 0-3.3 3.3c0 1.3.8 2.5 1.9 3v4.2a9.4 9.4 0 0 0-4.4 1.9l-11.5-9a3.7 3.7 0 0 0 .1-.9 3.7 3.7 0 1 0-3.7 3.7c.7 0 1.3-.2 1.9-.5l11.3 8.8a9.4 9.4 0 0 0-1.4 5 9.4 9.4 0 0 0 4 7.6l-3 3a2.7 2.7 0 0 0-.8-.1 2.7 2.7 0 1 0 2.7 2.7 2.7 2.7 0 0 0-.1-.8l3-3a9.4 9.4 0 0 0 5.6 1.9 9.4 9.4 0 0 0 9.4-9.4 9.4 9.4 0 0 0-9.8-9.9zm.4 15.1a5.3 5.3 0 1 1 0-10.6 5.3 5.3 0 0 1 0 10.6z" fill="white"/>
  </svg>
);

const GA4Logo = () => (
  <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
    <rect width="60" height="60" rx="12" fill="#F9F9F9"/>
    <rect x="10" y="32" width="10" height="18" rx="3" fill="#F9AB00"/>
    <rect x="25" y="20" width="10" height="30" rx="3" fill="#E37400"/>
    <rect x="40" y="10" width="10" height="40" rx="3" fill="#4285F4"/>
  </svg>
);

const SearchConsoleLogo = () => (
  <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
    <rect width="60" height="60" rx="12" fill="#F9F9F9"/>
    <circle cx="27" cy="27" r="13" stroke="#4285F4" strokeWidth="5" fill="none"/>
    <line x1="37" y1="37" x2="50" y2="50" stroke="#34A853" strokeWidth="5" strokeLinecap="round"/>
    <circle cx="27" cy="27" r="7" fill="#FBBC04" opacity="0.4"/>
    <circle cx="27" cy="27" r="3" fill="#EA4335"/>
  </svg>
);

const GoogleAdsLogo = () => (
  <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
    <rect width="60" height="60" rx="12" fill="#F9F9F9"/>
    <polygon points="30,8 56,52 4,52" fill="none" stroke="#FBBC04" strokeWidth="5"/>
    <polygon points="30,8 56,52 4,52" fill="#FBBC04" opacity="0.1"/>
    <circle cx="14" cy="46" r="7" fill="#4285F4"/>
    <circle cx="46" cy="46" r="7" fill="#34A853"/>
    <circle cx="30" cy="14" r="7" fill="#EA4335"/>
  </svg>
);

const MetaLogo = () => (
  <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
    <rect width="60" height="60" rx="12" fill="#1877F2"/>
    <path d="M10 30c0-7 4-13 10-13 4 0 7 3 10 8 3-5 6-8 10-8 6 0 10 6 10 13 0 5-2 9-5 11l-5-7c2-1 3-3 3-4 0-3-1-5-3-5s-4 2-6 8l3 5h-6l-3-5c-2-6-4-8-6-8-2 0-3 2-3 5 0 1 1 3 3 4l-5 7c-3-2-5-6-5-11z" fill="white"/>
  </svg>
);

const StripeLogo = () => (
  <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
    <rect width="60" height="60" rx="12" fill="#635BFF"/>
    <path d="M28 22c0-2 2-3 4-3 3 0 6 1 9 3l3-9c-3-2-8-3-12-3-8 0-14 5-14 12 0 12 16 10 16 16 0 2-2 3-5 3-4 0-8-1-12-4l-3 9c4 2 9 4 15 4 8 0 14-4 14-12 0-12-15-10-15-16z" fill="white"/>
  </svg>
);

const QuickBooksLogo = () => (
  <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
    <rect width="60" height="60" rx="12" fill="#2CA01C"/>
    <circle cx="30" cy="30" r="18" fill="white" opacity="0.15"/>
    <text x="30" y="37" textAnchor="middle" fill="white" fontSize="18" fontWeight="800" fontFamily="Arial, sans-serif">QB</text>
  </svg>
);

const XeroLogo = () => (
  <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
    <rect width="60" height="60" rx="12" fill="#00B4D8"/>
    <circle cx="30" cy="30" r="16" fill="white" opacity="0.15"/>
    <text x="30" y="38" textAnchor="middle" fill="white" fontSize="22" fontWeight="800" fontFamily="Arial, sans-serif">x</text>
  </svg>
);

const SlackLogo = () => (
  <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
    <rect width="60" height="60" rx="12" fill="#F9F9F9"/>
    <rect x="10" y="25" width="14" height="7" rx="3.5" fill="#E01E5A"/>
    <rect x="10" y="18" width="7" height="14" rx="3.5" fill="#E01E5A"/>
    <rect x="7" y="25" width="7" height="7" rx="3.5" fill="#E01E5A" opacity="0.5"/>
    <rect x="36" y="28" width="14" height="7" rx="3.5" fill="#36C5F0"/>
    <rect x="43" y="28" width="7" height="14" rx="3.5" fill="#36C5F0"/>
    <rect x="43" y="35" width="7" height="7" rx="3.5" fill="#36C5F0" opacity="0.5"/>
    <rect x="25" y="10" width="7" height="14" rx="3.5" fill="#2EB67D"/>
    <rect x="25" y="10" width="14" height="7" rx="3.5" fill="#2EB67D"/>
    <rect x="25" y="7" width="7" height="7" rx="3.5" fill="#2EB67D" opacity="0.5"/>
    <rect x="28" y="36" width="7" height="14" rx="3.5" fill="#ECB22E"/>
    <rect x="21" y="36" width="14" height="7" rx="3.5" fill="#ECB22E"/>
    <rect x="28" y="43" width="7" height="7" rx="3.5" fill="#ECB22E" opacity="0.5"/>
  </svg>
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
            style={{ marginLeft: 20, flexShrink: 0, padding: '8px 18px', borderRadius: 8, border: 'none', background: status === 'done' ? '#059669' : status === 'error' ? '#DC2626' : '#111', color: '#fff', fontSize: 12, fontWeight: 700, cursor: status === 'running' ? 'wait' : 'pointer', opacity: status === 'running' ? 0.7 : 1 }}>
            {status === 'idle' ? 'Load test data' : status === 'running' ? 'Running…' : status === 'done' ? 'Done' : 'Error'}
          </button>
        </div>
        {log && <pre ref={logRef} style={{ margin: 0, padding: '10px 12px', background: '#111', color: '#4CAF50', fontSize: 11, borderRadius: 7, maxHeight: 200, overflowY: 'auto', fontFamily: 'monospace', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{log}</pre>}
        {status === 'done' && <div style={{ marginTop: 10, fontSize: 12, color: '#059669', fontWeight: 600 }}>Reload the page to see your data.</div>}
      </div>
    </div>
  );
}

// ── Integration definitions ───────────────────────────────────────────────────
const INTEGRATIONS = [
  {
    id: 'hubspot', name: 'HubSpot CRM', category: 'CRM',
    logo: <HubSpotLogo />,
    description: 'Your deal pipeline, contacts, lifecycle stages, and revenue data.',
    unlocks: ['Pipeline health score', 'Funnel analysis', 'Stage aging', 'Lead scoring'],
    getStatus: async () => { const s = await api.authStatus(); return s.connected ? 'connected' : 'disconnected'; },
  },
  {
    id: 'ga4', name: 'Google Analytics 4', category: 'Analytics',
    logo: <GA4Logo />,
    description: 'Website traffic by channel — sessions, users, and which campaigns drive pipeline.',
    unlocks: ['Traffic → Lead conversion', 'Sessions by channel', 'Campaign attribution'],
    connectUrl: '/ga4/connect',
    getStatus: async () => { const s = await api.ga4Status(); return s.connected ? 'connected' : 'available'; },
  },
  {
    id: 'search-console', name: 'Google Search Console', category: 'SEO',
    logo: <SearchConsoleLogo />,
    description: 'Search impressions, clicks, and top queries at the top of your acquisition funnel.',
    unlocks: ['Impression data on Marketing funnel', 'Top queries driving traffic', 'CTR by search term'],
    connectUrl: '/gsc/connect',
    getStatus: async () => { const s = await api.gscStatus(); return s.connected ? 'connected' : 'available'; },
  },
  {
    id: 'google-ads', name: 'Google Ads', category: 'Paid Media',
    logo: <GoogleAdsLogo />,
    description: 'Which ad campaigns and keywords generate closed deals, not just clicks.',
    unlocks: ['Cost per lead by campaign', 'True ROAS from closed revenue', 'Keyword → win rate'],
    comingSoon: true,
  },
  {
    id: 'meta-ads', name: 'Meta Ads', category: 'Paid Media',
    logo: <MetaLogo />,
    description: 'Facebook and Instagram ad performance mapped to real pipeline outcomes.',
    unlocks: ['Which campaigns close deals', 'Cost per acquisition by ad set', 'Audience quality by win rate'],
    comingSoon: true,
  },
  {
    id: 'stripe', name: 'Stripe', category: 'Revenue',
    logo: <StripeLogo />,
    description: 'Verify actual revenue against HubSpot deal amounts and track real MRR.',
    unlocks: ['Actual revenue vs HubSpot estimates', 'MRR and ARR trend', 'True customer LTV'],
    comingSoon: true,
  },
  {
    id: 'quickbooks', name: 'QuickBooks Online', category: 'Revenue',
    logo: <QuickBooksLogo />,
    description: 'Connect accounting data for verified revenue and true customer value.',
    unlocks: ['Invoiced and paid revenue', 'True LTV by source', 'Revenue vs pipeline accuracy'],
    comingSoon: true,
  },
  {
    id: 'xero', name: 'Xero', category: 'Revenue',
    logo: <XeroLogo />,
    description: 'Accounting integration for verified revenue data across your pipeline.',
    unlocks: ['Revenue vs HubSpot deal values', 'Customer payment history', 'Invoice to close time'],
    comingSoon: true,
  },
  {
    id: 'slack', name: 'Slack', category: 'Notifications',
    logo: <SlackLogo />,
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
      border: `1px solid ${isConnected ? '#BBF7D0' : '#E5E7EB'}`,
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
      {isConnected && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #059669, #2EBF9A)' }} />}

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
          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 8, background: '#ECFDF5', color: '#059669', border: '1px solid #BBF7D0', flexShrink: 0 }}>Connected</span>
        )}
        {isSoon && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 8, background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A', flexShrink: 0 }}>Coming soon</span>
        )}
      </div>

      {/* Description */}
      <p style={{ fontSize: 13, color: '#555', lineHeight: 1.55, margin: 0 }}>{integration.description}</p>

      {/* Unlocks */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {integration.unlocks.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 11, color: isConnected ? '#059669' : '#CBD6E2', flexShrink: 0 }}>✓</span>
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
          style={{ display: 'block', textAlign: 'center', padding: '9px', borderRadius: 8, background: '#FEF2F2', color: '#DC2626', fontSize: 12, fontWeight: 700, textDecoration: 'none', border: '1px solid #FECACA', marginTop: 'auto' }}>
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
          <SectionLabel color="#059669">Connected ({connected.length})</SectionLabel>
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
