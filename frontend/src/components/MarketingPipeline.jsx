import React, { useState, useEffect, useCallback } from 'react';
import FunnelChart from './FunnelChart';
import StageTimingTable from './StageTimingTable';
import { api } from '../utils/api';
import FunnelLoader from './FunnelLoader';

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

  if (!funnelData?.funnel) return <FunnelLoader variant="seq" size="md" label="Loading marketing funnel…" />;
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

  const funnelBar = (label, val, pctWidth, locked, ctaLabel) => (
    <div key={label} style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: locked ? '#999' : '#111', filter: locked ? 'blur(2px)' : 'none' }}>{label}</span>
        <span style={{ fontSize: 12, color: locked ? '#bbb' : '#888', filter: locked ? 'blur(2.5px)' : 'none' }}>{val}</span>
      </div>
      <div style={{ position: 'relative', height: 28, borderRadius: 6, background: '#F3F4F6', overflow: 'hidden', cursor: locked ? 'pointer' : 'default' }}
        onClick={locked ? () => onNavigate?.('integrations') : undefined}>
        {!locked && <div style={{ height: '100%', width: pctWidth, borderRadius: 6, background: '#BFD4FF' }} />}
        {locked && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(247,248,250,.6)' }}>
            <button onClick={e => { e.stopPropagation(); onNavigate?.('integrations'); }}
              style={{ background: '#111', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.18)' }}>
              {ctaLabel} →
            </button>
          </div>
        )}
      </div>
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
      {/* Honest note: this account doesn't tag lifecycle stages */}
      {funnel.lifecycleMaintained === false && (
        <div style={{ background: '#F7F8FA', border: '1px solid #E2E5EA', borderRadius: 10, padding: '12px 14px', marginBottom: 12, fontSize: 12.5, color: '#555', lineHeight: 1.55 }}>
          <strong style={{ color: '#111' }}>This account doesn't tag HubSpot lifecycle stages,</strong> so the Lead → MQL → SQL funnel below will look sparse. That's a data-tagging gap, not a real marketing problem. Your deal-based metrics (win rate, revenue, deal-stage conversion) are the reliable view.
        </div>
      )}

      {/* Connect prompt when neither Google source is connected */}
      {nothingConnected && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          {[
            { label: 'Search Impressions', val: impressionsVal, sub: 'clicks · CTR · top queries', cta: 'Connect Search Console', hint: 'via Google Search Console' },
            { label: 'Website Traffic', val: trafficVal, sub: 'sessions · users · by channel', cta: 'Connect GA4', hint: 'via Google Analytics 4' },
          ].map(s => (
            <div key={s.label} style={{ position: 'relative', background: '#fff', border: '1px solid #E2E5EA', borderRadius: 10, padding: '16px', overflow: 'hidden' }}>
              <div style={{ filter: 'blur(4px)', userSelect: 'none', pointerEvents: 'none' }}>
                <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#111', marginBottom: 2 }}>{s.val}</div>
                <div style={{ fontSize: 11, color: '#aaa' }}>{s.sub}</div>
              </div>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.5)' }}>
                <button onClick={() => onNavigate?.('integrations')}
                  style={{ background: '#111', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.18)' }}>
                  {s.cta} →
                </button>
                <div style={{ fontSize: 10, color: '#999', marginTop: 5 }}>{s.hint}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pickers */}
      {gsc?.connected && gsc.needsSite && (
        <Picker title="Search Console connected — pick your site" subtitle="Which property's impressions should feed the funnel?"
          options={sites?.map(s => ({ value: s.siteUrl, label: s.siteUrl }))} onPick={selectSite} placeholder="Select a site…" />
      )}
      {ga4?.connected && ga4.needsProperty && (
        <Picker title="Google Analytics connected — pick your property" subtitle="Which GA4 property should feed traffic?"
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
          { label: 'Lead → SQL', value: `${conv}%`, color: '#111' },
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
        {funnelBar('Impressions', impressionsVal, '100%', !imprOn, 'Connect Search Console')}
        {funnelBar('Traffic', trafficVal, '84%', !trafficOn, 'Connect GA4')}
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
