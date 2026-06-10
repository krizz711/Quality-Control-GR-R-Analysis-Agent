/* Arad UI Kit — shared library: icons, primitives, helpers.
   Enhanced with micro-interactions: press states, count-up + flash, hover lift. */

const { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } = React;

/* ─────────────────────────  ICON (Lucide)  ───────────────────────── */
function Icon({ name, size = 18, strokeWidth = 2, color = 'currentColor', style = {} }) {
  const node = window.lucide && window.lucide.icons && window.lucide.icons[name];
  if (!node) return React.createElement('span', { style: { width: size, height: size, display: 'inline-block' } });
  const children = node[2] || [];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
         strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
         style={{ display: 'block', flex: 'none', ...style }}>
      {children.map((c, i) => React.createElement(c[0], { key: i, ...c[1] }))}
    </svg>
  );
}

/* ─────────────────────────  HELPERS  ───────────────────────── */
const prefersReduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* count-up that returns {val, done}; restarts whenever any dep changes */
function useCountUp(target, deps = [], duration = 800) {
  const [val, setVal] = useState(target);
  const [done, setDone] = useState(true);
  useEffect(() => {
    const num = parseFloat(target);
    if (isNaN(num)) { setVal(target); setDone(true); return; }
    if (document.visibilityState !== 'visible' || prefersReduced()) { setVal(num); setDone(true); return; }
    let raf, start;
    setDone(false);
    const step = (t) => {
      if (!start) { start = t; setVal(0); }
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(num * eased);
      if (p < 1) raf = requestAnimationFrame(step);
      else { setVal(num); setDone(true); }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, deps); // eslint-disable-line
  return { val, done };
}

function fmt(n, decimals = 0) {
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/* fires `fn` once the element scrolls into view (for chart draw-ins etc.) */
function useInView(opts = {}) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!ref.current || seen) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.2, ...opts });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [seen]); // eslint-disable-line
  return [ref, seen];
}

/* staggered reveal wrapper */
function Reveal({ children, delay = 0, sm = false, as = 'div', style = {}, className = '', ...rest }) {
  const cls = (sm ? 'arad-reveal-sm ' : 'arad-reveal ') + className;
  return React.createElement(as, { className: cls.trim(), style: { '--d': delay + 'ms', ...style }, ...rest }, children);
}

/* ─────────────────────────  PRIMITIVES  ───────────────────────── */
function Button({ children, variant = 'primary', size = 'md', icon = null, disabled = false, loading = false, onClick, style = {}, ...rest }) {
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);
  const base = {
    position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: size === 'sm' ? 13 : 14,
    height: size === 'sm' ? 30 : 38, padding: size === 'sm' ? '0 11px' : '0 16px',
    borderRadius: 'var(--radius-md)', border: '1px solid transparent', overflow: 'hidden',
    cursor: disabled || loading ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
    transition: 'transform 110ms var(--ease-out), box-shadow 150ms ease-out, filter 150ms ease-out, background 150ms ease-out',
    transform: press ? 'translateY(0) scale(.97)' : hover && variant === 'primary' && !disabled ? 'translateY(-1px)' : 'none',
    whiteSpace: 'nowrap', userSelect: 'none',
  };
  const variants = {
    primary: { background: 'linear-gradient(180deg,#3B82F6,#2563EB)', color: '#fff', boxShadow: press ? 'none' : hover && !disabled ? '0 6px 18px -4px rgba(59,130,246,.55)' : '0 1px 2px rgba(0,0,10,.4)', filter: hover && !disabled && !press ? 'brightness(1.1)' : 'none' },
    secondary: { background: 'var(--color-surface-elevated)', border: '1px solid rgba(59,130,246,.4)', color: 'var(--color-primary)', boxShadow: hover && !disabled ? 'var(--glow-primary)' : 'none' },
    destructive: { background: hover && !disabled ? '#991B1B' : '#7F1D1D', color: '#FCA5A5' },
    ghost: { background: hover && !disabled ? 'var(--color-surface-elevated)' : 'transparent', color: 'var(--color-text-secondary)' },
  };
  return (
    <button onClick={disabled || loading ? undefined : onClick} disabled={disabled || loading}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)} onMouseUp={() => setPress(false)}
      style={{ ...base, ...variants[variant], ...style }} {...rest}>
      {loading && <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.22), transparent)', backgroundSize: '50% 100%', animation: 'arad-runbar 1.4s linear infinite' }} />}
      <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8 }}>{loading ? <LoadingDots /> : icon}{children}</span>
    </button>
  );
}

function LoadingDots({ color = '#fff' }) {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
      {[0, 1, 2].map(i => <span key={i} style={{ width: 4, height: 4, borderRadius: 999, background: color, animation: `arad-typing 1.1s ${i * 0.15}s infinite` }} />)}
    </span>
  );
}

