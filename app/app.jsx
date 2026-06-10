/* Arad UI Kit — App root: navigation, page transitions, connection states, ⌘K, demo flows. */

const TITLES = { dashboard: 'Dashboard', grr: 'GR&R Studies', review: 'Review Queue', alerts: 'Alerts', assistant: 'AI Assistant', analytics: 'Analytics', audit: 'Audit Log', settings: 'Settings' };

function Placeholder({ title }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, color: 'var(--color-text-muted)' }}>
      <img src="assets/arad-mark.svg" width="56" height="56" alt="" style={{ opacity: 0.5 }} />
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 600, color: 'var(--color-text-secondary)' }}>{title}</div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14 }}>This screen is part of the product map — not built in this kit.</div>
    </div>
  );
}

const FLOWS = [
  { n: 1, label: 'Submit a GR&R study → results', icon: 'ChartColumn' },
  { n: 2, label: 'Review queue → approve a study', icon: 'ClipboardCheck' },
  { n: 3, label: 'Alerts → confirm a new alert', icon: 'Bell' },
  { n: 4, label: 'Ask the AI assistant', icon: 'Sparkles' },
  { n: 5, label: 'Live SPC measurement update', icon: 'Activity' },
];

function DemoDock({ onFlow, onDropout, connState }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'fixed', left: 16, bottom: 16, zIndex: 900, fontFamily: 'var(--font-sans)' }}>
      {open && (
        <div style={{ width: 290, marginBottom: 10, background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden', animation: 'arad-dropdown-in .18s var(--ease-out)' }}>
          <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="Play" size={14} color="var(--color-primary)" />
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--color-text)' }}>Guided Flows</span>
          </div>
          <div style={{ padding: 6 }}>
            {FLOWS.map(f => (
              <button key={f.n} onClick={() => { onFlow(f.n); setOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '10px 12px', border: 'none', borderRadius: 'var(--radius-md)', background: 'transparent', cursor: 'pointer', textAlign: 'left', color: 'var(--color-text-secondary)', transition: 'all var(--transition)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface)'; e.currentTarget.style.color = 'var(--color-text)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}>
                <span style={{ width: 22, height: 22, flex: 'none', borderRadius: 6, background: 'var(--color-primary-soft)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>{f.n}</span>
                <span style={{ flex: 1, fontSize: 13.5 }}>{f.label}</span>
                <Icon name="ArrowRight" size={14} />
              </button>
            ))}
          </div>
          <div style={{ padding: 6, borderTop: '1px solid var(--color-border)' }}>
            <button onClick={() => { onDropout(); }} disabled={connState !== 'connected'} style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '10px 12px', border: 'none', borderRadius: 'var(--radius-md)', background: 'transparent', cursor: connState === 'connected' ? 'pointer' : 'default', opacity: connState === 'connected' ? 1 : 0.5, textAlign: 'left', color: 'var(--color-text-secondary)' }}
              onMouseEnter={e => { if (connState === 'connected') { e.currentTarget.style.background = 'var(--color-surface)'; e.currentTarget.style.color = 'var(--color-text)'; } }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}>
              <span style={{ width: 22, height: 22, flex: 'none', borderRadius: 6, background: 'rgba(239,68,68,.12)', color: 'var(--color-critical)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="WifiOff" size={13} /></span>
              <span style={{ flex: 1, fontSize: 13.5 }}>Simulate connection dropout</span>
            </button>
          </div>
        </div>
      )}
      <button onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 9, height: 40, padding: '0 16px', borderRadius: 999, border: '1px solid var(--color-border-strong)', background: 'var(--color-surface-elevated)', boxShadow: 'var(--shadow-lg)', cursor: 'pointer', color: 'var(--color-text)', fontSize: 14, fontWeight: 600 }}>
        <Icon name={open ? 'X' : 'Wand2'} size={16} color="var(--color-primary)" />
        {open ? 'Close' : 'Try a demo'}
      </button>
    </div>
  );
}

function App() {
  const [page, setPage] = useState('dashboard');
  const [range, setRange] = useState('7d');
  const [collapsed, setCollapsed] = useState(false);
  const [conn, setConn] = useState('connected');
  const [flash, setFlash] = useState(false);
  const [cmdk, setCmdk] = useState(false);
  const [badges, setBadges] = useState({ review: 14, alerts: 3 });
  const [bump, setBump] = useState(null);
  const [seedQ, setSeedQ] = useState(null);
  const [assistantKey, setAssistantKey] = useState(0);

  const nav = (p) => { setCmdk(false); setPage(p); };

  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmdk(o => !o); }
      else if (e.key === 'Escape') setCmdk(false);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const doBump = (key) => { setBump(key); setTimeout(() => setBump(null), 450); };

  const dropout = () => {
    setConn('disconnected');
    setTimeout(() => setConn('reconnecting'), 2400);
    setTimeout(() => { setConn('connected'); setFlash(true); setTimeout(() => setFlash(false), 650); toast({ type: 'success', title: 'Reconnected', msg: 'Real-time stream restored · data is live' }); }, 4100);
  };

  const runFlow = (n) => {
    const after = (fn, d = 440) => setTimeout(fn, d);
    if (n === 1) { nav('grr'); after(() => window.AradBus.emit('grr-demo')); toast({ type: 'info', title: 'Flow: GR&R submission', msg: 'Auto-filling demo data and running analysis…' }); }
    else if (n === 2) { nav('review'); after(() => window.AradBus.emit('review-open')); toast({ type: 'info', title: 'Flow: Review approval', msg: 'Choose Approve, then Submit to clear the row.' }); }
    else if (n === 3) { nav('alerts'); after(() => window.AradBus.emit('alert')); toast({ type: 'info', title: 'Flow: Confirm alert', msg: 'Hit Confirm to log it as a true positive.' }); }
    else if (n === 4) { setSeedQ('Why is CMM-001 failing?'); setAssistantKey(k => k + 1); nav('assistant'); }
    else if (n === 5) { nav('dashboard'); after(() => window.AradBus.emit('measurement')); toast({ type: 'info', title: 'Flow: Live SPC update', msg: 'Watch the chart re-draw and the feed update.' }); }
  };

  const fullBleed = page === 'assistant';
  let content;
  if (page === 'dashboard') content = <Dashboard onNavigate={nav} connState={conn} />;
  else if (page === 'grr') content = <GRRStudies />;
  else if (page === 'review') content = <ReviewQueue onResolve={() => { setBadges(b => ({ ...b, review: Math.max(0, b.review - 1) })); doBump('review'); }} />;
  else if (page === 'alerts') content = <Alerts onConfirmAlert={() => {}} onNewAlert={() => { setBadges(b => ({ ...b, alerts: b.alerts + 1 })); doBump('alerts'); }} />;
  else if (page === 'assistant') content = <Assistant key={'a' + assistantKey} seedQuestion={seedQ} />;
  else content = <Placeholder title={TITLES[page]} />;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar active={page} onNavigate={nav} collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} badges={badges} bumpKey={bump} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header breadcrumb={TITLES[page]} range={range} onRange={setRange} onOpenSearch={() => setCmdk(true)} connState={conn} alerts={badges.alerts} onNavigate={nav} flash={flash} />
        <ConnectionBanner state={conn} />
        <main className="arad-page" key={page} style={{ flex: 1, overflowY: fullBleed ? 'hidden' : 'auto', padding: fullBleed ? 0 : 24, display: 'flex', flexDirection: 'column' }}>
          {content}
        </main>
        {!fullBleed && <Footer />}
      </div>
      <CommandPalette open={cmdk} onClose={() => setCmdk(false)} onNavigate={nav} />
      <ToastViewport />
      <DemoDock onFlow={runFlow} onDropout={dropout} connState={conn} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
