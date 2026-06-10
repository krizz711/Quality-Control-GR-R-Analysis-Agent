/* Arad UI Kit — FX infrastructure: toasts, tooltips, Cmd+K palette, dropdown. */

/* ───────────────────────── TOASTS ─────────────────────────
   Global store so any component can fire toast(...) without context plumbing. */
const ToastStore = (() => {
  let toasts = [];
  let subs = [];
  let nextId = 1;
  const emit = () => subs.forEach(f => f(toasts));
  return {
    subscribe(f) { subs.push(f); return () => { subs = subs.filter(s => s !== f); }; },
    push(t) {
      const id = nextId++;
      toasts = [...toasts, { id, type: 'info', duration: 4000, ...t }];
      emit();
      return id;
    },
    dismiss(id) {
      toasts = toasts.map(t => t.id === id ? { ...t, leaving: true } : t);
      emit();
      setTimeout(() => { toasts = toasts.filter(t => t.id !== id); emit(); }, 220);
    },
  };
})();
function toast(t) { return ToastStore.push(t); }

const TOAST_CONF = {
  success: { c: 'var(--color-success)', icon: 'CircleCheck' },
  error: { c: 'var(--color-critical)', icon: 'CircleX' },
  warning: { c: 'var(--color-warning)', icon: 'TriangleAlert' },
  info: { c: 'var(--color-primary)', icon: 'Info' },
};

function ToastItem({ t }) {
  const conf = TOAST_CONF[t.type] || TOAST_CONF.info;
  const [progress, setProgress] = useState(100);
  useEffect(() => {
    if (t.leaving || !t.duration) return;
    const start = Date.now();
    const iv = setInterval(() => {
      const left = Math.max(0, 100 - ((Date.now() - start) / t.duration) * 100);
      setProgress(left);
      if (left <= 0) { clearInterval(iv); ToastStore.dismiss(t.id); }
    }, 30);
    return () => clearInterval(iv);
  }, [t.leaving]);
  return (
    <div style={{ width: 340, background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderLeft: `3px solid ${conf.c}`, borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden', animation: t.leaving ? 'arad-toast-out .2s ease-in forwards' : 'arad-toast-in .25s var(--ease-out)', pointerEvents: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 14px' }}>
        <Icon name={conf.icon} size={18} color={conf.c} style={{ marginTop: 1 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{t.title}</div>
          {t.msg && <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 3, lineHeight: 1.45 }}>{t.msg}</div>}
        </div>
        <button onClick={() => ToastStore.dismiss(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', padding: 2 }}><Icon name="X" size={14} /></button>
      </div>
      {t.duration && <div style={{ height: 2, background: 'var(--color-border)' }}><div style={{ height: '100%', width: `${progress}%`, background: conf.c, transition: 'width .03s linear' }} /></div>}
    </div>
  );
}

function ToastViewport() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => ToastStore.subscribe(setToasts), []);
  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', pointerEvents: 'none' }}>
      {toasts.map(t => <ToastItem key={t.id} t={t} />)}
    </div>
  );
}

/* ───────────────────────── TOOLTIP ───────────────────────── */
function Tooltip({ label, children, side = 'right', delay = 400 }) {
  const [show, setShow] = useState(false);
  const timer = useRef(null);
  const enter = () => { timer.current = setTimeout(() => setShow(true), delay); };
  const leave = () => { clearTimeout(timer.current); setShow(false); };
  const pos = {
    right: { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: 10 },
    top: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 8 },
    bottom: { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 8 },
  }[side];
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }} onMouseEnter={enter} onMouseLeave={leave}>
      {children}
      {show && <span style={{ position: 'absolute', zIndex: 1200, ...pos, whiteSpace: 'nowrap', background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border-strong)', color: 'var(--color-text)', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, padding: '5px 9px', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)', animation: 'arad-tooltip-in .1s var(--ease-out)', pointerEvents: 'none' }}>{label}</span>}
    </span>
  );
}

