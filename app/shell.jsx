/* Arad UI Kit — app shell: sidebar (collapsible), header (connection states), footer, banner. */

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: 'House' },
  { id: 'grr', label: 'GR&R Studies', icon: 'ChartColumn' },
  { id: 'review', label: 'Review Queue', icon: 'ClipboardCheck', badgeKey: 'review' },
  { id: 'alerts', label: 'Alerts', icon: 'Bell', badgeKey: 'alerts', badgeTone: 'critical' },
  { id: 'analytics', label: 'Analytics', icon: 'TrendingUp' },
  { id: 'assistant', label: 'AI Assistant', icon: 'Sparkles' },
  { id: 'audit', label: 'Audit Log', icon: 'Shield' },
];

function NavBadge({ value, tone, bump }) {
  return (
    <span key={value} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: tone === 'critical' ? 'var(--color-critical)' : 'var(--color-surface-elevated)', color: tone === 'critical' ? '#fff' : 'var(--color-text-secondary)',
      animation: bump ? 'arad-count-bounce .4s var(--ease-out)' : 'none' }}>{value}</span>
  );
}

function Sidebar({ active, onNavigate, collapsed, onToggle, badges, bumpKey }) {
  const NavButton = ({ item }) => {
    const isActive = active === item.id;
    const btn = (
      <button onClick={() => onNavigate(item.id)}
        style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 11, height: 38, padding: collapsed ? '0' : '0 12px', justifyContent: collapsed ? 'center' : 'flex-start', borderRadius: 'var(--radius-md)', border: 'none',
          background: isActive ? 'var(--color-primary-soft)' : 'transparent', color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
          cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: isActive ? 600 : 500, textAlign: 'left', width: '100%', transition: 'all var(--transition)', overflow: 'hidden' }}
        onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--color-surface-elevated)'; e.currentTarget.style.color = 'var(--color-text)'; } }}
        onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-secondary)'; } }}>
        <span style={{ position: 'absolute', left: -12, top: 8, bottom: 8, width: 3, borderRadius: 999, background: 'var(--color-primary)', transformOrigin: 'left center', transform: isActive ? 'scaleX(1)' : 'scaleX(0)', transition: 'transform .15s var(--ease-out)' }} />
        <Icon name={item.icon} size={18} color={isActive ? 'var(--color-primary)' : 'currentColor'} />
        <span style={{ flex: 1, whiteSpace: 'nowrap', opacity: collapsed ? 0 : 1, transition: 'opacity .1s ease-out', width: collapsed ? 0 : 'auto' }}>{item.label}</span>
        {!collapsed && item.badgeKey && badges[item.badgeKey] > 0 && <NavBadge value={badges[item.badgeKey]} tone={item.badgeTone} bump={bumpKey === item.badgeKey} />}
        {collapsed && item.badgeKey && badges[item.badgeKey] > 0 && <span style={{ position: 'absolute', top: 5, right: 9, width: 7, height: 7, borderRadius: 999, background: item.badgeTone === 'critical' ? 'var(--color-critical)' : 'var(--color-primary)' }} />}
      </button>
    );
    return collapsed ? <Tooltip label={item.label} side="right" delay={300}>{btn}</Tooltip> : btn;
  };

  return (
    <aside style={{ width: collapsed ? 64 : 220, flex: 'none', background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box', transition: 'width .25s cubic-bezier(.4,0,.2,1)' }}>
      <div style={{ height: 64, display: 'flex', alignItems: 'center', gap: 10, padding: collapsed ? '0' : '0 18px', justifyContent: collapsed ? 'center' : 'flex-start', borderBottom: '1px solid var(--color-border)' }}>
        <img src="assets/arad-mark.svg" width="28" height="28" alt="Arad" style={{ display: 'block', flex: 'none' }} />
        {!collapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-.01em' }}>Arad</span>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 400, color: 'var(--color-text-secondary)' }}> QI</span>
        </span>}
      </div>
      <nav style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', overflowX: 'hidden' }}>
        {NAV.map(item => <NavButton key={item.id} item={item} />)}
      </nav>
      <div style={{ padding: 12, borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {!collapsed ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-inset)' }}>
            <div style={{ width: 32, height: 32, borderRadius: 999, background: 'linear-gradient(135deg,#6366F1,#3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: '#fff', flex: 'none' }}>DK</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Vertex Aerospace</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--color-text-muted)' }}>D. Karam</div>
            </div>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--color-secondary)', border: '1px solid var(--color-secondary)', borderRadius: 4, padding: '2px 5px' }}>Ent</span>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 32, height: 32, borderRadius: 999, background: 'linear-gradient(135deg,#6366F1,#3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: '#fff' }}>DK</div>
          </div>
        )}
        <button onClick={onToggle} style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 10, height: 34, padding: collapsed ? 0 : '0 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-muted)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 13, width: '100%' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}>
          <Icon name="ChevronsLeft" size={16} style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform .25s var(--ease-out)' }} />
          {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}

function AnimatedEllipsis() {
  const [n, setN] = useState(1);
  useEffect(() => { const iv = setInterval(() => setN(x => x % 3 + 1), 400); return () => clearInterval(iv); }, []);
  return <span style={{ display: 'inline-block', width: 14, textAlign: 'left' }}>{'.'.repeat(n)}</span>;
}

function ConnIndicator({ state }) {
  if (state === 'connected') return <StatusDot tone="success" label="Live" speed="2s" />;
  if (state === 'reconnecting') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <StatusDot tone="warning" speed="1s" />
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, color: 'var(--color-warning)' }}>Reconnecting<AnimatedEllipsis /></span>
    </span>
  );
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      <Icon name="TriangleAlert" size={14} color="var(--color-critical)" />
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, color: 'var(--color-critical)' }}>Offline</span>
    </span>
  );
}

