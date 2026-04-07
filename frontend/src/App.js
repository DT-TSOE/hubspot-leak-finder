import React, { useEffect, useState } from 'react';
import ConnectPage from './pages/ConnectPage';
import DashboardPage from './pages/DashboardPage';
import { api } from './utils/api';

export default function App() {
  const [connected, setConnected] = useState(null);

  useEffect(() => {
    // Check URL params (post-OAuth redirect)
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected')) {
      window.history.replaceState({}, '', '/');
      setConnected(true);
      return;
    }
    if (params.get('error')) {
      window.history.replaceState({}, '', '/');
    }

    // Check session status
    api.authStatus()
      .then(d => setConnected(d.connected))
      .catch(() => setConnected(false));
  }, []);

  if (connected === null) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-text-secondary)',
        fontSize: 15,
      }}>
        Loading…
      </div>
    );
  }

  return connected
    ? <DashboardPage onDisconnect={() => setConnected(false)} />
    : <ConnectPage />;
}
