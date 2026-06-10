/* Arad UI Kit — Alerts: severity feed (arrival anim, confirm / false-positive) + accuracy tracker. */

const INIT_ALERTS = [
  { id: 1, sev: 'critical', rule: 'Nelson Rule 1', part: 'PN-4821', eq: 'CMM-001', char: 'Bore Diameter', val: 10.042, limit: 'UCL 10.030', ago: '2 min ago', state: 'open' },
  { id: 2, sev: 'critical', rule: 'Nelson Rule 1', part: 'PN-3390', eq: 'CMM-002', char: 'Hole Position', val: 0.214, limit: 'UCL 0.200', ago: '11 min ago', state: 'open' },
  { id: 3, sev: 'warning', rule: 'Nelson Rule 3', part: 'PN-4821', eq: 'CMM-001', char: 'Bore Diameter', val: null, limit: '6 pts trending up', ago: '18 min ago', state: 'confirmed' },
  { id: 4, sev: 'warning', rule: 'Nelson Rule 2', part: 'PN-7755', eq: 'OPT-204', char: 'Surface Flatness', val: null, limit: '9 pts one side of CL', ago: '34 min ago', state: 'open' },
  { id: 5, sev: 'info', rule: 'Nelson Rule 5', part: 'PN-1120', eq: 'LMS-07', char: 'Roundness', val: null, limit: '2 of 3 near 2σ', ago: '1 hr ago', state: 'false' },
];

const sevConf = {
  critical: { border: '#EF4444', tone: 'critical', label: 'Critical', filter: 'Critical' },
  warning: { border: '#F59E0B', tone: 'conditional', label: 'High', filter: 'High' },
  info: { border: '#3B82F6', tone: 'info', label: 'Medium', filter: 'Medium' },
};

