import React, { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';

const SEV = {
  urgent: { color:'#DC2626', bg:'#FEF2F2', border:'#FECACA', dot:'#EF4444', label:'Urgent' },
  warning: { color:'#D97706', bg:'#FFFBEB', border:'#FDE68A', dot:'#F59E0B', label:'Watch' },
  info: { color:'#1D4ED8', bg:'#EFF6FF', border:'#BFDBFE', dot:'#3B82F6', label:'Info' },
};

const TYPE_ICONS = {
  response: '⚡',
  going_cold: '🧊',
  stuck: '⏸',
  low_touch: '👋',
  stalling_deal: '📉',
  batch: '🔔',
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [read, setRead] = useState(new Set());
  const [emailSetup, setEmailSetup] = useState(false);
  const [email, setEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 5 * 60 * 1000); // refresh every 5 min
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const data = await api.getAlerts();
      setAlerts(data.alerts || []);
    } catch {}
    finally { setLoading(false); }
  };

  const unreadCount = alerts.filter(a => !read.has(a.id)).length;
  const urgentCount = alerts.filter(a => a.severity === 'urgent').length;

  const handleOpen = () => {
    setOpen(!open);
    if (!open) {
      // Mark all as read when opened
      setRead(new Set(alerts.map(a => a.id)));
    }
  };

  const saveEmail = async () => {
    if (!email) return;
    setSavingEmail(true);
    try {
      await api.saveAlertPrefs({ email, frequency: 'daily', sendTime: '08:00' });
      setEmailSetup(false);
    } catch {}
    finally { setSavingEmail(false); }
  };

  return (
    <div ref={ref} style={{ position:'relative' }}>
      {/* Bell button */}
      <button onClick={handleOpen} style={{ position:'relative', width:34, height:34, borderRadius:8, background: urgentCount > 0 ? '#FEF2F2' : '#fff', border:`1px solid ${urgentCount > 0 ? '#FECACA' : '#E2E5EA'}`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>
        🔔
        {unreadCount > 0 && (
          <div style={{ position:'absolute', top:-4, right:-4, width:16, height:16, borderRadius:'50%', background: urgentCount > 0 ? '#EF4444' : '#F59E0B', border:'2px solid #fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, color:'#fff', fontWeight:700 }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{ position:'absolute', top:40, right:0, width:360, background:'#fff', border:'1px solid #E2E5EA', borderRadius:12, boxShadow:'0 8px 24px rgba(0,0,0,.1)', zIndex:500, overflow:'hidden', animation:'fadeIn .15s ease' }}>
          <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>

          {/* Header */}
          <div style={{ padding:'12px 14px', borderBottom:'1px solid #F3F4F6', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'#111' }}>Pipeline Alerts</div>
              <div style={{ fontSize:11, color:'#888' }}>
                {loading ? 'Checking…' : alerts.length === 0 ? 'All clear' : `${urgentCount} urgent · ${alerts.filter(a => a.severity === 'warning').length} warnings`}
              </div>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={() => setEmailSetup(!emailSetup)} title="Email digest" style={{ width:28, height:28, borderRadius:6, background:emailSetup?'#111':'#F3F4F6', border:'none', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {emailSetup ? '✕' : '📧'}
              </button>
              <button onClick={loadAlerts} disabled={loading} style={{ width:28, height:28, borderRadius:6, background:'#F3F4F6', border:'none', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center' }}>
                ↺
              </button>
            </div>
          </div>

          {/* Email setup */}
          {emailSetup && (
            <div style={{ padding:'12px 14px', background:'#F7F8FA', borderBottom:'1px solid #E2E5EA' }}>
              <div style={{ fontSize:12, fontWeight:600, color:'#111', marginBottom:8 }}>Daily email digest</div>
              <div style={{ fontSize:11, color:'#888', marginBottom:8 }}>Get a morning briefing with your pipeline alerts.</div>
              <div style={{ display:'flex', gap:6 }}>
                <input type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)}
                  style={{ flex:1, padding:'6px 10px', borderRadius:6, border:'1px solid #E2E5EA', fontSize:12, outline:'none' }} />
                <button onClick={saveEmail} disabled={savingEmail || !email}
                  style={{ padding:'6px 12px', borderRadius:6, background:'#111', border:'none', color:'#fff', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                  {savingEmail ? '…' : 'Save'}
                </button>
              </div>
            </div>
          )}

          {/* Alert list */}
          <div style={{ maxHeight:380, overflowY:'auto' }}>
            {alerts.length === 0 && !loading && (
              <div style={{ padding:'24px 16px', textAlign:'center' }}>
                <div style={{ fontSize:24, marginBottom:8 }}>✅</div>
                <div style={{ fontSize:13, fontWeight:600, color:'#111', marginBottom:4 }}>Pipeline looks healthy</div>
                <div style={{ fontSize:12, color:'#888' }}>No urgent issues right now. La Jefa is watching.</div>
              </div>
            )}

            {alerts.map((alert, i) => {
              const s = SEV[alert.severity] || SEV.info;
              const icon = TYPE_ICONS[alert.type] || '⚠️';
              const isUnread = !read.has(alert.id);
              return (
                <div key={alert.id} style={{ padding:'12px 14px', borderBottom:'1px solid #F9FAFB', background: isUnread ? s.bg : '#fff', transition:'background .2s' }}>
                  <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                    <div style={{ width:28, height:28, borderRadius:7, background:s.bg, border:`1px solid ${s.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0 }}>{icon}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:2 }}>
                        <span style={{ fontSize:9, fontWeight:700, color:s.color, background:s.bg, padding:'1px 6px', borderRadius:4, textTransform:'uppercase', letterSpacing:'.05em' }}>{s.label}</span>
                        {isUnread && <span style={{ width:6, height:6, borderRadius:'50%', background:s.dot, flexShrink:0 }} />}
                      </div>
                      <div style={{ fontSize:12, fontWeight:600, color:'#111', marginBottom:2, lineHeight:1.3 }}>{alert.title}</div>
                      <div style={{ fontSize:11, color:'#666', lineHeight:1.5, marginBottom:5 }}>{alert.body}</div>
                      {alert.benchmark && <div style={{ fontSize:10, color:s.color, fontStyle:'italic', marginBottom:5 }}>📊 {alert.benchmark}</div>}
                      <a href={alert.action.url} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize:11, fontWeight:600, color:s.color, textDecoration:'none' }}>
                        {alert.action.label} →
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {alerts.length > 0 && (
            <div style={{ padding:'10px 14px', borderTop:'1px solid #F3F4F6', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:11, color:'#aaa' }}>Updated just now · auto-refreshes every 5 min</span>
              <button onClick={() => setRead(new Set(alerts.map(a => a.id)))} style={{ fontSize:11, color:'#888', background:'transparent', border:'none', cursor:'pointer' }}>Mark all read</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
