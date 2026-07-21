import React, { useEffect, useState } from 'react';
import ConnectPage from './pages/ConnectPage';
import DashboardPage from './pages/DashboardPage';
import { api } from './utils/api';

export default function App() {
  const [connected, setConnected] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected')) { window.history.replaceState({},''  ,'/'); setConnected(true); return; }
    if (params.get('error')) window.history.replaceState({},'','/');
    api.authStatus().then(d => setConnected(d.connected)).catch(() => setConnected(false));
  }, []);

  if (connected === null) return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}><div className="pc-belt"><i></i><i></i><i></i><i></i><i></i></div></div>;
  return connected ? <DashboardPage onDisconnect={() => setConnected(false)}/> : <ConnectPage/>;
}
