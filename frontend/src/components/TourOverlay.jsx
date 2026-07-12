import React, { useState, useEffect, useRef } from 'react';

const TOUR_KEY = 'pipechamp_tour_v2';

const STEPS = [
  {
    id: 'welcome',
    target: null,
    character: '/el-pipeador-headshot.png',
    characterFallback: '🤼',
    title: 'Welcome to PipeChamp',
    body: "We've already scanned your HubSpot pipeline. Here's a quick look at where everything lives - takes about 30 seconds.",
    cta: "Let's go",
  },
  {
    id: 'dashboard',
    target: '[data-tour="nav-dashboard"]',
    character: '/el-pipeador-headshot.png',
    characterFallback: '🤼',
    title: 'Your Scorecard',
    body: 'Your command center. Your pipeline grade, revenue opportunity, what your best deals look like, and exactly what to do next - all in one view. Check it weekly.',
    cta: 'Got it',
    tooltipSide: 'right',
  },
  {
    id: 'analyze',
    target: '[data-tour="nav-analyze"]',
    character: '/el-pipeador-headshot.png',
    characterFallback: '🤼',
    title: 'Dig Deeper',
    body: 'Growth Funnel, At Risk, Lead Sources, Lead Response, Revenue. Click any section to see the full picture behind your numbers.',
    cta: 'Makes sense',
    tooltipSide: 'right',
  },
  {
    id: 'at-risk',
    target: '[data-tour="nav-at-risk"]',
    character: '/rojo-headshot.png',
    characterFallback: '🔴',
    title: 'Watch for Rojo',
    body: 'Whenever you see the red luchador, something needs attention. At Risk shows contacts and deals going cold - with the revenue on the line.',
    cta: 'On it',
    tooltipSide: 'right',
  },
  {
    id: 'pipecoach',
    target: '[data-tour="nav-ask-coach"]',
    character: '/pipecoach.png',
    characterFallback: 'PC',
    title: 'Ask PipeCoach Anything',
    body: 'PipeCoach already knows your pipeline data. Ask why you\'re losing deals, which leads to call, or what any metric means. She gives you step-by-step HubSpot instructions - not generic advice.',
    cta: 'Love it',
    tooltipSide: 'right',
  },
  {
    id: 'done',
    target: null,
    character: '/el-pipeador-headshot.png',
    characterFallback: '🏆',
    title: "You're all set",
    body: "Start with the Scorecard. Everything links to where you need to go next. PipeCoach is always one click away if you get stuck.",
    cta: 'Take me to my Scorecard',
    final: true,
  },
];

const PAD = 10;

