/* Arad UI Kit — GR&R Studies: multi-step submit wizard + animated results + history. */

const GRR_HISTORY = [
  { date: '2026-06-08', eq: 'CMM-001', char: 'Bore Diameter', grr: 23.4, ndc: 4, verdict: 'conditional' },
  { date: '2026-06-07', eq: 'OPT-204', char: 'Surface Flatness', grr: 8.2, ndc: 9, verdict: 'pass' },
  { date: '2026-06-06', eq: 'G-118', char: 'Thread Pitch', grr: 31.7, ndc: 2, verdict: 'fail' },
  { date: '2026-06-05', eq: 'CMM-002', char: 'Wall Thickness', grr: 9.1, ndc: 7, verdict: 'pass' },
  { date: '2026-06-04', eq: 'LMS-07', char: 'Bore Diameter', grr: 14.6, ndc: 5, verdict: 'conditional' },
];

function VerdictBadge({ v }) {
  const map = { pass: ['pass', 'Pass'], conditional: ['conditional', 'Conditional'], fail: ['fail', 'Fail'] };
  const [tone, label] = map[v];
  return <Badge tone={tone}>{label}</Badge>;
}

/* ── Step indicator: active dot expands to a filling pill; completed draws a check ── */
function StepDots({ step }) {
  const steps = ['Setup', 'Data', 'Run'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {steps.map((s, i) => {
        const n = i + 1, done = n < step, active = n === step;
        return (
          <React.Fragment key={s}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ position: 'relative', height: 20, minWidth: 20, width: active ? 22 : 20, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                background: done || active ? 'var(--color-primary)' : 'var(--color-surface-inset)', color: done || active ? '#fff' : 'var(--color-text-muted)', border: done || active ? 'none' : '1px solid var(--color-border)', transition: 'all .25s var(--ease-out)' }}>
                {done ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" style={{ strokeDasharray: 28, strokeDashoffset: 28, animation: 'arad-check-draw .3s var(--ease-out) forwards' }} /></svg>
                  : <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>{n}</span>}
              </span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: done || active ? 'var(--color-text)' : 'var(--color-text-muted)', transition: 'color .2s' }}>{s}</span>
            </div>
            {i < steps.length - 1 && <div style={{ width: 18, height: 2, borderRadius: 2, background: 'var(--color-border)', overflow: 'hidden' }}><div style={{ height: '100%', width: done ? '100%' : '0%', background: 'var(--color-primary)', transition: 'width .3s var(--ease-out)' }} /></div>}
          </React.Fragment>
        );
      })}
      <style>{`@keyframes arad-check-draw{to{stroke-dashoffset:0}}`}</style>
    </div>
  );
}

/* ── CSV dropzone with drag + success states ── */
function DropZone({ loaded, onLoad }) {
  const [drag, setDrag] = useState(false);
  const [flash, setFlash] = useState(false);
  const drop = () => { setDrag(false); setFlash(true); setTimeout(() => { setFlash(false); onLoad(); }, 280); };
  if (loaded) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, border: '1px solid rgba(16,185,129,.4)', background: 'rgba(16,185,129,.07)', borderRadius: 'var(--radius-md)', padding: 14, animation: 'arad-result-in .25s var(--ease-out)' }}>
      <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'rgba(16,185,129,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Icon name="FileCheck" size={18} color="var(--color-success)" /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--color-text)' }}>bore_dia_grr.csv</div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--color-success)' }}>Loaded · 60 rows parsed</div>
      </div>
      <button onClick={onLoad} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}><Icon name="RotateCcw" size={15} /></button>
    </div>
  );
  return (
    <div onClick={drop} onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); drop(); }}
      style={{ border: `1.5px dashed ${flash ? 'var(--color-success)' : drag ? 'var(--color-primary)' : 'var(--color-border-strong)'}`, borderRadius: 'var(--radius-md)', padding: 22, textAlign: 'center', cursor: 'pointer',
        background: flash ? 'rgba(16,185,129,.08)' : drag ? 'rgba(59,130,246,.06)' : 'var(--color-surface-inset)', transition: 'all .15s var(--ease-out)' }}>
      <Icon name="Upload" size={20} color={drag ? 'var(--color-primary)' : 'var(--color-text-muted)'} style={{ margin: '0 auto 8px', transform: drag ? 'scale(1.15)' : 'scale(1)', transition: 'transform .15s var(--ease-out)' }} />
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: drag ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}>{drag ? 'Drop to upload' : 'Drop CSV or click to upload'}</div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>3 operators × 10 parts × 2 trials</div>
    </div>
  );
}

