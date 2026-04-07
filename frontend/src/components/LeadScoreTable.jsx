import React, { useState } from 'react';

const RISK_STYLES = {
  high:   { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA', label: 'High Risk' },
  medium: { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A', label: 'Medium Risk' },
  low:    { bg: '#F0FDF4', text: '#059669', border: '#BBF7D0', label: 'Low Risk' },
};

export default function LeadScoreTable({ leads }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  if (!leads?.length) {
    return <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>No active leads to score.</p>;
  }

  const filtered = leads.filter(l => {
    if (filter !== 'all' && l.risk !== filter) return false;
    if (search && !l.name.toLowerCase().includes(search.toLowerCase()) && !l.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = { high: leads.filter(l => l.risk === 'high').length, medium: leads.filter(l => l.risk === 'medium').length, low: leads.filter(l => l.risk === 'low').length };

  return (
    <div>
      {/* Summary pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {['all', 'high', 'medium', 'low'].map(f => {
          const style = f === 'all' ? null : RISK_STYLES[f];
          const count = f === 'all' ? leads.length : counts[f];
          return (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '5px 14px', borderRadius: 20, border: `1px solid ${filter === f ? (style?.border || 'var(--color-border-primary)') : 'var(--color-border-tertiary)'}`,
              background: filter === f ? (style?.bg || 'var(--color-background-secondary)') : 'transparent',
              color: filter === f ? (style?.text || 'var(--color-text-primary)') : 'var(--color-text-secondary)',
              fontSize: 12, fontWeight: 500, cursor: 'pointer',
            }}>
              {f === 'all' ? `All (${count})` : `${RISK_STYLES[f].label} (${count})`}
            </button>
          );
        })}
        <input
          type="text" placeholder="Search name or email…" value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginLeft: 'auto', padding: '5px 12px', borderRadius: 8, border: '1px solid var(--color-border-tertiary)', fontSize: 12, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', width: 200 }}
        />
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border-tertiary)' }}>
              {['Contact', 'Stage', 'Risk Score', 'Days in Stage', 'Touches', 'Risk Flags'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 50).map(lead => {
              const sty = RISK_STYLES[lead.risk];
              return (
                <tr key={lead.id} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                  <td style={{ padding: '10px 10px' }}>
                    <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{lead.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{lead.email}</div>
                  </td>
                  <td style={{ padding: '10px 10px', color: 'var(--color-text-secondary)' }}>{lead.stage}</td>
                  <td style={{ padding: '10px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: sty.bg, border: `2px solid ${sty.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: sty.text }}>{lead.score}</div>
                      <span style={{ fontSize: 11, color: sty.text, fontWeight: 500 }}>{sty.label}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 10px', color: lead.daysInStage > 30 ? '#DC2626' : 'var(--color-text-secondary)' }}>{lead.daysInStage}d</td>
                  <td style={{ padding: '10px 10px', color: lead.touches === 0 ? '#DC2626' : 'var(--color-text-secondary)' }}>{lead.touches}</td>
                  <td style={{ padding: '10px 10px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {lead.flags.map((f, i) => (
                        <span key={i} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: sty.bg, color: sty.text, border: `1px solid ${sty.border}` }}>{f}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length > 50 && (
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', textAlign: 'center', marginTop: 10 }}>
            Showing 50 of {filtered.length} leads. Export CSV to see all.
          </p>
        )}
      </div>
    </div>
  );
}
