import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';

const fmt = (d) => d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null;
const card = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '22px 24px', marginBottom: 16 };
const label = { fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 };
const primaryBtn = (bg) => ({ background: bg, color: '#fff', border: 'none', borderRadius: 9, padding: '11px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer' });
const ghostBtn = { background: 'transparent', border: '1px solid #E2E5EA', borderRadius: 9, padding: '11px 18px', fontSize: 14, fontWeight: 600, color: '#374151', cursor: 'pointer' };

export default function Account({ onDisconnect, onNavigate }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    api.billingStatus().then(setStatus).catch(() => setStatus(null)).finally(() => setLoading(false));
  }, []);

  const isPro = status?.plan === 'pro';

  const go = async (which) => {
    setBusy(which);
    try {
      if (which === 'checkout') {
        // No-card, no-page: start the trial directly, then refresh status in place.
        await api.billingStartTrial();
        const s = await api.billingStatus();
        setStatus(s);
        setBusy('');
      } else {
        const { url } = await api.billingPortal();
        if (url) window.location.href = url; else throw new Error('no url');
      }
    } catch { setBusy(''); alert('Something went wrong. Please try again in a moment.'); }
  };

  const goToGoals = () => {
    try { sessionStorage.setItem('pc_open_goals', '1'); } catch { /* ignore */ }
    if (onNavigate) onNavigate('dashboard');
  };

  const statusLine = () => {
    if (!status || status.status === 'none') return 'No active subscription';
    if (status.status === 'trialing' && status.trialEnd) return `Free trial — ends ${fmt(status.trialEnd)}`;
    if (status.status === 'active' && status.currentPeriodEnd) return `Active — renews ${fmt(status.currentPeriodEnd)}`;
    if (status.status === 'past_due') return 'Payment past due — please update your card';
    if (status.status === 'canceled') return 'Canceled';
    return status.status;
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: '-0.02em', marginBottom: 20 }}>Settings</div>

      <div style={card}>
        <div style={label}>Plan &amp; Billing</div>
        {loading ? (
          <div style={{ color: '#6B7280', fontSize: 14 }}>Loading&hellip;</div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 800, padding: '4px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '.05em', background: isPro ? 'rgba(27,114,199,0.12)' : '#F3F4F6', color: isPro ? '#1B72C7' : '#6B7280' }}>{isPro ? 'Pro' : 'Free'}</span>
              <span style={{ fontSize: 13, color: '#6B7280' }}>{statusLine()}</span>
            </div>

            {isPro ? (
              <button onClick={() => go('portal')} disabled={busy === 'portal'} style={primaryBtn('#1B72C7')}>{busy === 'portal' ? 'Opening…' : 'Manage billing'}</button>
            ) : (
              <>
                <div style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>PipeChamp Pro</span>
                  <span style={{ fontSize: 14, color: '#6B7280' }}> — $99/month</span>
                </div>
                <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>7-day free trial. No credit card to start.</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button onClick={() => go('checkout')} disabled={busy === 'checkout'} style={primaryBtn('#E8562A')}>{busy === 'checkout' ? 'Starting…' : 'Start free trial'}</button>
                  {status?.hasCustomer && <button onClick={() => go('portal')} disabled={busy === 'portal'} style={ghostBtn}>Manage billing</button>}
                </div>
              </>
            )}
            <div style={{ fontSize: 11.5, color: '#9CA3AF', marginTop: 14 }}>Secure checkout by Stripe &middot; Cancel anytime</div>
          </>
        )}
      </div>

      <div style={card}>
        <div style={label}>Goals &amp; targets</div>
        <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, marginBottom: 16 }}>
          Set your business targets so PipeChamp tunes your scorecard to what matters for your pipeline.
        </div>
        <button onClick={goToGoals} style={primaryBtn('#111827')}>Set your goals</button>
      </div>

      <div style={card}>
        <div style={label}>HubSpot connection</div>
        <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, marginBottom: 16 }}>
          Your HubSpot account is connected. PipeChamp has <strong>read-only</strong> access and never writes to your CRM.
        </div>
        <button onClick={onDisconnect} style={{ ...ghostBtn, color: '#B91C1C' }}>Disconnect HubSpot</button>
      </div>
    </div>
  );
}