export default function TourOverlay({ onComplete }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [rect, setRect] = useState(null);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(TOUR_KEY)) {
      const t = setTimeout(() => setVisible(true), 900);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    const current = STEPS[step];
    if (!current.target) { setRect(null); return; }

    const measure = () => {
      const el = document.querySelector(current.target);
      if (el) setRect(el.getBoundingClientRect());
      else setRect(null);
    };

    measure();
    const t = setTimeout(measure, 100);
    return () => clearTimeout(t);
  }, [step, visible]);

  const dismiss = () => {
    localStorage.setItem(TOUR_KEY, '1');
    setVisible(false);
    onComplete?.();
  };

  const advance = () => {
    if (STEPS[step].final) { dismiss(); return; }
    setTransitioning(true);
    setTimeout(() => {
      setStep(s => s + 1);
      setTransitioning(false);
    }, 150);
  };

  if (!visible) return null;

  const current = STEPS[step];
  const progress = (step + 1) / STEPS.length;
  const hasSpotlight = !!rect;

  // Tooltip position: to the right of spotlight, vertically centered on it
  const tooltipLeft = hasSpotlight ? rect.right + 20 : '50%';
  const tooltipTop = hasSpotlight ? Math.max(16, rect.top + rect.height / 2 - 160) : '50%';
  const tooltipTransform = hasSpotlight ? 'none' : 'translate(-50%, -50%)';

  return (
    <>
      <style>{`
        @keyframes tourFadeIn { from { opacity:0; transform:scale(.97); } to { opacity:1; transform:scale(1); } }
        @keyframes spotFade  { from { opacity:0; } to { opacity:1; } }
      `}</style>

      {/* Backdrop - full dark overlay with spotlight cutout */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 3000, pointerEvents: 'none' }}>
        {hasSpotlight ? (
          <>
            {/* Four dark panels around the spotlight */}
            <div style={{ position:'absolute', top:0, left:0, right:0, height: rect.top - PAD, background:'rgba(0,0,0,0.65)', animation:'spotFade .25s ease' }} />
            <div style={{ position:'absolute', top: rect.bottom + PAD, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.65)', animation:'spotFade .25s ease' }} />
            <div style={{ position:'absolute', top: rect.top - PAD, left:0, width: rect.left - PAD, height: rect.height + PAD*2, background:'rgba(0,0,0,0.65)', animation:'spotFade .25s ease' }} />
            <div style={{ position:'absolute', top: rect.top - PAD, left: rect.right + PAD, right:0, height: rect.height + PAD*2, background:'rgba(0,0,0,0.65)', animation:'spotFade .25s ease' }} />
            {/* Highlight ring around target */}
            <div style={{ position:'absolute', top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD*2, height: rect.height + PAD*2, borderRadius:10, border:'2px solid rgba(255,255,255,0.6)', boxShadow:'0 0 0 3px rgba(67,160,71,0.5), 0 0 20px rgba(67,160,71,0.3)', pointerEvents:'none', animation:'spotFade .25s ease' }} />
          </>
        ) : (
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.6)' }} />
        )}
      </div>

      {/* Click-away to dismiss */}
      <div style={{ position:'fixed', inset:0, zIndex:3001 }} onClick={dismiss} />

      {/* Tooltip card */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed',
          left: tooltipLeft,
          top: tooltipTop,
          transform: tooltipTransform,
          width: 300,
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          zIndex: 3002,
          opacity: transitioning ? 0 : 1,
          transition: 'opacity 0.15s ease',
          animation: 'tourFadeIn 0.25s ease',
        }}
      >
        {/* Progress bar */}
        <div style={{ height:3, background:'#F3F4F6' }}>
          <div style={{ height:'100%', width:`${progress * 100}%`, background:'linear-gradient(90deg,#43A047,#66BB6A)', transition:'width .3s ease' }} />
        </div>

        {/* Character + title */}
        <div style={{ padding:'18px 18px 12px', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:44, height:44, borderRadius:11, overflow:'hidden', border:'2px solid #E2E5EA', flexShrink:0 }}>
            <img src={current.character} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top center' }}
              onError={e => { e.target.style.display='none'; e.target.parentElement.style.display='flex'; e.target.parentElement.style.alignItems='center'; e.target.parentElement.style.justifyContent='center'; e.target.parentElement.style.fontSize='20px'; e.target.parentElement.innerHTML=current.characterFallback; }} />
          </div>
          <div style={{ fontSize:15, fontWeight:700, color:'#111', letterSpacing:'-0.2px', lineHeight:1.25 }}>{current.title}</div>
        </div>

        {/* Body */}
        <div style={{ padding:'0 18px 16px', fontSize:13, color:'#555', lineHeight:1.65 }}>{current.body}</div>

        {/* Footer */}
        <div style={{ padding:'12px 18px 18px', borderTop:'1px solid #F3F4F6', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', gap:5 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{ width: i === step ? 16 : 5, height:5, borderRadius:3, background: i === step ? '#43A047' : i < step ? '#A5D6A7' : '#E2E5EA', transition:'all .25s ease' }} />
            ))}
          </div>
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            {!current.final && (
              <button onClick={dismiss} style={{ fontSize:12, color:'#bbb', background:'none', border:'none', cursor:'pointer', padding:'6px 8px' }}>Skip</button>
            )}
            <button onClick={advance}
              style={{ padding:'8px 18px', borderRadius:8, border:'none', background: current.final ? '#111' : '#43A047', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>
              {current.cta}
            </button>
          </div>
        </div>
      </div>

      {/* Arrow pointing to spotlight (only when there's a target) */}
      {hasSpotlight && (
        <div style={{
          position: 'fixed',
          left: rect.right + 8,
          top: rect.top + rect.height / 2 - 8,
          width: 0, height: 0,
          borderTop: '8px solid transparent',
          borderBottom: '8px solid transparent',
          borderRight: '10px solid #fff',
          zIndex: 3002,
          filter: 'drop-shadow(-2px 0 4px rgba(0,0,0,0.15))',
        }} />
      )}
    </>
  );
}

export function resetTour() {
  localStorage.removeItem(TOUR_KEY);
}
