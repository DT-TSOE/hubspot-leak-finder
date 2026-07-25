import '../animations.css';

const SVG_FUNNEL = ({ variant }) => (
  <svg
    viewBox="0 0 100 98"
    className={`pc-funnel ${variant === 'three-dots' ? 'pc-td-funnel sz-xs' : variant === 'micro' ? 'pc-micro' : `pc-${variant}`}`}
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <polygon className="l1" points="6,2 94,2 82,20 18,20" />
    <polygon className="l2" points="18,23 82,23 72,39 28,39" />
    <polygon className="l3" points="28,42 72,42 63,57 37,57" />
    <polygon className="l4" points="37,60 63,60 56,74 44,74" />
    {variant !== 'three-dots' && <circle className="dot" cx="50" cy="87" r="7" />}
  </svg>
);

export default function FunnelLoader({ variant = 'seq', size = 'md', label }) {
  const sizeClass = `sz-${size}`;

  if (variant === 'three-dots') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <span className={`pc-three-dots`}>
          <SVG_FUNNEL variant="three-dots" />
          <span className="pc-td" />
          <span className="pc-td" />
          <span className="pc-td" />
        </span>
        {label && <p style={{ margin: 0, fontSize: 13, color: '#6B7280', letterSpacing: '.01em' }}>{label}</p>}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '32px 0' }}>
      <svg
        viewBox="0 0 100 98"
        className={`pc-funnel pc-${variant} ${sizeClass}`}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <polygon className="l1" points="6,2 94,2 82,20 18,20" />
        <polygon className="l2" points="18,23 82,23 72,39 28,39" />
        <polygon className="l3" points="28,42 72,42 63,57 37,57" />
        <polygon className="l4" points="37,60 63,60 56,74 44,74" />
        <circle className="dot" cx="50" cy="87" r="7" />
      </svg>
      {label && <p style={{ margin: 0, fontSize: 13, color: '#6B7280', letterSpacing: '.01em' }}>{label}</p>}
    </div>
  );
}
