/* Arad UI Kit — charts: SPC control chart (draw-in, hover, live update), donut gauge, mini bars. */

function SPCChart({ data, ucl, cl, lcl, height = 280, drawKey = 0 }) {
  const W = 820, H = height, padL = 52, padR = 16, padT = 18, padB = 28;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const [ref, seen] = useInView();
  const [hover, setHover] = useState(null);
  const reduce = prefersReduced();
  const vals = data.map(d => d.v);
  const lo = Math.min(lcl, ...vals) - (ucl - lcl) * 0.18;
  const hi = Math.max(ucl, ...vals) + (ucl - lcl) * 0.18;
  const rng = hi - lo || 1;
  const x = i => padL + (i / (data.length - 1)) * plotW;
  const y = v => padT + (1 - (v - lo) / rng) * plotH;
  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d.v).toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${x(data.length - 1).toFixed(1)},${(padT + plotH).toFixed(1)} L${padL},${(padT + plotH).toFixed(1)} Z`;
  const DRAW = 600, active = seen && !reduce;
  const lastIdx = data.length - 1;

  const limitLine = (val, color, labelTxt, delay) => (
    <g style={{ animation: active ? `arad-fade-in .3s ${delay}ms both` : 'none', opacity: active ? undefined : 1 }}>
      <line x1={padL} y1={y(val)} x2={W - padR} y2={y(val)} stroke={color} strokeWidth="1" strokeDasharray="5 4" opacity="0.7" />
      <text x={W - padR} y={y(val) - 4} textAnchor="end" fontFamily="var(--font-mono)" fontSize="10" fill={color} opacity="0.9">{labelTxt} {val.toFixed(3)}</text>
    </g>
  );

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
        <style>{`
          @keyframes arad-spc-draw { to { stroke-dashoffset: 0 } }
          @keyframes arad-pt-pop { 0%{transform:scale(0)} 70%{transform:scale(1.25)} 100%{transform:scale(1)} }
        `}</style>
        <defs>
          <linearGradient id="spcFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.16" /><stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[lo, lo + rng * 0.25, lo + rng * 0.5, lo + rng * 0.75, hi].map((v, i) => (
          <text key={i} x={padL - 8} y={y(v) + 3} textAnchor="end" fontFamily="var(--font-mono)" fontSize="10" fill="var(--color-text-muted)">{v.toFixed(2)}</text>
        ))}
        {limitLine(ucl, '#EF4444', 'UCL', DRAW + 200)}
        {limitLine(cl, '#3B82F6', 'CL', DRAW + 200)}
        {limitLine(lcl, '#EF4444', 'LCL', DRAW + 200)}
        {/* area */}
        <path d={areaPath} fill="url(#spcFill)" style={{ opacity: active ? 0 : 1, animation: active ? `arad-fade-in .3s ${DRAW}ms forwards` : 'none' }} />
        {/* line: draws via dashoffset, re-keyed on drawKey for live updates */}
        <path key={drawKey} d={linePath} fill="none" stroke="#F1F5F9" strokeWidth="1.5" pathLength="1"
          style={active ? { strokeDasharray: 1, strokeDashoffset: 1, animation: `arad-spc-draw ${drawKey ? 420 : DRAW}ms var(--ease-out) forwards` } : {}} />
        {/* points */}
        {data.map((d, i) => {
          const ptDelay = active ? (drawKey ? 0 : (i / lastIdx) * DRAW) : 0;
          const isNewest = drawKey > 0 && i === lastIdx;
          const enlarge = hover === i;
          const common = { style: { transformBox: 'fill-box', transformOrigin: 'center', animation: active && !isNewest ? `arad-pt-pop .2s ${ptDelay}ms var(--ease-out) both` : 'none', cursor: 'pointer', transition: 'transform .15s var(--ease-out)', transform: enlarge ? 'scale(1.5)' : 'scale(1)' }, onMouseEnter: () => setHover(i), onMouseLeave: () => setHover(null) };
          if (d.violation) return (
            <g key={i}>
              <circle cx={x(i)} cy={y(d.v)} r="6" fill="none" stroke="#EF4444" strokeWidth="1.5">
                <animate attributeName="r" values="5;13;5" dur="1.6s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0;0.8" dur="1.6s" repeatCount="indefinite" />
              </circle>
              <circle cx={x(i)} cy={y(d.v)} r="3.6" fill="#EF4444" stroke="#0A0B0F" strokeWidth="1" {...common} />
            </g>
          );
          return <circle key={i} cx={x(i)} cy={y(d.v)} r="3" fill={isNewest ? '#3B82F6' : '#94A3B8'} {...common}
            style={{ ...common.style, animation: isNewest ? 'arad-slide-in-x .4s var(--ease-out) both' : common.style.animation }} />;
        })}
        {/* hover tooltip (SVG-native so it scales with the chart) */}
        {hover != null && (() => {
          const d = data[hover], px = x(hover), py = y(d.v), left = px > W - 150;
          const tw = 132, tx = left ? px - tw - 10 : px + 10, ty = Math.max(py - 46, padT);
          return (
            <g style={{ pointerEvents: 'none', transformBox: 'fill-box', transformOrigin: `${px}px ${py}px`, animation: 'arad-pt-pop .15s var(--ease-out)' }}>
              <rect x={tx} y={ty} width={tw} height={42} rx="6" fill="#181C24" stroke="#3B82F6" strokeWidth="1" opacity="0.98" />
              <text x={tx + 11} y={ty + 17} fontFamily="var(--font-sans)" fontSize="10" fill="#94A3B8">Subgroup {hover + 1}</text>
              <text x={tx + 11} y={ty + 33} fontFamily="var(--font-mono)" fontSize="13" fontWeight="600" fill={d.violation ? '#F87171' : '#F1F5F9'}>{d.v.toFixed(3)}{d.violation ? '  ✗' : ''}</text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}

/* ── Donut gauge: arc draws clockwise, number counts, target label appears after ── */
function DonutGauge({ value = 97.3, target = 95, size = 150, animKey = 0 }) {
  const r = size / 2 - 12, cx = size / 2, cy = size / 2, circ = 2 * Math.PI * r;
  const { val } = useCountUp(value, [animKey], 850);
  const passLen = (val / 100) * circ, failLen = ((100 - val) / 100) * circ;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-surface-inset)" strokeWidth="10" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#EF4444" strokeWidth="10" strokeDasharray={`${failLen} ${circ}`} strokeDashoffset={-passLen} opacity="0.85" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#10B981" strokeWidth="10" strokeDasharray={`${passLen} ${circ}`} strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 5px rgba(16,185,129,.5))' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 600, color: 'var(--color-text)' }}>{val.toFixed(1)}%</div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginTop: 2 }}>Accuracy</div>
      </div>
    </div>
  );
}

function MiniBars({ data, color = 'var(--color-secondary)', height = 56 }) {
  const max = Math.max(...data) || 1;
  const [ref, seen] = useInView();
  return (
    <div ref={ref} style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height }}>
      {data.map((v, i) => (
        <div key={i} title={`$${v.toFixed(2)}`} style={{ flex: 1, height: seen ? `${Math.max(6, (v / max) * 100)}%` : '0%', background: color, opacity: i === data.length - 1 ? 1 : 0.45, borderRadius: '2px 2px 0 0', transition: `height .5s ${i * 60}ms var(--ease-out)` }} />
      ))}
    </div>
  );
}

Object.assign(window, { SPCChart, DonutGauge, MiniBars });
