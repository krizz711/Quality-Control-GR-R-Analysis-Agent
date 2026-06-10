/* Arad UI Kit — Dashboard: KPI strip, live SPC monitor, live event feed, accuracy gauge, AI spend. */

const INITIAL_SPC = [
  { v: 10.012 }, { v: 10.018 }, { v: 10.009 }, { v: 10.021 }, { v: 10.015 },
  { v: 10.024 }, { v: 10.019 }, { v: 10.028 }, { v: 10.022 }, { v: 10.031 },
  { v: 10.026 }, { v: 10.034, violation: true }, { v: 10.029 }, { v: 10.023 },
  { v: 10.038, violation: true }, { v: 10.027 }, { v: 10.020 }, { v: 10.025 },
  { v: 10.030 }, { v: 10.042, violation: true },
];

const INITIAL_EVENTS = [
  { id: 1, t: '14:32:08', type: 'spc.violation', tone: 'fail', text: 'PN-4821 · Bore Ø exceeded UCL on CMM-001' },
  { id: 2, t: '14:28:51', type: 'grr.complete', tone: 'info', text: 'Study #2471 complete — %GR&R 8.2%, Pass' },
  { id: 3, t: '14:21:30', type: 'alert.sent', tone: 'conditional', text: 'Alert dispatched to QA team (Rule 3)' },
  { id: 4, t: '14:15:02', type: 'review.required', tone: 'purple', text: 'Gauge G-118 flagged for manager review' },
  { id: 5, t: '14:09:44', type: 'grr.complete', tone: 'info', text: 'Study #2470 complete — %GR&R 23.4%, Conditional' },
  { id: 6, t: '13:58:12', type: 'spc.violation', tone: 'fail', text: 'PN-3390 · Wall thickness run of 7 above CL' },
  { id: 7, t: '13:47:05', type: 'alert.sent', tone: 'conditional', text: 'Alert dispatched to QA team (Rule 1)' },
];

const PENDING = [{ eq: 'CMM-001', grr: 23.4, days: 2 }, { eq: 'G-118', grr: 31.7, days: 4 }, { eq: 'OPT-204', grr: 12.1, days: 1 }];
const toneColor = { fail: 'var(--color-critical)', info: 'var(--color-primary)', conditional: 'var(--color-warning)', purple: 'var(--color-secondary)' };

function SectionTitle({ children, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
      <h2 style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 600, color: 'var(--color-text)' }}>{children}</h2>
      <div style={{ flex: 1 }} />
      {right}
    </div>
  );
}