const RECENT_NOTIFS = [
  { tone: 'critical', icon: 'TriangleAlert', text: 'PN-4821 · Bore Ø exceeded UCL', t: '2m' },
  { tone: 'warning', icon: 'Activity', text: 'Rule 3 trend on CMM-001', t: '18m' },
  { tone: 'info', icon: 'ClipboardCheck', text: 'G-118 flagged for review', t: '34m' },
];

function Header({ breadcrumb, range, onRange, onOpenSearch, connState, alerts, onNavigate, flash }) {
  const ranges = ['24h', '7d', '30d', 'Custom'];
  return (
    <header style={{ position: 'relative', height: 64, flex: 'none', display: 'flex', alignItems: 'center', gap: 16, padding: '0 24px', borderBottom: '1px solid var(--color-border)', background: 'rgba(10,11,15,0.7)', backdropFilter: 'blur(8px)', animation: flash ? 'arad-header-flash .6s ease-out' : 'none', zIndex: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-sans)', fontSize: 14 }}>
        <span style={{ color: 'var(--color-text-muted)' }}>Arad</span>
        <Icon name="ChevronRight" size={14} color="var(--color-text-muted)" />
        <span key={breadcrumb} style={{ color: 'var(--color-text)', fontWeight: 600, animation: 'arad-reveal-up-sm .25s var(--ease-out)' }}>{breadcrumb}</span>
      </div>
      <div style={{ flex: 1 }} />
      <button onClick={onOpenSearch} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 12px', background: 'var(--color-surface-inset)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', width: 240, cursor: 'pointer', transition: 'border-color var(--transition)' }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-border-strong)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}>
        <Icon name="Search" size={15} color="var(--color-text-muted)" />
        <span style={{ flex: 1, textAlign: 'left', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--color-text-muted)' }}>Search…</span>
        <kbd style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)', border: '1px solid var(--color-border-strong)', borderRadius: 4, padding: '1px 5px' }}>⌘K</kbd>
      </button>
      <div style={{ display: 'flex', background: 'var(--color-surface-inset)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 2 }}>
        {ranges.map(r => (
          <button key={r} onClick={() => onRange(r)} style={{ height: 28, padding: '0 10px', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, transition: 'all var(--transition)',
            background: range === r ? 'var(--color-surface-elevated)' : 'transparent', color: range === r ? 'var(--color-text)' : 'var(--color-text-muted)', boxShadow: range === r ? 'var(--shadow-sm)' : 'none' }}>{r}</button>
        ))}
      </div>
      <ConnIndicator state={connState} />
      <Dropdown align="right" width={300} trigger={
        <button style={{ position: 'relative', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
          <Icon name="Bell" size={17} />
          {alerts > 0 && <span key={alerts} style={{ position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999, background: 'var(--color-critical)', color: '#fff', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--color-bg)', animation: 'arad-count-bounce .4s var(--ease-out)' }}>{alerts}</span>}
        </button>
      } items={[
        { label: 'Notifications', onClick: () => {} },
        { divider: true },
        ...RECENT_NOTIFS.map(n => ({ label: n.text, icon: n.icon, onClick: () => onNavigate('alerts') })),
        { divider: true },
        { label: 'View all alerts', icon: 'ArrowRight', onClick: () => onNavigate('alerts') },
      ]} />
      <Dropdown align="right" width={190} trigger={
        <button style={{ width: 32, height: 32, borderRadius: 999, border: 'none', background: 'linear-gradient(135deg,#6366F1,#3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>DK</button>
      } items={[
        { label: 'D. Karam', icon: 'User', onClick: () => {} },
        { divider: true },
        { label: 'Settings', icon: 'Settings', onClick: () => {} },
        { label: 'Audit Log', icon: 'Shield', onClick: () => onNavigate('audit') },
        { divider: true },
        { label: 'Sign out', icon: 'LogOut', danger: true, onClick: () => {} },
      ]} />
    </header>
  );
}

function ConnectionBanner({ state }) {
  const [render, setRender] = useState(state === 'disconnected');
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (state === 'disconnected') { setRender(true); setLeaving(false); }
    else if (render) { setLeaving(true); const t = setTimeout(() => setRender(false), 320); return () => clearTimeout(t); }
  }, [state]); // eslint-disable-line
  if (!render) return null;
  return (
    <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 24px', background: 'rgba(239,68,68,.12)', borderBottom: '1px solid rgba(239,68,68,.3)', animation: `${leaving ? 'arad-banner-up' : 'arad-banner-down'} .3s var(--ease-out) both` }}>
      <Icon name="WifiOff" size={15} color="var(--color-critical)" />
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, color: 'var(--color-fail-text)', fontWeight: 500 }}>Real-time connection lost. Data may be stale.</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)', marginLeft: 'auto' }}>retrying…</span>
    </div>
  );
}

function Footer() {
  return (
    <footer style={{ flex: 'none', height: 36, display: 'flex', alignItems: 'center', gap: 8, padding: '0 24px', borderTop: '1px solid var(--color-border)', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--color-text-muted)' }}>
      <Icon name="Lock" size={12} color="var(--color-text-muted)" />
      <span>All data encrypted in transit</span><span style={{ opacity: 0.5 }}>·</span>
      <span>SOC 2 Type II</span><span style={{ opacity: 0.5 }}>·</span><span>Full audit trail</span>
    </footer>
  );
}

function PageHeader({ title, subtitle, actions }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 20 }}>
      <div>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 600, color: 'var(--color-text)' }}>{title}</h1>
        {subtitle && <div style={{ marginTop: 4, fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--color-text-secondary)' }}>{subtitle}</div>}
      </div>
      <div style={{ flex: 1 }} />
      {actions}
    </div>
  );
}

Object.assign(window, { Sidebar, Header, Footer, ConnectionBanner, PageHeader, NAV });
