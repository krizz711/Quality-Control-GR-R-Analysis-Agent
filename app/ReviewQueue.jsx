/* Arad UI Kit — Review Queue: table (row hover, action fade) + decision drawer (approve/reject, row collapse). */

const REVIEW_ROWS = [
  { key: 'CMM-001', eq: 'CMM-001', char: 'Bore Diameter', grr: 23.4, ndc: 4, submitted: '06-08', assignee: 'D. Karam', due: '06-10', overdue: false },
  { key: 'G-118', eq: 'G-118', char: 'Thread Pitch', grr: 31.7, ndc: 2, submitted: '06-04', assignee: 'M. Reyes', due: '06-07', overdue: true },
  { key: 'OPT-204', eq: 'OPT-204', char: 'Surface Flatness', grr: 12.1, ndc: 5, submitted: '06-08', assignee: 'D. Karam', due: '06-11', overdue: false },
  { key: 'LMS-07', eq: 'LMS-07', char: 'Bore Diameter', grr: 14.6, ndc: 5, submitted: '06-05', assignee: 'A. Singh', due: '06-09', overdue: false },
  { key: 'CMM-002', eq: 'CMM-002', char: 'Hole Position', grr: 28.9, ndc: 3, submitted: '06-03', assignee: 'M. Reyes', due: '06-06', overdue: true },
  { key: 'PRB-12', eq: 'PRB-12', char: 'Roundness', grr: 9.8, ndc: 8, submitted: '06-08', assignee: 'A. Singh', due: '06-12', overdue: false },
];

function grrColor(g) { return g > 30 ? 'var(--color-critical)' : g > 10 ? 'var(--color-warning)' : 'var(--color-success)'; }
function ndcTone(n) { return n >= 5 ? 'pass' : n >= 2 ? 'conditional' : 'fail'; }

function DrawerSection({ children, delay }) {
  return <div className="arad-reveal-sm" style={{ '--d': delay + 'ms' }}>{children}</div>;
}

