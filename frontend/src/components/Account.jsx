import React, { useEffect, useState } from 'react';
import { api, connectUrl } from '../utils/api';

const portalLabel = (c) => c.portalName || (c.portalId ? `Portal ${c.portalId}` : 'HubSpot');

// Manage all connected HubSpot portals: switch active, disconnect one, add another.
function HubSpotAccounts({ onDisconnect }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState('');

  const load = () => api.getConnections().then(setData).catch(() => setData(null));
  useEffect(() => { load(); }, []);

  const makeActive = async (portalId) => {
    setBusy('active:' + portalId);
    try { await api.setActiveConnection(portalId); window.location.reload(); }
    catch { setBusy(''); alert('Could not switch account. Please try again.'); }
  };

  const removeOne = async (portalId, name) => {
    if (!window.confirm(`Disconnect ${name}? PipeChamp will lose access to that portal.`)) return;
    setBusy('remove:' + portalId);
    try {
      const r = await api.disconnectConnection(portalId);
      if (r.remaining === 0) { onDisconnect(); return; } // last one removed -> full sign-out
      if (data?.connections?.find(c => c.portalId === portalId)?.active) { window.location.reload(); return; }
      await load(); setBusy('');
    } catch { setBusy(''); alert('Could not disconnect. Please try again.'); }
  };

  const conns = data?.connections || [];

  return (
    <div style={card}>
      <div style={label}>HubSpot accounts</div>
      <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, marginBottom: 16 }}>
        PipeChamp has <strong>read-only</strong> access and never writes to your CRM.
      </div>

      {conns.map(c => (
        <div key={c.portalId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid #F1F5F9' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.active ? '#2EBF9A' : '#CBD5E1', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {portalLabel(c)} {c.active && <span style={{ fontSize: 11, fontWeight: 700, color: '#2EBF9A', marginLeft: 4 }}>· Active</span>}
            </div>
            {c.userEmail && <div style={{ fontSize: 12, color: '#9CA3AF' }}>{c.userEmail}</div>}
          </div>
          {!c.active && <button onClick={() => makeActive(c.portalId)} disabled={!!busy} style={{ ...ghostBtn, padding: '7px 12px', fontSize: 13 }}>{busy === 'active:' + c.portalId ? '…' : 'Switch'}</button>}
          <button onClick={() => removeOne(c.portalId, portalLabel(c))} disabled={!!busy} style={{ ...ghostBtn, padding: '7px 12px', fontSize: 13, color: '#B91C1C' }}>{busy === 'remove:' + c.portalId ? '…' : 'Disconnect'}</button>
        </div>
      ))}

      <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 16, marginTop: 4 }}>
        {data?.canAddMore ? (
          <button onClick={() => { window.location.href = connectUrl(); }} style={primaryBtn('#E8562A')}>+ Add HubSpot account</button>
        ) : (
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#92400E', marginBottom: 3 }}>🔒 Connect multiple HubSpot accounts with Pro</div>
            <div style={{ fontSize: 12.5, color: '#B45309', lineHeight: 1.5 }}>Free includes one connected portal. Upgrade to manage unlimited portals from one dashboard.</div>
          </div>
        )}
      </div>
    </div>
  );
}

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

      <HubSpotAccounts onDisconnect={onDisconnect} />
    </div>
  );
}
