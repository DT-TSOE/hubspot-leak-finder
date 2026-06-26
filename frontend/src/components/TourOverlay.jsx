import React, { useState, useEffect } from 'react';

const TOUR_KEY = 'pipechamp_tour_v1';

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to PipeChamp',
    body: "You've connected HubSpot — we've already scanned your pipeline. Here's a quick look at what you've got and where to find everything.",
    cta: "Let's go",
    icon: null,
    mascot: true,
  },
  {
    id: 'dashboard',
    title: 'Your Pipeline Health Score',
    body: 'The Dashboard gives you a single number — 0 to 100 — that tells you how healthy your pipeline is. Green means you\'re in good shape. Red means there\'s work to do. Check this weekly.',
    cta: 'Got it',
    highlight: 'left sidebar → Dashboard',
    icon: '▦',
  },
  {
    id: 'analyze',
    title: 'Dig Into the Details',
    body: 'Under Analyze, you\'ll find Pipeline (where leads drop off), At Risk (deals going cold), Lead Sources (which channels actually close), Lead Response, and Revenue.',
    cta: 'Nice',
    highlight: 'left sidebar → Analyze',
    icon: '📊',
  },
  {
    id: 'pipecoach',
    title: 'Ask PipeCoach Anything',
    body: "PipeCoach already knows your pipeline data. Ask it why you're losing deals, which leads to focus on, or what to do about any metric. It'll give you step-by-step HubSpot instructions — not generic advice.",
    cta: "Sounds good",
    highlight: 'left sidebar → Ask PipeCoach',
    icon: '🤼',
  },
  {
    id: 'done',
    title: "You're all set",
    body: "Your pipeline health score is on the Dashboard. Start there, then dig into whichever section catches your eye. PipeCoach is always one click away if you need guidance.",
    cta: 'Take me to my Dashboard',
    icon: '✓',
    final: true,
  },
];

export default function TourOverlay({ onComplete }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(TOUR_KEY)) {
      // Small delay so the dashboard data has a moment to load first
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(TOUR_KEY, '1');
    setVisible(false);
    onComplete?.();
  };

  const advance = () => {
    if (STEPS[step].final) { dismiss(); return; }
    setAnimating(true);
    setTimeout(() => {
      setStep(s => s + 1);
      setAnimating(false);
    }, 180);
  };

  if (!visible) return null;

  const current = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <>
      <style>{`
        @keyframes tourFadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes tourBgIn { from { opacity: 0; } to { opacity: 1; } }
        .tour-card { animation: tourFadeIn 0.25s ease; }
        .tour-bg { animation: tourBgIn 0.2s ease; }
      `}</style>

      {/* Backdrop */}
      <div className="tour-bg" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>

        {/* Card */}
        <div className="tour-card" key={step} style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 480, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden', opacity: animating ? 0 : 1, transition: 'opacity 0.18s ease' }}>

          {/* Progress bar */}
          <div style={{ height: 3, background: '#F3F4F6' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #43A047, #66BB6A)', transition: 'width 0.3s ease', borderRadius: 2 }} />
          </div>

          {/* Mascot / icon header */}
          {current.mascot ? (
            <div style={{ background: 'linear-gradient(135deg, #0F1A0F, #1a2d1a)', padding: '32px 32px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ width: 72, height: 72, borderRadius: 16, overflow: 'hidden', border: '3px solid #4CAF50', flexShrink: 0, background: '#0F1A0F' }}>
                <img src="/el-pipeador.png" alt="PipeChamp" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
                  onError={e => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<span style="font-size:36px;display:flex;align-items:center;justify-content:center;height:100%">🤼</span>'; }} />
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#4CAF50', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>PipeChamp · Pipeline Hunter</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px', lineHeight: 1.2 }}>{current.title}</div>
              </div>
            </div>
          ) : (
            <div style={{ background: '#F7F8FA', padding: '24px 32px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fff', border: '1px solid #E2E5EA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                {current.icon}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#111', letterSpacing: '-0.3px' }}>{current.title}</div>
            </div>
          )}

          {/* Body */}
          <div style={{ padding: '20px 32px 8px' }}>
            <p style={{ fontSize: 14, color: '#444', lineHeight: 1.7, margin: 0 }}>{current.body}</p>

            {current.highlight && (
              <div style={{ marginTop: 16, background: '#F0FBF0', border: '1px solid #C8E6C9', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12 }}>👈</span>
                <span style={{ fontSize: 12, color: '#2E7D32', fontWeight: 600 }}>{current.highlight}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '16px 32px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Step dots */}
            <div style={{ display: 'flex', gap: 6 }}>
              {STEPS.map((_, i) => (
                <div key={i} style={{ width: i === step ? 18 : 6, height: 6, borderRadius: 3, background: i === step ? '#43A047' : i < step ? '#A5D6A7' : '#E2E5EA', transition: 'all 0.25s ease' }} />
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {!current.final && (
                <button onClick={dismiss} style={{ fontSize: 12, color: '#aaa', background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px 12px' }}>
                  Skip tour
                </button>
              )}
              <button onClick={advance}
                style={{ padding: '10px 24px', borderRadius: 9, border: 'none', background: current.final ? '#111' : '#43A047', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: '-0.1px' }}>
                {current.cta}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function resetTour() {
  localStorage.removeItem(TOUR_KEY);
}
