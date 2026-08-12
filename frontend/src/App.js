import React, { useEffect, useState } from 'react';
import ConnectPage from './pages/ConnectPage';
import DashboardPage from './pages/DashboardPage';
import TrialGate from './pages/TrialGate';
import FunnelLoader from './components/FunnelLoader';
import { api } from './utils/api';
import { REQUIRE_TRIAL } from './utils/plan';
import { track, identifyPortal, resetAnalytics } from './utils/analytics';

const ENTITLED = ['trialing', 'active', 'past_due'];
const Loader = () => <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}><FunnelLoader variant="seq" size="lg" /></div>;

export default function App() {
  const [connected, setConnected] = useState(null);
  const [entitled, setEntitled] = useState(null); // null=unknown, true/false (only used when REQUIRE_TRIAL)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected')) { track('hubspot_connected'); window.history.replaceState({},''  ,'/'); setConnected(true); return; }
    if (params.get('error')) window.history.replaceState({},'','/');
    api.authStatus().then(d => setConnected(d.connected)).catch(() => setConnected(false));
  }, []);

  // Once connected, tie analytics + replays to the active HubSpot portal.
  useEffect(() => {
    if (!connected) return;
    api.getConnections()
      .then(d => { const a = d.connections?.find(c => c.active) || d.connections?.[0]; if (a?.portalId) identifyPortal(a.portalId, a.userEmail ? { email: a.userEmail } : {}); })
      .catch(() => {});
  }, [connected]);

  // Trial gate: once connected, require an active/trialing subscription to enter.
  useEffect(() => {
    if (!connected || !REQUIRE_TRIAL) return;
    let cancelled = false;
    // If we just came back from Stripe Checkout, the webhook may take ~1s to land, so retry.
    const justPaid = new URLSearchParams(window.location.search).get('billing') === 'success';
    const check = (tries) => {
      api.billingStatus()
        .then(s => {
          const ok = ENTITLED.includes(s.status);
          if (cancelled) return;
          if (ok || tries <= 0) setEntitled(ok);
          else setTimeout(() => check(tries - 1), 1500);
        })
        .catch(() => { if (!cancelled) setEntitled(false); });
    };
    check(justPaid ? 4 : 0);
    return () => { cancelled = true; };
  }, [connected]);

  const signOut = () => { api.disconnect(); resetAnalytics(); setConnected(false); setEntitled(null); };

  if (connected === null) return <Loader />;
  if (!connected) return <ConnectPage />;
  if (REQUIRE_TRIAL) {
    if (entitled === null) return <Loader />;
    if (!entitled) return <TrialGate onDisconnect={signOut} />;
  }
  return <DashboardPage onDisconnect={() => setConnected(false)} />;
}