function Badge({ children, tone = 'info', variant = 'solid', style = {}, pop = false }) {
  const tones = {
    pass: ['var(--color-pass-bg)', 'var(--color-pass-text)'], conditional: ['var(--color-cond-bg)', 'var(--color-cond-text)'],
    fail: ['var(--color-fail-bg)', 'var(--color-fail-text)'], critical: ['var(--color-fail-bg)', 'var(--color-fail-text)'],
    info: ['var(--color-info-bg)', 'var(--color-info-text)'], purple: ['var(--color-purple-bg)', 'var(--color-purple-text)'],
    success: ['var(--color-pass-bg)', 'var(--color-pass-text)'],
    neutral: ['var(--color-surface-elevated)', 'var(--color-text-secondary)'],
  };
  const [bg, fg] = tones[tone] || tones.info;
  const skin = variant === 'outline' ? { background: 'transparent', color: fg, border: `1px solid ${fg}` } : { background: bg, color: fg, border: '1px solid transparent' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', lineHeight: 1, padding: '4px 8px', borderRadius: 'var(--radius-sm)', whiteSpace: 'nowrap', animation: pop ? 'arad-badge-pop .4s var(--ease-out) both' : 'none', ...skin, ...style }}>
      {children}
    </span>
  );
}

function Card({ children, interactive = false, accent = null, elevated = false, padding = 24, style = {}, ...rest }) {
  const [hover, setHover] = useState(false);
  const accentColors = { ai: 'var(--color-secondary)', info: 'var(--color-primary)', pass: 'var(--color-success)', conditional: 'var(--color-warning)', fail: 'var(--color-critical)', critical: 'var(--color-critical)' };
  return (
    <div onMouseEnter={() => interactive && setHover(true)} onMouseLeave={() => interactive && setHover(false)}
      style={{ background: elevated ? 'var(--color-surface-elevated)' : 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderLeft: accent ? `3px solid ${accentColors[accent] || accent}` : '1px solid var(--color-border)',
        borderColor: hover ? 'rgba(59,130,246,.4)' : undefined,
        borderRadius: 'var(--radius-lg)', padding, boxShadow: hover ? 'var(--glow-primary)' : 'var(--shadow-sm)',
        transform: hover ? 'translateY(-2px)' : 'none',
        transition: 'box-shadow var(--transition), border-color var(--transition), transform var(--transition)', boxSizing: 'border-box', ...style }} {...rest}>
      {children}
    </div>
  );
}

function StatusDot({ tone = 'success', pulse = true, size = 8, label = null, speed = '1.8s', style = {} }) {
  const colors = { success: 'var(--color-success)', warning: 'var(--color-warning)', critical: 'var(--color-critical)', info: 'var(--color-primary)', purple: 'var(--color-secondary)', muted: 'var(--color-text-muted)' };
  const c = colors[tone] || colors.success;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, ...style }}>
      <span style={{ position: 'relative', width: size, height: size, display: 'inline-block' }}>
        {pulse && <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: c, animation: `arad-pulse ${speed} var(--ease-out) infinite` }} />}
        <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: c, boxShadow: `0 0 6px ${c}` }} />
      </span>
      {label && <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>{label}</span>}
    </span>
  );
}

function Sparkline({ data, w = 72, h = 28, color = 'var(--color-primary)', id = 'sp', showDots = false }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data), rng = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - ((v - min) / rng) * h]);
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const gid = 'grad-' + id;
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.28" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill={`url(#${gid})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" />
      {showDots && pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="2" fill={color} style={{ animation: `arad-fade-in .3s ${i * 40}ms both` }} />)}
    </svg>
  );
}

