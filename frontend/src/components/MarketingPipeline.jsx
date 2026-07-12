import React, { useState, useEffect, useCallback } from 'react';
import FunnelChart from './FunnelChart';
import StageTimingTable from './StageTimingTable';
import { api } from '../utils/api';

const CARD = { background: '#fff', border: '1px solid #E2E5EA', borderRadius: 10, padding: '14px 16px', marginBottom: 12 };
const BLUE_CARD = { ...CARD, borderColor: '#BFD4FF' };
const MKT_STAGES = ['Lead', 'MQL', 'SQL'];
const MKT_TIMING_KEYS = ['lead_to_marketingqualifiedlead', 'marketingqualifiedlead_to_salesqualifiedlead'];

// Marketing funnel: Impressions (Search Console) → Traffic (GA4) → Lead → MQL → SQL.
export default function MarketingPipeline({ funnelData, onNavigate }) {
  const [ga4, setGa4] = useState(null);
  const [gsc, setGsc] = useState(null);
  const [properties, setProperties] = useState(null);
  const [sites, setSites] = useState(null);

  const loadGa4 = useCallback(() => api.ga4Traffic().then(setGa4).catch(() => setGa4({ connected: false })), []);
  const loadGsc = useCallback(() => api.gscImpressions().then(setGsc).catch(() => setGsc({ connected: false })), []);
  useEffect(() => { loadGa4(); loadGsc(); }, [loadGa4, loadGsc]);
  useEffect(() => {
    if (ga4?.connected && ga4.needsProperty && properties == null) api.ga4Properties().then(r => setProperties(r.properties || [])).catch(() => setProperties([]));
  }, [ga4, properties]);
  useEffect(() => {
    if (gsc?.connected && gsc.needsSite && sites == null) api.gscSites().then(r => setSites(r.sites || [])).catch(() => setSites([]));
  }, [gsc, sites]);

  const selectProperty = async (id, name) => { await api.ga4SelectProperty(id, name); setGa4(null); await loadGa4(); };
  const selectSite = async (siteUrl) => { await api.gscSelectSite(siteUrl); setGsc(null); await loadGsc(); };

  if (!funnelData?.funnel) return <div style={{ textAlign: 'center', padding: '3rem', color: '#888', fontSize: 13 }}>Loading marketing funnel…</div>;
  const { funnel } = funnelData;
  const stages = funnel.funnelStages.filter(s => MKT_STAGES.includes(s.label));
  const timings = Object.fromEntries(Object.entries(funnel.stageTimes || {}).filter(([k]) => MKT_TIMING_KEYS.includes(k)));
  const leadCount = stages[0]?.count || 0;
  const sqlCount = stages[stages.length - 1]?.count || 0;
  const conv = leadCount > 0 ? ((sqlCount / leadCount) * 100).toFixed(1) : '0';

  const trafficOn = !!(ga4?.connected && !ga4.needsProperty && ga4.totalSessions != null);
  const imprOn = !!(gsc?.connected && !gsc.needsSite && gsc.impressions != null);
  const nothingConnected = !ga4?.connected && !gsc?.connected;

  const impressionsVal = imprOn ? gsc.impressions.toLocaleString() : (leadCount > 0 ? leadCount * 420 : 48200).toLocaleString();
  const trafficVal = trafficOn ? ga4.totalSessions.toLocaleString() : (leadCount > 0 ? leadCount * 26 : 3140).toLocaleString();

  const funnelBar = (label, val, width, locked) => (
    <div key={label} onClick={() => locked && onNavigate?.('integrations')} title={locked ? 'Connect to unlock' : undefined}
      style={{ position: 'relative', width, margin: '0 auto 6px', height: 38, borderRadius: 7, cursor: locked ? 'pointer' : 'default', overflow: 'hidden',
        background: locked ? '#EEF1F5' : '#EFF4FF', border: `1px ${locked ? 'dashed #CBD5E1' : 'solid #BFD4FF'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px' }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: locked ? '#7A8493' : '#1D4ED8', filter: locked ? 'blur(2px)' : 'none' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 800, color: locked ? '#5B6472' : '#111', filter: locked ? 'blur(2.5px)' : 'none' }}>{val}</span>
      {locked && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <span style={{ fontSize: 12 }}>🔒</span><span style={{ fontSize: 11, fontWeight: 700, color: '#FF7A59' }}>Unlock →</span>
        </div>
      )}
    </div>
  );

  const Picker = ({ title, subtitle, options, onPick, placeholder }) => (
    <div style={{ ...BLUE_CARD, background: '#F5F9FF' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>{subtitle}</div>
      {options == null ? <div style={{ fontSize: 12, color: '#888' }}>Loading…</div>
        : options.length === 0 ? <div style={{ fontSize: 12, color: '#888' }}>Nothing found on this account.</div>
        : (
          <select defaultValue="" onChange={e => e.target.value && onPick(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: '#fff', minWidth: 280 }}>
            <option value="" disabled>{placeholder}</option>
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
    </div>
  );

  return (
    <div>
      {/* Connect prompt when neither Google source is connected */}
      {nothingConnected && (
        <div style={{ ...CARD, borderStyle: 'dashed', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', gap: 8, flex: 1 }}>
            {[{ label: 'Impressions', val: impressionsVal }, { label: 'Traffic', val: trafficVal }].map(s => (
              <div key={s.label} style={{ position: 'relative', flex: 1, textAlign: 'center', padding: '10px 8px', background: '#F7F8FA', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ fontSize: 10, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.05em' }}>{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#5B6472', filter: 'blur(2.5px)', userSelect: 'none' }}>{s.val}</div>
                <div style={{ position: 'absolute', top: 6, right: 8, fontSize: 11 }}>🔒</div>
              </div>
            ))}
          </div>
          <div style={{ flex: 1.4, fontSize: 12, color: '#666', lineHeight: 1.5 }}>
            <strong style={{ color: '#111' }}>See the top of your funnel.</strong> Connect Search Console for impressions and Google Analytics for traffic - on top of your HubSpot leads.
            <button onClick={() => onNavigate?.('integrations')} style={{ display: 'block', marginTop: 6, fontSize: 11, fontWeight: 700, color: '#FF7A59', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>Connect Google →</button>
          </div>
        </div>
      )}

      {/* Pickers */}
      {gsc?.connected && gsc.needsSite && (
        <Picker title="✅ Search Console connected - pick your site" subtitle="Which property's impressions should feed the funnel?"
          options={sites?.map(s => ({ value: s.siteUrl, label: s.siteUrl }))} onPick={selectSite} placeholder="Select a site…" />
      )}
      {ga4?.connected && ga4.needsProperty && (
        <Picker title="✅ Google Analytics connected - pick your property" subtitle="Which GA4 property should feed traffic?"
          options={properties?.map(p => ({ value: p.id, label: `${p.name} (${p.account})` }))}
          onPick={(id) => { const p = properties.find(x => x.id === id); selectProperty(id, p?.name); }} placeholder="Select a property…" />
      )}

      {/* Impressions (Search Console) */}
      {imprOn && (
        <div style={BLUE_CARD}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>Search impressions - last {gsc.days} days <span style={{ fontSize: 11, fontWeight: 400, color: '#888' }}>· via Search Console</span></div>
            <div style={{ display: 'flex', gap: 18 }}>
              <div style={{ textAlign: 'right' }}><div style={{ fontSize: 20, fontWeight: 800, color: '#111' }}>{gsc.impressions.toLocaleString()}</div><div style={{ fontSize: 10, color: '#999' }}>IMPRESSIONS</div></div>
              <div style={{ textAlign: 'right' }}><div style={{ fontSize: 20, fontWeight: 800, color: '#111' }}>{gsc.clicks.toLocaleString()}</div><div style={{ fontSize: 10, color: '#999' }}>CLICKS · {gsc.ctr}% CTR</div></div>
            </div>
          </div>
          {gsc.topQueries?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {gsc.topQueries.slice(0, 6).map(q => (
                <span key={q.query} style={{ fontSize: 11.5, color: '#555', background: '#F7F8FA', border: '1px solid #E2E5EA', borderRadius: 12, padding: '3px 10px' }}>
                  {q.query} <strong style={{ color: '#111' }}>{q.impressions.toLocaleString()}</strong>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Traffic (GA4) */}
      {trafficOn && (
        <div style={BLUE_CARD}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>Traffic - last {ga4.days} days <span style={{ fontSize: 11, fontWeight: 400, color: '#888' }}>· via GA4 {ga4.propertyName ? `· ${ga4.propertyName}` : ''}</span></div>
            <div style={{ display: 'flex', gap: 18 }}>
              <div style={{ textAlign: 'right' }}><div style={{ fontSize: 20, fontWeight: 800, color: '#111' }}>{ga4.totalSessions.toLocaleString()}</div><div style={{ fontSize: 10, color: '#999' }}>SESSIONS</div></div>
              <div style={{ textAlign: 'right' }}><div style={{ fontSize: 20, fontWeight: 800, color: '#111' }}>{ga4.totalUsers.toLocaleString()}</div><div style={{ fontSize: 10, color: '#999' }}>USERS</div></div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(ga4.byChannel || []).slice(0, 6).map(c => (
              <span key={c.channel} style={{ fontSize: 11.5, color: '#555', background: '#F7F8FA', border: '1px solid #E2E5EA', borderRadius: 12, padding: '3px 10px' }}>
                {c.channel} <strong style={{ color: '#111' }}>{c.sessions.toLocaleString()}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Lead metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 12 }}>
        {[
          { label: 'Leads', value: leadCount.toLocaleString(), color: '#111' },
          { label: 'SQLs', value: sqlCount.toLocaleString(), color: '#111' },
          { label: 'Lead → SQL', value: `${conv}%`, color: parseFloat(conv) < 10 ? '#EF4444' : '#059669' },
        ].map(m => (
          <div key={m.label} style={{ background: '#fff', border: '1px solid #E2E5EA', borderRadius: 10, padding: '13px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Funnel */}
      <div style={CARD}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 10 }}>Acquisition funnel - Impressions → Traffic → Lead → MQL → SQL</div>
        {funnelBar('Impressions', impressionsVal, '100%', !imprOn)}
        {funnelBar('Traffic', trafficVal, '84%', !trafficOn)}
        <FunnelChart funnelStages={stages} biggestLeak={funnel.biggestLeak} stageContacts={funnel.stageContacts} />
      </div>

      {Object.keys(timings).length > 0 && (
        <div style={CARD}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 10 }}>Time between marketing stages</div>
          <StageTimingTable stageTimes={timings} />
        </div>
      )}
    </div>
  );
}