function EventRow({ e }) {
  return (
    <div style={{ position: 'relative', display: 'flex', gap: 10, padding: '14px 20px', borderBottom: '1px solid var(--color-border)', '--flash-c': toneColor[e.tone] || 'var(--color-primary)',
      animation: e.fresh ? 'arad-event-in .35s var(--ease-out), arad-border-flash .6s ease-out' : 'none' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)', flex: 'none', paddingTop: 2 }}>{e.t}</span>
      <div>
        <Badge tone={e.tone} style={{ marginBottom: 6 }}>{e.type}</Badge>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>{e.text}</div>
      </div>
    </div>
  );
}

function Dashboard({ onNavigate, connState }) {
  const [animKey, setAnimKey] = useState(0);
  const [aiOpen, setAiOpen] = useState(true);
  const [spc, setSpc] = useState(INITIAL_SPC);
  const [drawKey, setDrawKey] = useState(0);
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [rate, setRate] = useState(7);
  const idRef = useRef(100);
  const [acc, setAcc] = useState(97.3);
  useEffect(() => { setAnimKey(k => k + 1); }, []);

  useEffect(() => window.AradBus.on('measurement', () => addMeasurement()), []); // eslint-disable-line

  const stamp = () => { const d = new Date(); return d.toTimeString().slice(0, 8); };

  const addMeasurement = () => {
    const v = +(10.018 + Math.random() * 0.026).toFixed(3);
    const violation = v > 10.030;
    setSpc(s => [...s.slice(-23), { v, violation }]);
    setDrawKey(k => k + 1);
    setRate(r => Math.min(r + 1, 14));
    const id = ++idRef.current;
    const ev = violation
      ? { id, t: stamp(), type: 'spc.violation', tone: 'fail', text: `PN-4821 · Bore Ø ${v} exceeded UCL on CMM-001`, fresh: true }
      : { id, t: stamp(), type: 'spc.measure', tone: 'info', text: `PN-4821 · Bore Ø ${v} in control`, fresh: true };
    setEvents(e => [ev, ...e].slice(0, 14));
    setTimeout(() => setEvents(e => e.map(x => x.id === id ? { ...x, fresh: false } : x)), 700);
    if (violation) toast({ type: 'error', title: 'SPC violation detected', msg: `Bore Ø ${v} exceeded UCL 10.030 on CMM-001` });
    else toast({ type: 'info', title: 'New measurement', msg: `Bore Ø ${v} · within control limits` });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        <KPICard id="k1" label="GR&R Studies" value="247" subtitle="+12 this week" subtitleTone="success" spark={[230, 233, 235, 232, 240, 244, 247]} animateKey={animKey} delay={0} />
        <KPICard id="k2" label="Alert Accuracy" value="97.3" unit="%" subtitle="▲ vs 95% SLA" subtitleTone="success" spark={[95.1, 95.4, 96, 96.2, 96.8, 97, 97.3]} animateKey={animKey} delay={60} />
        <KPICard id="k3" label="Active Alerts" value="3" subtitle="critical · 12 total" subtitleTone="critical" spark={[6, 5, 7, 4, 5, 4, 3]} animateKey={animKey} delay={120} />
        <KPICard id="k4" label="Avg Study Time" value="1.2" unit="hrs" subtitle="✓ under 2hr SLA" subtitleTone="success" spark={[1.6, 1.5, 1.4, 1.5, 1.3, 1.3, 1.2]} animateKey={animKey} delay={180} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
        <Reveal delay={120}><Card padding={20}>
          <SectionTitle right={
            <Button variant="secondary" size="sm" icon={<Icon name="Zap" size={13} />} onClick={addMeasurement}>Simulate measurement</Button>
          }>Live Process Monitor</SectionTitle>
          <SPCChart data={spc} ucl={10.030} cl={10.020} lcl={10.010} drawKey={drawKey} />
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <Badge tone="fail" variant="outline">Rule 1 · {spc.filter(d => d.violation).length} violations</Badge>
            <Badge tone="conditional" variant="outline">Rule 3 · 1 violation</Badge>
          </div>
          <div style={{ marginTop: 16, borderLeft: '3px solid var(--color-secondary)', background: 'var(--color-surface-inset)', borderRadius: '0 var(--radius-md) var(--radius-md) 0', padding: 14 }}>
            <button onClick={() => setAiOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <Icon name="Sparkles" size={15} color="var(--color-secondary)" />
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>AI Interpretation</span>
              <Badge tone="critical">Urgent</Badge>
              <div style={{ flex: 1 }} />
              <Icon name="ChevronRight" size={16} color="var(--color-text-muted)" style={{ transform: aiOpen ? 'rotate(90deg)' : 'none', transition: 'transform var(--transition)' }} />
            </button>
            <div style={{ display: 'grid', gridTemplateRows: aiOpen ? '1fr' : '0fr', transition: 'grid-template-rows .25s var(--ease-out)' }}>
              <div style={{ overflow: 'hidden' }}>
                <p style={{ margin: '10px 0 0', fontFamily: 'var(--font-sans)', fontSize: 14, lineHeight: 1.55, color: 'var(--color-text-secondary)' }}>
                  Three points breach the upper control limit with an upward drift over the last 8 subgroups — consistent with progressive tool wear on <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}>CMM-001</span>. Recommend halting the run and verifying the boring tool offset before the next lot.
                </p>
              </div>
            </div>
          </div>
        </Card></Reveal>

        <Reveal delay={180}><Card padding={0} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 600, color: 'var(--color-text)' }}>Live Events</h2>
            <StatusDot tone={connState === 'connected' ? 'success' : connState === 'reconnecting' ? 'warning' : 'critical'} pulse={connState !== 'disconnected'} speed={connState === 'reconnecting' ? '1s' : '2s'} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 432 }}>
            {events.map(e => <EventRow key={e.id} e={e} />)}
          </div>
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)' }}>
            <StatusDot tone={connState === 'disconnected' ? 'critical' : 'success'} size={6} pulse={connState !== 'disconnected'} /> {connState === 'disconnected' ? 'WebSocket disconnected' : `WebSocket connected · ${rate} events/min`}
          </div>
        </Card></Reveal>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
        <Reveal delay={220}><Card padding={20}>
          <SectionTitle right={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--color-primary)', background: 'var(--color-primary-soft)', padding: '2px 8px', borderRadius: 999 }}>14</span>}>Pending Reviews</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {PENDING.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottom: i < PENDING.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--color-text)' }}>{p.eq}</div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>%GR&R <span style={{ fontFamily: 'var(--font-mono)', color: p.grr > 30 ? 'var(--color-critical)' : p.grr > 10 ? 'var(--color-warning)' : 'var(--color-success)' }}>{p.grr}%</span> · {p.days}d pending</div>
                </div>
                <Button variant="secondary" size="sm" onClick={() => onNavigate('review')}>Review</Button>
              </div>
            ))}
          </div>
          <button onClick={() => onNavigate('review')} style={{ display: 'inline-block', marginTop: 12, fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>View all 14 →</button>
        </Card></Reveal>

        <Reveal delay={260}><Card padding={20}>
          <SectionTitle>Alert Accuracy</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <DonutGauge value={acc} target={95} animKey={animKey} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="Check" size={14} color="var(--color-success)" />
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--color-success)' }}>Target Met (95%)</span>
            </div>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--color-text-muted)' }}>Last 30 days</span>
          </div>
        </Card></Reveal>

        <Reveal delay={300}><Card padding={20}>
          <SectionTitle>AI Spend</SectionTitle>
          <ProgressBar value={8.4} max={50} tone="info" valueLabel="$8.40 / $50.00" />
          <div style={{ margin: '14px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[['GR&R narratives', '$4.10'], ['SPC interpret', '$2.85'], ['Chat', '$1.45']].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                <span>{k}</span><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>Daily usage · last 7 days</div>
          <MiniBars data={[0.9, 1.2, 0.7, 1.5, 1.1, 1.0, 1.4]} />
        </Card></Reveal>
      </div>
    </div>
  );
}

Object.assign(window, { Dashboard });
