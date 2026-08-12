import React, { useEffect, useRef, useState } from 'react';
import { api, connectUrl } from '../utils/api';

const label = (c) => c.portalName || (c.portalId ? `Portal ${c.portalId}` : 'HubSpot');

// Header control: shows the active HubSpot portal and lets Pro users switch between
// or add connected accounts. Free users see "Add account" locked with an upgrade nudge.
export default function PortalSwitcher() {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);

  useEffect(() => { api.getConnections().then(setData).catch(() => setData(null)); }, []);
  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  if (!data || !data.connections?.length) return null;

  const active = data.connections.find(c => c.active) || data.connections[0];
  const canAddMore = data.canAddMore;

  const switchTo = async (portalId) => {
    if (busy || portalId === active.portalId) { setOpen(false); return; }
    setBusy(true);
    try { await api.setActiveConnection(portalId); window.location.reload(); }
    catch { setBusy(false); alert('Could not switch account. Please try again.'); }
  };

  const addAccount = () => {
    if (!canAddMore) return;
    window.location.href = connectUrl();
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 10px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--card)', cursor: 'pointer', maxWidth: 220 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2EBF9A', flexShrink: 0 }} />
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--navy-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label(active)}</span>
        <span style={{ fontSize: 9, color: 'var(--muted)', flexShrink: 0 }}>▾</span>
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, minWidth: 240, background: '#fff', border: '1px solid var(--line)', borderRadius: 10, boxShadow: '0 10px 30px -8px rgba(20,40,60,0.28)', zIndex: 50, overflow: 'hidden' }}>
          <div style={{ padding: '9px 14px 7px', fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>HubSpot accounts</div>
          {data.connections.map(c => (
            <button key={c.portalId} onClick={() => switchTo(c.portalId)} disabled={busy}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '9px 14px', border: 'none', background: c.active ? 'rgba(46,191,154,0.08)' : 'transparent', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.active ? '#2EBF9A' : '#CBD5E1', flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: c.active ? 600 : 500, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label(c)}</span>
                {c.userEmail && <span style={{ display: 'block', fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.userEmail}</span>}
              </span>
              {c.active && <span style={{ fontSize: 11, color: '#2EBF9A', fontWeight: 700 }}>✓</span>}
            </button>
          ))}
          <div style={{ borderTop: '1px solid #F1F5F9' }} />
          {canAddMore ? (
            <button onClick={addAccount}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', color: '#1B72C7', fontSize: 13, fontWeight: 600 }}>
              <span style={{ fontSize: 15, lineHeight: 1 }}>＋</span> Add HubSpot account
            </button>
          ) : (
            <div style={{ padding: '10px 14px', background: '#FFFBEB' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#92400E', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span>🔒</span> Connect multiple accounts
              </div>
              <div style={{ fontSize: 11.5, color: '#B45309', lineHeight: 1.5 }}>Manage every HubSpot portal from one place with Pro.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