/* ── Run Analysis button: idle → loading (sweep) → complete ── */
function RunButton({ phase, onRun }) {
  const loading = phase === 'loading', complete = phase === 'complete';
  return (
    <button onClick={phase === 'idle' ? onRun : undefined} disabled={loading || complete}
      style={{ height: 42, border: 'none', borderRadius: 'var(--radius-md)', cursor: phase === 'idle' ? 'pointer' : 'default', position: 'relative', overflow: 'hidden',
        background: complete ? 'linear-gradient(180deg,#10B981,#059669)' : 'linear-gradient(180deg,#3B82F6,#2563EB)', color: '#fff', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background .3s var(--ease-out)', boxShadow: '0 1px 2px rgba(0,0,10,.4)' }}>
      {loading && <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '40%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.28), transparent)', animation: 'arad-runbar 1.6s linear infinite' }} />}
      <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        {complete ? <><Icon name="Check" size={17} color="#fff" />Complete</> : loading ? <><LoadingDots />Analyzing…</> : <><Icon name="Zap" size={16} color="#fff" />Run Analysis</>}
      </span>
    </button>
  );
}

/* ── streams children lines in one-by-one ── */
function Stream({ items, step = 110, restartKey }) {
  const [n, setN] = useState(prefersReduced() ? items.length : 0);
  useEffect(() => {
    if (prefersReduced()) { setN(items.length); return; }
    setN(0); let i = 0;
    const iv = setInterval(() => { i++; setN(i); if (i >= items.length) clearInterval(iv); }, step);
    return () => clearInterval(iv);
  }, [restartKey]); // eslint-disable-line
  return items.map((node, i) => <div key={i} style={{ opacity: i < n ? 1 : 0, transform: i < n ? 'none' : 'translateY(4px)', transition: 'opacity .25s var(--ease-out), transform .25s var(--ease-out)' }}>{node}</div>);
}