/* ───────────────────────── DROPDOWN ───────────────────────── */
function Dropdown({ trigger, items, align = 'left', width = 200 }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <span onClick={() => setOpen(o => !o)}>{trigger}</span>
      {open && (
        <div style={{ position: 'absolute', top: '100%', [align]: 0, marginTop: 6, width, zIndex: 800, transformOrigin: 'top', background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', padding: 5, animation: 'arad-dropdown-in .15s var(--ease-out)' }}>
          {items.map((it, i) => it.divider ? <div key={i} style={{ height: 1, background: 'var(--color-border)', margin: '5px 0' }} /> : (
            <button key={i} onClick={() => { setOpen(false); it.onClick && it.onClick(); }}
              style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '8px 9px', border: 'none', borderRadius: 'var(--radius-sm)', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)', fontSize: 14, color: it.danger ? 'var(--color-fail-text)' : 'var(--color-text-secondary)', animation: `arad-menuitem-in .15s ${i * 20}ms var(--ease-out) both` }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface)'; e.currentTarget.style.color = it.danger ? 'var(--color-fail-text)' : 'var(--color-text)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = it.danger ? 'var(--color-fail-text)' : 'var(--color-text-secondary)'; }}>
              {it.icon && <Icon name={it.icon} size={15} />}<span style={{ flex: 1 }}>{it.label}</span>{it.kbd && <kbd style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)', border: '1px solid var(--color-border-strong)', borderRadius: 4, padding: '1px 4px' }}>{it.kbd}</kbd>}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

/* ───────────────────────── COMMAND PALETTE (⌘K) ───────────────────────── */
const COMMANDS = [
  { id: 'dashboard', label: 'Go to Dashboard', icon: 'House', kind: 'Navigate', nav: 'dashboard' },
  { id: 'grr', label: 'Go to GR&R Studies', icon: 'ChartColumn', kind: 'Navigate', nav: 'grr' },
  { id: 'review', label: 'Go to Review Queue', icon: 'ClipboardCheck', kind: 'Navigate', nav: 'review' },
  { id: 'alerts', label: 'Go to Alerts', icon: 'Bell', kind: 'Navigate', nav: 'alerts' },
  { id: 'assistant', label: 'Go to AI Assistant', icon: 'Sparkles', kind: 'Navigate', nav: 'assistant' },
  { id: 'new-study', label: 'New GR&R Study', icon: 'Plus', kind: 'Action', nav: 'grr' },
  { id: 'cmm1', label: 'CMM-001 · Bore Diameter', icon: 'Search', kind: 'Equipment', nav: 'dashboard' },
  { id: 'g118', label: 'G-118 · Thread Pitch', icon: 'Search', kind: 'Equipment', nav: 'review' },
  { id: 'pn4821', label: 'PN-4821 · open violation', icon: 'TriangleAlert', kind: 'Alert', nav: 'alerts' },
  { id: 'ask', label: 'Ask AI: why is CMM-001 failing?', icon: 'Sparkles', kind: 'Action', nav: 'assistant' },
];

function CommandPalette({ open, onClose, onNavigate }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [debounced, setDebounced] = useState('');
  const inputRef = useRef(null);
  useEffect(() => { if (open) { setQ(''); setActive(0); setTimeout(() => inputRef.current && inputRef.current.focus(), 60); } }, [open]);
  useEffect(() => { const t = setTimeout(() => setDebounced(q), 150); return () => clearTimeout(t); }, [q]);
  const results = useMemo(() => {
    const s = debounced.trim().toLowerCase();
    return s ? COMMANDS.filter(c => c.label.toLowerCase().includes(s) || c.kind.toLowerCase().includes(s)) : COMMANDS.slice(0, 6);
  }, [debounced]);
  useEffect(() => { setActive(0); }, [results.length]);
  const choose = (c) => { if (!c) return; onClose(); c.nav && onNavigate(c.nav); };
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(results[active]); }
    else if (e.key === 'Escape') { onClose(); }
  };
  if (!open) return null;
  return (
    <div onMouseDown={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1500, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '14vh', background: 'rgba(5,7,12,.6)', backdropFilter: 'blur(8px)', animation: 'arad-fade-in .15s ease-out' }}>
      <div onMouseDown={e => e.stopPropagation()} style={{ width: 600, maxWidth: '92vw', background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden', animation: 'arad-modal-in .2s var(--ease-out)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px', borderBottom: '1px solid var(--color-border)' }}>
          <Icon name="Search" size={18} color="var(--color-text-muted)" />
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKey} placeholder="Search equipment, studies, alerts, actions…"
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--color-text)', fontFamily: 'var(--font-sans)', fontSize: 16 }} />
          <kbd style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)', border: '1px solid var(--color-border-strong)', borderRadius: 4, padding: '2px 6px' }}>ESC</kbd>
        </div>
        <div style={{ maxHeight: 360, overflowY: 'auto', padding: 8 }}>
          {results.length === 0 && <div style={{ padding: '28px 16px', textAlign: 'center', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--color-text-muted)' }}>No matches for “{debounced}”</div>}
          {results.map((c, i) => (
            <button key={c.id} onMouseEnter={() => setActive(i)} onClick={() => choose(c)}
              style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '11px 12px', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left', background: 'transparent', overflow: 'hidden', animation: `arad-menuitem-in .18s ${i * 30}ms var(--ease-out) both` }}>
              {active === i && <span style={{ position: 'absolute', inset: 0, background: 'var(--color-primary-soft)', animation: 'arad-grow-x .1s var(--ease-out)', transformOrigin: 'left', borderRadius: 'var(--radius-md)' }} />}
              <Icon name={c.icon} size={17} color={active === i ? 'var(--color-primary)' : 'var(--color-text-muted)'} style={{ position: 'relative' }} />
              <span style={{ position: 'relative', flex: 1, fontFamily: 'var(--font-sans)', fontSize: 14, color: active === i ? 'var(--color-text)' : 'var(--color-text-secondary)' }}>{c.label}</span>
              <span style={{ position: 'relative', fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', borderRadius: 4, padding: '2px 6px' }}>{c.kind}</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 16px', borderTop: '1px solid var(--color-border)', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--color-text-muted)' }}>
          <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}><kbd style={kbdS}>↑</kbd><kbd style={kbdS}>↓</kbd> navigate</span>
          <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}><kbd style={kbdS}>↵</kbd> select</span>
        </div>
      </div>
    </div>
  );
}
const kbdS = { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-strong)', borderRadius: 3, padding: '0 4px', minWidth: 16, textAlign: 'center', display: 'inline-block' };

Object.assign(window, { toast, ToastStore, ToastViewport, Tooltip, Dropdown, CommandPalette });
