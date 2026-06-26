import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';

const INTEGRATIONS = [
  {
    id: 'hubspot', name: 'HubSpot', category: 'CRM',
    description: 'Your CRM data — contacts, deals, lifecycle stages, and pipeline.',
    logo: '🟠', color: '#FF7A59',
    getStatus: async () => { const s = await api.authStatus(); return s.connected ? 'connected' : 'disconnected'; },
  },
  {
    id: 'ga4', name: 'Google Analytics 4', category: 'Analytics',
    description: 'Connect website traffic to see which pages drive pipeline.',
    logo: '📊', color: '#4285F4',
    connectUrl: '/ga4/connect',
    getStatus: async () => { const s = await api.ga4Status(); return s.connected ? 'connected' : 'available'; },
  },
  {
    id: 'google-ads', name: 'Google Ads', category: 'Paid',
    description: 'See ad spend vs pipeline ROI. Cost per lead, cost per closed deal.',
    logo: '🎯', color: '#4285F4', comingSoon: true,
  },
  {
    id: 'meta-ads', name: 'Meta Ads', category: 'Paid',
    description: 'Facebook & Instagram ad performance mapped to pipeline outcomes.',
    logo: '📘', color: '#1877F2', comingSoon: true,
  },
  {
    id: 'search-console', name: 'Search Console', category: 'SEO',
    description: 'Which organic keywords and pages generate leads that actually convert.',
    logo: '🔍', color: '#34A853', comingSoon: true,
  },
  {
    id: 'slack', name: 'Slack', category: 'Notifications',
    description: 'Receive your weekly pipeline digest and critical alerts in Slack.',
    logo: '💬', color: '#4A154B', comingSoon: true,
  },
];

const CATEGORY_ORDER = ['CRM', 'Analytics', 'Paid', 'SEO', 'Notifications'];

export default function Integrations() {
  const [statuses, setStatuses] = useState({});

  useEffect(() => {
    INTEGRATIONS.filter(i => i.getStatus).forEach(async (integration) => {
      try {
        const status = await integration.getStatus();
        setStatuses(prev => ({ ...prev, [integration.id]: status }));
      } catch {
        setStatuses(prev => ({ ...prev, [integration.id]: 'error' }));
      }
    });
    INTEGRATIONS.filter(i => !i.getStatus).forEach(i => {
      setStatuses(prev => ({ ...prev, [i.id]: i.comingSoon ? 'soon' : 'available' }));
    });
  }, []);

  const categories = [...new Set(CATEGORY_ORDER.filter(c => INTEGRATIONS.some(i => i.category === c)))];

  const StatusBadge = ({ status }) => {
    const styles = {
      connected: { bg: '#ECFDF5', text: '#059669', label: '● Connected' },
      available: { bg: '#EFF6FF', text: '#3B82F6', label: 'Connect' },
      disconnected: { bg: '#F3F4F6', text: '#888', label: 'Disconnected' },
      soon: { bg: '#FFFBEB', text: '#92400E', label: 'Coming Soon' },
      error: { bg: '#FEF2F2', text: '#DC2626', label: 'Error' },
    };
    const s = styles[status] || styles.available;
    return (
      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: s.bg, color: s.text }}>{s.label}</span>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: '#888', maxWidth: 560, lineHeight: 1.6 }}>
          Connect your marketing and analytics tools to see the full picture — from ad spend to closed deals. All data stays private and is only used to generate your pipeline insights.
        </div>
      </div>

      {categories.map(category => (
        <div key={category} style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>{category}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {INTEGRATIONS.filter(i => i.category === category).map(integration => {
              const status = statuses[integration.id] || 'loading';
              return (
                <div key={integration.id} style={{ background: '#fff', border: '1px solid #E2E5EA', borderRadius: 10, padding: '16px 18px', display: 'flex', gap: 14, alignItems: 'flex-start', opacity: integration.comingSoon ? 0.7 : 1 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${integration.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                    {integration.logo}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{integration.name}</div>
                      {status !== 'loading' && (
                        integration.connectUrl && status !== 'connected'
                          ? <a href={integration.connectUrl} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: '#EFF6FF', color: '#3B82F6', textDecoration: 'none' }}>Connect</a>
                          : <StatusBadge status={status} />
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>{integration.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