function ReviewDrawer({ row, onClose, onSubmit }) {
  const [decision, setDecision] = useState(null);
  const [notes, setNotes] = useState('');
  const [shown, setShown] = useState(false);
  const [closing, setClosing] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShown(true), 20); return () => clearTimeout(t); }, []);
  const close = () => { setClosing(true); setShown(false); setTimeout(onClose, 260); };
  const submit = () => { onSubmit(row.key, decision); };
  if (!row) return null;
  const open = shown && !closing;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50 }}>
      <div onClick={close} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,8,.5)', backdropFilter: 'blur(2px)', opacity: open ? 1 : 0, transition: 'opacity .26s var(--ease-out)' }} />
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 480, background: 'var(--color-surface)', borderLeft: '1px solid var(--color-border)', boxShadow: 'var(--shadow-drawer)', display: 'flex', flexDirection: 'column', transform: open ? 'translateX(0)' : 'translateX(480px)', transition: 'transform .3s cubic-bezier(.32,.72,0,1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 600, color: 'var(--color-text)' }}>{row.eq}</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--color-text-secondary)' }}>{row.char}</div>
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={close} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--color-text-secondary)' }}><Icon name="X" size={16} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 22, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <DrawerSection delay={60}><div style={{ display: 'flex', gap: 10 }}>
            <MetricPill value={`${row.grr}%`} label="%GR&R" tone={row.grr > 30 ? 'critical' : row.grr > 10 ? 'warning' : 'success'} />
            <MetricPill value={row.ndc} label="NDC" tone={row.ndc >= 5 ? 'success' : row.ndc >= 2 ? 'warning' : 'critical'} />
            <MetricPill value={row.submitted} label="Submitted" />
          </div></DrawerSection>
          <DrawerSection delay={160}><div style={{ borderLeft: '3px solid var(--color-secondary)', background: 'var(--color-surface-inset)', borderRadius: '0 var(--radius-md) var(--radius-md) 0', padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Icon name="Sparkles" size={15} color="var(--color-secondary)" />
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600 }}>AI Analysis</span>
              <Badge tone={row.grr > 30 ? 'fail' : 'conditional'} style={{ marginLeft: 'auto' }}>Risk: {row.grr > 30 ? 'High' : 'Medium'}</Badge>
            </div>
            <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 14, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
              %GR&R of <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}>{row.grr}%</span> with NDC <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}>{row.ndc}</span>. {row.grr > 30 ? 'Exceeds the 30% rejection threshold — the gauge cannot reliably discriminate parts. Recommend rejecting and re-qualifying the instrument.' : 'Above the 10% target but acceptable for non-critical characteristics. Manager judgment required.'}
            </p>
          </div></DrawerSection>
          <DrawerSection delay={260}><div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 8 }}>Decision</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              {[['approve', 'Approve', 'var(--color-success)', 'Check'], ['reject', 'Reject', 'var(--color-critical)', 'X']].map(([id, label, color, icon]) => {
                const sel = decision === id, dimmed = decision && !sel;
                return (
                  <button key={id} onClick={() => setDecision(id)} style={{ flex: 1, height: 42, border: `1px solid ${sel ? color : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, transition: 'all var(--transition)',
                    background: sel ? (id === 'approve' ? 'rgba(16,185,129,.14)' : 'rgba(239,68,68,.14)') : 'transparent', color: sel ? color : 'var(--color-text-muted)', opacity: dimmed ? 0.4 : 1, boxShadow: sel ? `0 0 0 1px ${color}, 0 0 16px -2px ${color}` : 'none' }}>
                    <Icon name={icon} size={16} />{label}
                  </button>
                );
              })}
            </div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add review notes…" rows={3} className="arad-focus-ring" style={{ width: '100%', padding: 12, background: 'var(--color-surface-inset)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', fontFamily: 'var(--font-sans)', fontSize: 14, resize: 'vertical', boxSizing: 'border-box', outline: 'none' }} />
          </div></DrawerSection>
          <DrawerSection delay={360}><div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 10 }}>Audit Trail</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[['Submitted by system', row.submitted + ' 09:14'], ['Assigned to ' + row.assignee, row.submitted + ' 09:15'], ['AI narrative generated', row.submitted + ' 09:15']].map(([txt, time], i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--color-border-strong)', flex: 'none' }} />
                  <span style={{ flex: 1, fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--color-text-secondary)' }}>{txt}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)' }}>{time}</span>
                </div>
              ))}
            </div>
          </div></DrawerSection>
        </div>
        <div style={{ padding: 18, borderTop: '1px solid var(--color-border)', display: 'flex', gap: 10 }}>
          <Button variant="ghost" onClick={close} style={{ flex: 'none' }}>Cancel</Button>
          <Button variant={decision === 'reject' ? 'destructive' : 'primary'} disabled={!decision} onClick={submit} style={{ flex: 1, opacity: decision ? 1 : 0.4 }}>{decision === 'reject' ? 'Submit Rejection' : decision === 'approve' ? 'Submit Approval' : 'Select a decision'}</Button>
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ r, onReview, exiting }) {
  return (
    <tr className={'arad-table-row' + (exiting ? ' arad-collapse-row' : '')}>
      <td style={tdS}><span style={{ fontFamily: 'var(--font-mono)' }}>{r.eq}</span></td>
      <td style={tdS}>{r.char}</td>
      <td style={tdS}><span style={{ fontFamily: 'var(--font-mono)', color: grrColor(r.grr) }}>{r.grr}%</span></td>
      <td style={tdS}><Badge tone={ndcTone(r.ndc)}>{r.ndc}</Badge></td>
      <td style={tdS}><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>{r.submitted}</span></td>
      <td style={tdS}>{r.assignee}</td>
      <td style={tdS}>{r.overdue ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-mono)', color: 'var(--color-critical)' }}><Icon name="TriangleAlert" size={13} color="var(--color-critical)" />{r.due}</span> : <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>{r.due}</span>}</td>
      <td style={tdS}>{r.overdue ? <Badge tone="critical">Overdue</Badge> : <Badge tone="info" variant="outline">Pending</Badge>}</td>
      <td style={{ ...tdS, textAlign: 'right' }}>
        <div className="arad-row-actions" style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <Button variant="secondary" size="sm" onClick={() => onReview(r)}>Review</Button>
          <Button variant="ghost" size="sm" icon={<Icon name="Ellipsis" size={15} />} />
        </div>
      </td>
    </tr>
  );
}
const tdS = { padding: '14px 20px', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--color-text)', borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap' };

function ReviewQueue({ onResolve }) {
  const [tab, setTab] = useState('Pending');
  const [drawer, setDrawer] = useState(null);
  const [rows, setRows] = useState(REVIEW_ROWS);
  const [exiting, setExiting] = useState([]);
  const [resolved, setResolved] = useState(127);
  const tabs = ['All', 'Pending', 'Approved', 'Rejected'];
  const tabRef = useRef({});
  const [ind, setInd] = useState({ left: 0, width: 0 });
  useEffect(() => { const el = tabRef.current[tab]; if (el) setInd({ left: el.offsetLeft, width: el.offsetWidth }); }, [tab]);
  useEffect(() => window.AradBus.on('review-open', () => setDrawer(rows.find(r => !r.overdue) || rows[0])), [rows]); // eslint-disable-line

  const handleSubmit = (key, decision) => {
    setDrawer(d => d ? { ...d, _closing: true } : d);
    setExiting(e => [...e, key]);
    setTimeout(() => { setDrawer(null); }, 280);
    setTimeout(() => {
      setRows(rs => rs.filter(r => r.key !== key));
      setExiting(e => e.filter(k => k !== key));
      setResolved(n => n + 1);
      onResolve && onResolve();
      toast(decision === 'approve'
        ? { type: 'success', title: 'Study approved', msg: `${key} accepted · audit entry recorded` }
        : { type: 'error', title: 'Study rejected', msg: `${key} rejected · re-qualification requested` });
    }, 440);
  };

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <PageHeader title="Review Queue"
        actions={<div style={{ position: 'relative', display: 'flex', background: 'var(--color-surface-inset)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 3 }}>
          <div style={{ position: 'absolute', top: 3, bottom: 3, left: ind.left, width: ind.width, background: 'var(--color-surface-elevated)', borderRadius: 4, boxShadow: 'var(--shadow-sm)', transition: 'left .2s var(--ease-out), width .2s var(--ease-out)' }} />
          {tabs.map(t => <button key={t} ref={el => tabRef.current[t] = el} onClick={() => setTab(t)} style={{ position: 'relative', height: 30, padding: '0 14px', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, background: 'transparent', color: tab === t ? 'var(--color-text)' : 'var(--color-text-muted)', transition: 'color .2s' }}>{t}</button>)}
        </div>} />

      <div style={{ display: 'flex', gap: 20, marginBottom: 16, fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--color-text-secondary)' }}>
        <span><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)', fontWeight: 600 }}>{rows.filter(r => !r.overdue).length + 8}</span> Pending</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-critical)', fontWeight: 600 }}>{rows.filter(r => r.overdue).length}</span> Overdue</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span><span key={resolved} style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-success)', fontWeight: 600, display: 'inline-block', animation: 'arad-count-bounce .4s var(--ease-out)' }}>{resolved}</span> Resolved this month</span>
      </div>

      <Card padding={0} style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Equipment', 'Characteristic', '%GR&R', 'NDC', 'Submitted', 'Assigned', 'Due', 'Status', ''].map((c, i) => (
            <th key={i} style={{ textAlign: i === 8 ? 'right' : 'left', padding: '12px 20px', fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap' }}>{c}</th>
          ))}</tr></thead>
          <tbody>
            {rows.map(r => <ReviewRow key={r.key} r={r} onReview={setDrawer} exiting={exiting.includes(r.key)} />)}
          </tbody>
        </table>
        {rows.length === 0 && <div style={{ padding: 40, textAlign: 'center', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--color-text-muted)' }}>All caught up — no pending reviews.</div>}
      </Card>

      {drawer && <ReviewDrawer row={drawer} onClose={() => setDrawer(null)} onSubmit={handleSubmit} />}
    </div>
  );
}

Object.assign(window, { ReviewQueue });