function PopulatedResults({ rkey }) {
  const [checks, setChecks] = useState([false, false, false]);
  const recs = ['Re-qualify the touch probe and re-seat the stylus', 'Add a fixture to constrain part placement on the table', 'Re-run with 3 trials to tighten the EV estimate'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, animation: 'arad-result-in .4s var(--ease-out)' }}>
      <div style={{ '--glow-c': 'rgba(245,158,11,.5)', display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg, rgba(245,158,11,.16), rgba(245,158,11,.04))', border: '1px solid rgba(245,158,11,.3)', animation: 'arad-glow-once 1.1s ease-out' }}>
        <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(245,158,11,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Icon name="TriangleAlert" size={22} color="var(--color-warning)" /></div>
        <div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 700, color: 'var(--color-cond-text)' }}>⚠ Conditional</div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--color-text-secondary)' }}>Requires manager review before acceptance</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <MetricPill value="23.4%" label="%GR&R" tone="warning" delay={0} />
        <MetricPill value="18.1%" label="EV · Repeat." delay={50} />
        <MetricPill value="14.8%" label="AV · Reprod." delay={100} />
        <MetricPill value="4" label="NDC" tone="warning" delay={150} />
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 10 }}>Variance Decomposition</div>
        <SegmentedBar key={rkey} animate segments={[{ label: 'EV (Repeatability)', value: 42 }, { label: 'AV (Reproducibility)', value: 23 }, { label: 'PV (Part)', value: 35 }]} />
      </div>
      <div style={{ borderLeft: '3px solid var(--color-secondary)', background: 'var(--color-surface-inset)', borderRadius: '0 var(--radius-lg) var(--radius-lg) 0', padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Icon name="Sparkles" size={16} color="var(--color-secondary)" />
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>AI Analysis</span>
          <div style={{ flex: 1 }} />
          <Badge tone="conditional">Risk: Medium</Badge>
          <Badge tone="neutral" variant="outline">Confidence 91%</Badge>
        </div>
        <Stream restartKey={rkey} items={[
          <p style={{ margin: '0 0 14px', fontFamily: 'var(--font-sans)', fontSize: 14, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>The measurement system explains <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}>23.4%</span> of total variation — above the 10% target but below the 30% rejection threshold. Repeatability (gauge) dominates the error, suggesting the instrument rather than the operators is the limiting factor.</p>,
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 6 }}>Root Cause</div>,
          <p style={{ margin: '0 0 14px', fontFamily: 'var(--font-sans)', fontSize: 14, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>EV at <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}>18.1%</span> points to probe seating repeatability on <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}>CMM-001</span>. NDC of 4 means the gauge resolves only 4 distinct categories across the tolerance.</p>,
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 8 }}>Recommendations</div>,
        ]} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          {recs.map((rec, i) => (
            <label key={i} className="arad-reveal-sm" style={{ '--d': (520 + i * 90) + 'ms', display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
              <span onClick={() => setChecks(c => c.map((v, j) => j === i ? !v : v))} style={{ width: 18, height: 18, flex: 'none', marginTop: 1, borderRadius: 4, border: `1px solid ${checks[i] ? 'var(--color-primary)' : 'var(--color-border-strong)'}`, background: checks[i] ? 'var(--color-primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all var(--transition)' }}>{checks[i] && <Icon name="Check" size={13} color="#fff" />}</span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: checks[i] ? 'var(--color-text-muted)' : 'var(--color-text-secondary)', textDecoration: checks[i] ? 'line-through' : 'none', transition: 'color var(--transition)' }}>{rec}</span>
            </label>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Button variant="primary" icon={<Icon name="Download" size={15} color="#fff" />} onClick={() => toast({ type: 'success', title: 'Report exported', msg: 'GR&R_CMM-001_2026-06-10.pdf downloaded' })}>Download PDF Report</Button>
        <Button variant="secondary" icon={<Icon name="ClipboardCheck" size={15} />} onClick={() => toast({ type: 'info', title: 'Added to Review Queue', msg: 'CMM-001 · Bore Diameter queued for manager review' })}>Add to Review Queue</Button>
        <Button variant="ghost" icon={<Icon name="Share2" size={15} />}>Share</Button>
      </div>
    </div>
  );
}

function EmptyResults({ analyzing }) {
  if (analyzing) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 20 }}>
      <div className="arad-skel" style={{ height: 60, borderRadius: 'var(--radius-lg)' }} />
      <div style={{ display: 'flex', gap: 12 }}>{[0, 1, 2, 3].map(i => <div key={i} className="arad-skel" style={{ flex: 1, height: 64 }} />)}</div>
      <div className="arad-skel" style={{ height: 28 }} />
      <div className="arad-skel" style={{ height: 150, borderRadius: 'var(--radius-lg)' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--color-secondary)', fontFamily: 'var(--font-sans)', fontSize: 14 }}><LoadingDots color="var(--color-secondary)" />Running Xbar-R analysis on 60 measurements…</div>
    </div>
  );
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 40, minHeight: 360, textAlign: 'center' }}>
      <svg width="120" height="104" viewBox="0 0 120 104" fill="none" style={{ opacity: 0.5 }}>
        <defs><linearGradient id="hexEmpty" x1="0" y1="0" x2="120" y2="104"><stop stopColor="#6366F1" /><stop offset="1" stopColor="#3B82F6" /></linearGradient></defs>
        {[[30, 26], [60, 9], [90, 26], [30, 60], [60, 43], [90, 60], [60, 77]].map(([cx, cy], i) => (
          <path key={i} d={`M${cx} ${cy - 14}l12 7v14l-12 7-12-7V${cy - 7}z`} stroke="url(#hexEmpty)" strokeWidth="1.4" fill="url(#hexEmpty)" fillOpacity={i === 3 ? 0.18 : 0.04} />
        ))}
      </svg>
      <div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 600, color: 'var(--color-text)' }}>No results yet</div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--color-text-secondary)', marginTop: 6, maxWidth: 320 }}>Complete the study setup and run the analysis to see the acceptance verdict, variance decomposition, and AI narrative here.</div>
      </div>
    </div>
  );
}