function AlertCard({ a, onConfirm, onFalse, idx, fresh }) {
  const c = sevConf[a.sev];
  const dim = a.state === 'false';
  const borderC = a.state === 'confirmed' ? 'var(--color-success)' : c.border;
  return (
    <div style={{ position: 'relative', '--flash-c': c.border, '--glow-c': 'rgba(239,68,68,.5)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: `3px solid ${borderC}`, borderRadius: 'var(--radius-md)', padding: '14px 18px', opacity: dim ? 0.5 : 1,
      transition: 'opacity .3s var(--ease-out), border-color .3s var(--ease-out)',
      animation: fresh ? `arad-alert-in .4s var(--ease-out)${a.sev === 'critical' ? ', arad-glow-once 1s ease-out, arad-border-flash .7s ease-out' : ', arad-border-flash .6s ease-out'}` : 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
        {a.state === 'confirmed' ? <StatusDot tone="success" pulse={false} size={7} /> : a.sev === 'critical' ? <StatusDot tone="critical" size={7} /> : <StatusDot tone={a.sev === 'warning' ? 'warning' : 'info'} pulse={false} size={7} />}
        <Badge tone={c.tone}>{c.label}</Badge>
        <Badge tone="neutral" variant="outline">{a.rule}</Badge>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-text-secondary)' }}>{a.part} · {a.eq}</span>
        <div style={{ flex: 1 }} />
        {a.state === 'confirmed' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--color-success)', animation: 'arad-reveal-up-sm .25s var(--ease-out)' }}><Icon name="Check" size={14} color="var(--color-success)" />Confirmed</span>}
        {a.state === 'false' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>False Positive</span>}
      </div>
      <div style={{ position: 'relative', display: 'inline-block', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--color-text)', marginBottom: 4 }}>
        {a.char} {a.val != null ? <>exceeded limit: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-critical)', fontWeight: 600 }}>{a.val}</span> vs <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>{a.limit}</span></> : <span style={{ color: 'var(--color-text-secondary)' }}>{a.limit}</span>}
        {dim && <span style={{ position: 'absolute', left: 0, top: '50%', height: 1, background: 'var(--color-text-muted)', width: '100%', transformOrigin: 'left', animation: 'arad-grow-x .3s var(--ease-out)' }} />}
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)' }}>{a.ago}</span>
        <div style={{ flex: 1 }} />
        {a.state === 'open' && <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="sm" icon={<Icon name="Check" size={13} />} onClick={() => onConfirm(a.id)}>Confirm</Button>
          <Button variant="ghost" size="sm" icon={<Icon name="X" size={14} />} onClick={() => onFalse(a.id)}>False positive</Button>
        </div>}
      </div>
    </div>
  );
}

function Alerts({ onConfirmAlert, onNewAlert }) {
  const [filter, setFilter] = useState('All');
  const [alerts, setAlerts] = useState(INIT_ALERTS);
  const [fresh, setFresh] = useState(null);
  const [tp, setTp] = useState(284);
  const [fp, setFp] = useState(8);
  const idRef = useRef(100);
  const filters = ['All', 'Critical', 'High', 'Medium', 'Low'];
  const fRef = useRef({});
  const [ind, setInd] = useState({ left: 0, width: 0 });
  useEffect(() => { const el = fRef.current[filter]; if (el) setInd({ left: el.offsetLeft, width: el.offsetWidth }); }, [filter]);

  const accuracy = (tp / (tp + fp) * 100);

  const simulate = () => {
    const id = ++idRef.current;
    const a = { id, sev: 'critical', rule: 'Nelson Rule 1', part: 'PN-4821', eq: 'CMM-001', char: 'Bore Diameter', val: +(10.031 + Math.random() * 0.02).toFixed(3), limit: 'UCL 10.030', ago: 'just now', state: 'open' };
    setAlerts(list => [a, ...list]);
    setFresh(id); setFilter('All');
    setTimeout(() => setFresh(null), 1200);
    onNewAlert && onNewAlert();
    toast({ type: 'error', title: 'New critical alert', msg: `${a.part} · Bore Ø ${a.val} exceeded UCL` });
  };
  const confirm = (id) => { setAlerts(l => l.map(a => a.id === id ? { ...a, state: 'confirmed' } : a)); setTp(n => n + 1); onConfirmAlert && onConfirmAlert(); toast({ type: 'success', title: 'Alert confirmed', msg: 'Logged as true positive · accuracy updated' }); };
  const markFalse = (id) => { setAlerts(l => l.map(a => a.id === id ? { ...a, state: 'false' } : a)); setFp(n => n + 1); toast({ type: 'warning', title: 'Marked false positive', msg: 'Model feedback recorded for retraining' }); };

  useEffect(() => window.AradBus.on('alert', () => simulate()), []); // eslint-disable-line

  const visible = alerts.filter(a => filter === 'All' || sevConf[a.sev]?.filter === filter);

  return (
    <div>
      <PageHeader title="Alert Feed"
        actions={<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Button variant="secondary" size="md" icon={<Icon name="Zap" size={14} />} onClick={simulate}>Simulate alert</Button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
            <Icon name="Activity" size={14} color="var(--color-success)" />
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--color-text-secondary)' }}>Accuracy</span>
            <span key={accuracy.toFixed(1)} style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: 'var(--color-success)', display: 'inline-block', animation: 'arad-count-bounce .4s var(--ease-out)' }}>{accuracy.toFixed(1)}%</span>
          </div>
        </div>} />

      <div style={{ position: 'relative', display: 'inline-flex', gap: 6, marginBottom: 16, background: 'transparent' }}>
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: ind.left, width: ind.width, background: 'var(--color-primary-soft)', border: '1px solid var(--color-primary)', borderRadius: 999, transition: 'left .2s var(--ease-out), width .2s var(--ease-out)' }} />
        {filters.map(f => <button key={f} ref={el => fRef.current[f] = el} onClick={() => setFilter(f)} style={{ position: 'relative', height: 30, padding: '0 14px', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, border: '1px solid transparent', background: 'transparent', color: filter === f ? 'var(--color-primary)' : 'var(--color-text-secondary)', transition: 'color .2s' }}>{f}</button>)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {visible.map((a, i) => <div key={a.id} style={{ animation: a.id !== fresh ? `arad-reveal-up-sm .3s ${i * 35}ms var(--ease-out) both` : 'none' }}><AlertCard a={a} idx={i} fresh={a.id === fresh} onConfirm={confirm} onFalse={markFalse} /></div>)}
          {visible.length === 0 && <div style={{ padding: 40, textAlign: 'center', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--color-text-muted)', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-lg)' }}>No {filter.toLowerCase()} alerts in the current window.</div>}
        </div>
        <Card padding={20}>
          <h2 style={{ margin: '0 0 16px', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600 }}>Accuracy Tracker</h2>
          <div key={accuracy.toFixed(1)} style={{ fontFamily: 'var(--font-mono)', fontSize: 32, fontWeight: 600, color: 'var(--color-success)', lineHeight: 1, animation: 'arad-flash-text .5s ease-out' }}>{accuracy.toFixed(1)}%</div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>Last 30 days</div>
          <div style={{ height: 1, background: 'var(--color-border)', margin: '16px 0' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-sans)', fontSize: 14 }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>True positives</span>
              <span key={tp} style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-success)', fontWeight: 600, display: 'inline-block', animation: 'arad-count-bounce .4s var(--ease-out)' }}>{tp}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-sans)', fontSize: 14 }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>False positives</span>
              <span key={fp} style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-critical)', fontWeight: 600, display: 'inline-block', animation: 'arad-count-bounce .4s var(--ease-out)' }}>{fp}</span>
            </div>
          </div>
          <div style={{ margin: '18px 0 8px', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--color-text-muted)' }}>7-day rolling accuracy</div>
          <Sparkline data={[95.8, 96.1, 96.4, 96.0, 96.9, 97.1, 97.3]} w={228} h={48} color="var(--color-success)" id="acc" />
          <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, background: 'var(--color-pass-bg)', width: '100%', boxSizing: 'border-box', justifyContent: 'center' }}>
            <Icon name="Check" size={14} color="var(--color-pass-text)" />
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--color-pass-text)' }}>On Track vs 95% target</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

Object.assign(window, { Alerts });
