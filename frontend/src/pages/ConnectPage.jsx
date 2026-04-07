import React from 'react';

export default function ConnectPage({ onConnect }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-background-tertiary)',
      padding: '2rem',
    }}>
      <div style={{
        maxWidth: 440,
        width: '100%',
        background: 'var(--color-background-primary)',
        borderRadius: 16,
        border: '1px solid var(--color-border-tertiary)',
        padding: '2.5rem',
        textAlign: 'center',
      }}>
        {/* Logo / Icon */}
        <div style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: 'linear-gradient(135deg, #4F6CF7, #7C5CFC)',
          margin: '0 auto 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
        }}>
          📊
        </div>

        <h1 style={{
          margin: '0 0 0.5rem',
          fontSize: 24,
          fontWeight: 600,
          color: 'var(--color-text-primary)',
        }}>
          Lifecycle Leak Finder
        </h1>
        <p style={{
          margin: '0 0 2rem',
          fontSize: 15,
          color: 'var(--color-text-secondary)',
          lineHeight: 1.6,
        }}>
          Connect your HubSpot account to instantly discover where leads drop off,
          why they're lost, and what to fix.
        </p>

        {/* Feature pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: '2rem' }}>
          {['Funnel leak detection', 'Behavioral insights', 'Actionable fixes', 'Works in seconds'].map(f => (
            <span key={f} style={{
              fontSize: 12,
              padding: '4px 12px',
              borderRadius: 20,
              background: 'var(--color-background-secondary)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border-tertiary)',
            }}>{f}</span>
          ))}
        </div>

        <a
          href="http://localhost:3001/auth/connect"
          style={{
            display: 'block',
            background: '#FF7A59',
            color: '#fff',
            padding: '14px 28px',
            borderRadius: 10,
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: 15,
            marginBottom: '1rem',
            transition: 'opacity 0.15s',
          }}
          onMouseOver={e => e.target.style.opacity = '0.9'}
          onMouseOut={e => e.target.style.opacity = '1'}
        >
          Connect HubSpot
        </a>
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>
          Read-only access. No data is stored permanently.
        </p>
      </div>
    </div>
  );
}