function GRRStudies() {
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [eq, setEq] = useState('CMM-001');
  const [char, setChar] = useState('Bore Diameter');
  const [method, setMethod] = useState('Xbar-R');
  const [tol, setTol] = useState('');
  const [file, setFile] = useState(false);
  const [phase, setPhase] = useState('idle'); // idle | loading | complete
  const [hasResults, setHasResults] = useState(true);
  const [rkey, setRkey] = useState(1);

  const go = (n) => { setDir(n > step ? 1 : -1); setStep(n); };
  const prefill = () => { setEq('CMM-001'); setChar('Bore Diameter'); setTol('± 0.025'); setFile(true); toast({ type: 'info', title: 'Demo data loaded', msg: '60 measurements · 3 operators × 10 parts × 2 trials' }); };
  const reset = () => { setStep(1); setPhase('idle'); setHasResults(false); setFile(false); setTol(''); };
  const run = () => {
    setPhase('loading'); setHasResults(false);
    setTimeout(() => {
      setPhase('complete'); setHasResults(true); setRkey(k => k + 1);
      toast({ type: 'warning', title: 'Analysis complete — Conditional', msg: '%GR&R 23.4% · requires manager review' });
    }, 2000);
  };

  useEffect(() => window.AradBus.on('grr-demo', () => {
    prefill(); setFile(true); setDir(1); setStep(3);
    setTimeout(() => run(), 700);
  }), []); // eslint-disable-line

  return (
    <div>
      <style>{`
        @keyframes arad-step-next{from{transform:translateX(40px)}to{transform:none}}
        @keyframes arad-step-prev{from{transform:translateX(-40px)}to{transform:none}}
      `}</style>
      <PageHeader title="GR&R Studies" subtitle="Gauge repeatability & reproducibility — measurement system analysis"
        actions={<div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" size="md" onClick={() => setHasResults(h => !h)}>{hasResults ? 'Show empty state' : 'Show results'}</Button>
          <Button variant="primary" icon={<Icon name="Plus" size={15} color="#fff" />} onClick={reset}>New Study</Button>
        </div>} />

      <div style={{ display: 'grid', gridTemplateColumns: '0.62fr 1fr', gap: 16, alignItems: 'start' }}>
        <Card padding={20}>
          <div style={{ marginBottom: 18 }}><StepDots step={step} /></div>
          <div key={step} style={{ animation: `${dir > 0 ? 'arad-step-next' : 'arad-step-prev'} .25s var(--ease-out)` }}>
            {step === 1 && <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Input label="Equipment ID" value={eq} onChange={e => setEq(e.target.value)} placeholder="CMM-001" />
              <Input label="Characteristic Name" value={char} onChange={e => setChar(e.target.value)} placeholder="Bore Diameter" />
              <div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 6 }}>Method</div>
                <div style={{ display: 'flex', background: 'var(--color-surface-inset)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 3 }}>
                  {['Xbar-R', 'ANOVA'].map(m => <button key={m} onClick={() => setMethod(m)} style={{ flex: 1, height: 30, border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, transition: 'all var(--transition)', background: method === m ? 'var(--color-surface-elevated)' : 'transparent', color: method === m ? 'var(--color-text)' : 'var(--color-text-muted)', boxShadow: method === m ? 'var(--shadow-sm)' : 'none' }}>{m}</button>)}
                </div>
              </div>
              <Button variant="ghost" size="sm" icon={<Icon name="Sparkles" size={14} color="var(--color-secondary)" />} onClick={prefill} style={{ alignSelf: 'flex-start' }}>Pre-populate with demo data</Button>
              <Button variant="primary" onClick={() => go(2)} icon={null}>Next: Data →</Button>
            </div>}
            {step === 2 && <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Input label="Tolerance (optional)" mono value={tol} onChange={e => setTol(e.target.value)} placeholder="± 0.025" />
              <DropZone loaded={file} onLoad={() => setFile(f => !f)} />
              <div style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--color-primary-soft)', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-primary)' }}>3 × 10 × 2 = 60 measurements</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="ghost" onClick={() => go(1)}>← Back</Button>
                <Button variant="primary" onClick={() => go(3)} disabled={!file} style={{ flex: 1 }}>Next: Run →</Button>
              </div>
            </div>}
            {step === 3 && <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, background: 'var(--color-surface-inset)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                {[['Equipment', eq], ['Characteristic', char], ['Method', method], ['Tolerance', tol || '—'], ['Measurements', '60']].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-sans)', fontSize: 13 }}><span style={{ color: 'var(--color-text-muted)' }}>{k}</span><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}>{v}</span></div>
                ))}
              </div>
              <RunButton phase={phase} onRun={run} />
              {phase !== 'loading' && <Button variant="ghost" onClick={() => go(2)}>← Back</Button>}
            </div>}
          </div>
        </Card>

        <Card padding={hasResults ? 20 : 0} style={{ minHeight: 380, display: 'flex', flexDirection: 'column' }}>
          {phase === 'loading' ? <EmptyResults analyzing /> : hasResults ? <PopulatedResults rkey={rkey} /> : <EmptyResults />}
        </Card>
      </div>

      <Card padding={0} style={{ marginTop: 16, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border)' }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600 }}>Study History</h2>
        </div>
        <DataTable columns={['Date', 'Equipment', 'Characteristic', '%GR&R', 'NDC', 'Verdict', '']}
          rows={GRR_HISTORY.map(r => [
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>{r.date}</span>,
            <span style={{ fontFamily: 'var(--font-mono)' }}>{r.eq}</span>, r.char,
            <span style={{ fontFamily: 'var(--font-mono)', color: r.grr > 30 ? 'var(--color-critical)' : r.grr > 10 ? 'var(--color-warning)' : 'var(--color-success)' }}>{r.grr}%</span>,
            <span style={{ fontFamily: 'var(--font-mono)' }}>{r.ndc}</span>, <VerdictBadge v={r.verdict} />,
            <Button variant="ghost" size="sm" icon={<Icon name="ChevronRight" size={14} />} />,
          ])} />
      </Card>
    </div>
  );
}

function DataTable({ columns, rows, align = [], rowKeys = null, exiting = [] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr>{columns.map((c, i) => (
        <th key={i} style={{ textAlign: align[i] || 'left', padding: '12px 20px', fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap' }}>{c}</th>
      ))}</tr></thead>
      <tbody>
        {rows.map((row, ri) => {
          const key = rowKeys ? rowKeys[ri] : ri;
          const isExiting = exiting.includes(key);
          return (
            <tr key={key} className="arad-table-row" style={{ transition: 'background var(--transition)', animation: isExiting ? 'arad-row-out .4s var(--ease-out) forwards' : 'none' }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ textAlign: align[ci] || 'left', padding: '14px 20px', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--color-text)', borderBottom: ri < rows.length - 1 ? '1px solid var(--color-border)' : 'none', whiteSpace: 'nowrap' }}>{cell}</td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

Object.assign(window, { GRRStudies, DataTable, VerdictBadge });