function KPICard({ label, value, unit = '', subtitle = null, subtitleTone = 'muted', spark = null, animateKey, id = 'k', delay = 0 }) {
  const { val, done } = useCountUp(value, [animateKey], 800);
  const [hover, setHover] = useState(false);
  const numeric = !isNaN(parseFloat(value));
  const display = numeric ? fmt(val, String(value).includes('.') ? 1 : 0) : value;
  const toneColors = { success: 'var(--color-success)', warning: 'var(--color-warning)', critical: 'var(--color-critical)', muted: 'var(--color-text-secondary)', info: 'var(--color-primary)' };
  return (
    <div className="arad-kpi-in" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ '--d': delay + 'ms', position: 'relative', background: 'var(--color-surface)',
        border: `1px solid ${hover ? 'rgba(59,130,246,.4)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-lg)', padding: 20,
        boxShadow: hover ? 'var(--glow-primary)' : 'var(--shadow-sm)', transform: hover ? 'scale(1.006)' : 'none',
        transition: 'box-shadow var(--transition), border-color var(--transition), transform var(--transition)', minHeight: 112, boxSizing: 'border-box', overflow: 'hidden' }}>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 12 }}>{label}</div>
      <div key={String(done)} style={{ fontFamily: 'var(--font-mono)', fontSize: 30, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1, letterSpacing: '-.01em', animation: done && numeric && !prefersReduced() ? 'arad-flash-text .55s ease-out' : 'none' }}>
        {display}<span style={{ fontSize: 16, color: 'var(--color-text-secondary)', marginLeft: 2 }}>{unit}</span>
      </div>
      {subtitle && <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: toneColors[subtitleTone], marginTop: 10, paddingRight: spark ? 80 : 0 }}>{subtitle}</div>}
      {spark && <div style={{ position: 'absolute', right: 16, bottom: 16 }}><Sparkline data={spark} id={id} showDots={hover} /></div>}
    </div>
  );
}

function MetricPill({ value, label, tone = 'default', delay = null }) {
  const toneColors = { default: 'var(--color-text)', success: 'var(--color-success)', warning: 'var(--color-warning)', critical: 'var(--color-critical)', info: 'var(--color-primary)' };
  return (
    <div className={delay != null ? 'arad-reveal-sm' : ''} style={{ '--d': (delay || 0) + 'ms', flex: 1, minWidth: 96, background: 'var(--color-surface-inset)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '12px 14px', boxSizing: 'border-box' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600, color: toneColors[tone], lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginTop: 6 }}>{label}</div>
    </div>
  );
}

/* SegmentedBar with grow-in animation; each segment grows after the previous */
function SegmentedBar({ segments, height = 28, showLabels = true, animate = false }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const palette = ['var(--color-primary)', 'var(--color-secondary)', 'var(--color-success)', 'var(--color-warning)'];
  const [grown, setGrown] = useState(!animate);
  useEffect(() => { if (animate) { const t = setTimeout(() => setGrown(true), 60); return () => clearTimeout(t); } }, [animate]);
  let acc = 0;
  return (
    <div>
      <div style={{ display: 'flex', height, borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
        {segments.map((s, i) => {
          const pct = (s.value / total) * 100; const myDelay = acc; acc += i === 0 ? 0 : 1;
          return (
            <div key={i} style={{ width: grown ? `${pct}%` : '0%', background: s.color || palette[i % palette.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.92)', overflow: 'hidden', whiteSpace: 'nowrap', transition: `width ${i === 0 ? 420 : 320}ms var(--ease-out)`, transitionDelay: `${i * 120}ms` }}>{pct > 10 ? `${s.value}%` : ''}</div>
          );
        })}
      </div>
      {showLabels && <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
        {segments.map((s, i) => <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--color-text-secondary)' }}><span style={{ width: 8, height: 8, borderRadius: 2, background: s.color || palette[i % palette.length] }} />{s.label} <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}>{s.value}%</span></span>)}
      </div>}
    </div>
  );
}

function ProgressBar({ value, max = 100, tone = 'info', label = null, valueLabel = null, height = 6 }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const colors = { info: 'var(--color-primary)', success: 'var(--color-success)', warning: 'var(--color-warning)', critical: 'var(--color-critical)', ai: 'var(--color-secondary)' };
  const c = colors[tone];
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(pct), 80); return () => clearTimeout(t); }, [pct]);
  return (
    <div>
      {(label || valueLabel) && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        {label && <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--color-text-secondary)' }}>{label}</span>}
        {valueLabel && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text)' }}>{valueLabel}</span>}
      </div>}
      <div style={{ height, background: 'var(--color-surface-inset)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: `${w}%`, height: '100%', borderRadius: 999, background: c, boxShadow: `0 0 8px ${c}`, transition: 'width 700ms var(--ease-out)' }} />
      </div>
    </div>
  );
}

function Input({ label, error, hint, mono = false, value, onChange, placeholder, type = 'text', style = {}, ...rest }) {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? 'var(--color-critical)' : focused ? 'var(--color-primary)' : 'var(--color-border)';
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {label && <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>{label}</span>}
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ height: 40, padding: '0 12px', background: 'var(--color-surface-inset)', border: `1px solid ${borderColor}`, borderRadius: 'var(--radius-md)', color: 'var(--color-text)', fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)', fontSize: 14, outline: 'none', boxShadow: focused && !error ? 'var(--ring-focus)' : 'none', transition: 'all var(--transition)', width: '100%', boxSizing: 'border-box' }} {...rest} />
      {error ? <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--color-fail-text)' }}>{error}</span>
        : hint ? <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--color-text-muted)' }}>{hint}</span> : null}
    </label>
  );
}

Object.assign(window, { Icon, prefersReduced, useCountUp, fmt, useInView, Reveal, Button, LoadingDots, Badge, Card, StatusDot, Sparkline, KPICard, MetricPill, SegmentedBar, ProgressBar, Input });

/* tiny event bus so the demo launcher can drive any screen imperatively */
const AradBus = { l: {}, on(e, f) { (this.l[e] = this.l[e] || []).push(f); return () => { this.l[e] = this.l[e].filter(x => x !== f); }; }, emit(e, d) { (this.l[e] || []).forEach(f => f(d)); } };
window.AradBus = AradBus;
