/* Arad UI Kit — AI Assistant: animated chat, typing indicator, streamed sections, chip typing. */

const SUGGESTED = ['Why is CMM-001 failing?', 'Show me trends this week', 'Which equipment needs review?'];

const CANNED = {
  default: { text: "Here's what I'm seeing across your quality data right now:", blocks: [
    { h: 'Open SPC violations', items: ['CMM-001 · Bore Diameter — 3 points above UCL (Rule 1)', 'CMM-002 · Hole Position — 1 point above UCL (Rule 1)'] },
    { h: 'Recommendation', p: 'Prioritize CMM-001 — the upward drift suggests progressive tool wear. Halt the run before the next lot.' },
  ] },
  'Why is CMM-001 failing?': { text: 'CMM-001 has the highest open risk on the floor. Breakdown:', blocks: [
    { h: 'Signal', items: ['3 points breaching UCL (10.030) over the last 8 subgroups', 'Latest reading 10.042 — 0.012 above the limit', 'Most recent GR&R: %GR&R 23.4%, NDC 4 (Conditional)'] },
    { h: 'Likely cause', p: 'Repeatability (EV 18.1%) dominates the gauge error, and the trend is monotonic upward — classic progressive boring-tool wear rather than operator variation.' },
    { h: 'Next step', p: 'Re-seat the touch probe stylus and verify the tool offset, then re-run a short confirmation study.' },
  ] },
  'Show me trends this week': { text: 'Week-over-week, quality is improving on aggregate but two cells are drifting:', blocks: [
    { h: 'Improving', items: ['Alert accuracy 96.0% → 97.3% (+1.3 pts)', 'Avg study time 1.5h → 1.2h', 'Resolved reviews up 18%'] },
    { h: 'Watch', p: 'CMM-001 bore diameter and CMM-002 hole position are both trending toward their upper limits — schedule preventive maintenance this week.' },
  ] },
  'Which equipment needs review?': { text: 'Three gauges currently warrant manager review, ordered by risk:', blocks: [
    { h: 'Priority', items: ['G-118 · Thread Pitch — %GR&R 31.7% (Fail, NDC 2)', 'CMM-002 · Hole Position — %GR&R 28.9% (overdue)', 'CMM-001 · Bore Diameter — %GR&R 23.4% (Conditional)'] },
    { h: 'Recommendation', p: 'Reject G-118 outright — NDC of 2 cannot discriminate parts. The other two are borderline and need your judgment.' },
  ] },
};

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '4px 0' }}>
      {[0, 1, 2].map(i => <span key={i} style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--color-secondary)', animation: `arad-typing 1.2s ${i * 0.15}s infinite` }} />)}
    </div>
  );
}

function AIMessage({ data, typing }) {
  const ts = new Date().toTimeString().slice(0, 8);
  return (
    <div style={{ display: 'flex', gap: 12, maxWidth: '80%', animation: 'arad-reveal-up-sm .3s var(--ease-out)' }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
        <Icon name="Sparkles" size={15} color="var(--color-secondary)" />
      </div>
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: '3px solid var(--color-secondary)', borderRadius: '0 var(--radius-lg) var(--radius-lg) var(--radius-lg)', padding: '14px 16px' }}>
        {typing ? <TypingDots /> : <>
          <p className="arad-reveal-sm" style={{ '--d': '0ms', margin: '0 0 12px', fontFamily: 'var(--font-sans)', fontSize: 14.5, lineHeight: 1.55, color: 'var(--color-text)' }}>{data.text}</p>
          {data.blocks.map((b, i) => (
            <div key={i} className="arad-reveal-sm" style={{ '--d': (120 + i * 150) + 'ms', marginBottom: i < data.blocks.length - 1 ? 12 : 0 }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 6 }}>{b.h}</div>
              {b.items ? <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {b.items.map((it, j) => <li key={j} style={{ display: 'flex', gap: 8, fontFamily: 'var(--font-sans)', fontSize: 14, lineHeight: 1.5, color: 'var(--color-text-secondary)' }}><span style={{ color: 'var(--color-secondary)', flex: 'none' }}>▸</span><span>{it}</span></li>)}
              </ul> : <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 14, lineHeight: 1.55, color: 'var(--color-text-secondary)' }}>{b.p}</p>}
            </div>
          ))}
          <div className="arad-reveal-sm" style={{ '--d': (120 + data.blocks.length * 150) + 'ms', marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>{ts}</div>
        </>}
      </div>
    </div>
  );
}

function UserMessage({ text }) {
  const ts = new Date().toTimeString().slice(0, 8);
  return (
    <div style={{ alignSelf: 'flex-end', maxWidth: '70%', animation: 'arad-reveal-up .25s var(--ease-out)' }}>
      <div style={{ background: 'linear-gradient(180deg, #1E3A8A, #1E40AF)', border: '1px solid rgba(59,130,246,.4)', borderRadius: 'var(--radius-lg) 0 var(--radius-lg) var(--radius-lg)', padding: '12px 16px', fontFamily: 'var(--font-sans)', fontSize: 14.5, color: '#fff', lineHeight: 1.5 }}>{text}</div>
      <div style={{ textAlign: 'right', marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>{ts}</div>
    </div>
  );
}

function ContextCard({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: 'var(--color-surface-inset)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
      <Icon name={icon} size={16} color="var(--color-text-muted)" />
      <span style={{ flex: 1, fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--color-text-secondary)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{value}</span>
    </div>
  );
}

function Assistant({ seedQuestion }) {
  const [messages, setMessages] = useState([{ role: 'user', text: 'Give me a status check on the floor.' }, { role: 'ai', data: CANNED.default }]);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState('');
  const [focus, setFocus] = useState(false);
  const [spin, setSpin] = useState(false);
  const [chips, setChips] = useState(['GR&R Studies', 'SPC Violations']);
  const [typingIn, setTypingIn] = useState(false);
  const scrollRef = useRef(null);
  const typeTimer = useRef(null);

  const send = (text) => {
    if (!text.trim()) return;
    setInput(''); setSpin(true); setTimeout(() => setSpin(false), 450);
    setMessages(m => [...m, { role: 'user', text }]);
    setTyping(true);
    setTimeout(() => { setTyping(false); setMessages(m => [...m, { role: 'ai', data: CANNED[text] || CANNED.default }]); }, 1300);
  };

  const typeInto = (text, autoSend = true) => {
    clearTimeout(typeTimer.current); setTypingIn(true); setInput('');
    let i = 0;
    const tick = () => {
      i++; setInput(text.slice(0, i));
      if (i < text.length) typeTimer.current = setTimeout(tick, 22);
      else { setTypingIn(false); if (autoSend) setTimeout(() => send(text), 280); }
    };
    typeTimer.current = setTimeout(tick, 120);
  };

  useEffect(() => { if (seedQuestion) typeInto(seedQuestion); /* eslint-disable-next-line */ }, [seedQuestion]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, typing]);

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
      <div style={{ width: 280, flex: 'none', borderRight: '1px solid var(--color-border)', background: 'var(--color-surface)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>System Context</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ContextCard icon="ChartColumn" label="Recent GR&R" value="12" />
          <ContextCard icon="TriangleAlert" label="Open Violations" value="3" />
          <ContextCard icon="ClipboardCheck" label="Pending Reviews" value="4" />
        </div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginTop: 4 }}>Suggested</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SUGGESTED.map(q => <SuggestChip key={q} label={q} onClick={() => typeInto(q)} />)}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {messages.map((m, i) => m.role === 'user' ? <UserMessage key={i} text={m.text} /> : <AIMessage key={i} data={m.data} />)}
          {typing && <AIMessage typing data={{}} />}
        </div>

        <div style={{ borderTop: '1px solid var(--color-border)', padding: '16px 32px 12px', background: 'var(--color-surface)' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            {chips.map(c => <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px 4px 10px', background: 'var(--color-secondary-soft)', border: '1px solid rgba(99,102,241,.35)', borderRadius: 999, fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500, color: 'var(--color-purple-text)' }}>
              {c}<button onClick={() => setChips(cs => cs.filter(x => x !== c))} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0, color: 'var(--color-purple-text)' }}><Icon name="X" size={12} /></button>
            </span>)}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1, position: 'relative', borderRadius: 'var(--radius-md)', boxShadow: focus ? 'var(--ring-focus)' : '0 0 0 0 transparent', transition: 'box-shadow .2s var(--ease-out)' }}>
              <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
                placeholder={typingIn ? '' : 'Ask about quality data…'} rows={1}
                style={{ width: '100%', resize: 'none', padding: '12px 14px', background: 'var(--color-surface-inset)', border: `1px solid ${focus ? 'var(--color-primary)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', color: 'var(--color-text)', fontFamily: 'var(--font-sans)', fontSize: 14.5, outline: 'none', maxHeight: 120, boxSizing: 'border-box', transition: 'border-color .2s' }}
                onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} />
              {typingIn && <span style={{ position: 'absolute', left: 14 + (input.length * 7.2), top: 13, width: 1.5, height: 18, background: 'var(--color-primary)', animation: 'arad-fade-in .5s infinite alternate' }} />}
            </div>
            <SendButton spin={spin} active={!!input.trim()} onClick={() => send(input)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, justifyContent: 'center' }}>
            <Icon name="Sparkles" size={11} color="var(--color-text-muted)" />
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--color-text-muted)' }}>Powered by Gemini · responses may be inexact</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SuggestChip({ label, onClick }) {
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setPress(false); }} onMouseDown={() => setPress(true)} onMouseUp={() => setPress(false)}
      style={{ textAlign: 'left', padding: '10px 12px', background: 'transparent', border: `1px solid ${hover ? 'var(--color-secondary)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 13.5, color: hover ? 'var(--color-text)' : 'var(--color-text-secondary)', transition: 'all var(--transition)', transform: press ? 'scale(.96)' : hover ? 'scale(1.02)' : 'scale(1)' }}>
      {label}
    </button>
  );
}

function SendButton({ spin, active, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ width: 44, height: 44, flex: 'none', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', background: 'linear-gradient(180deg,#3B82F6,#2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: active ? 1 : 0.7, transition: 'opacity .2s, filter .15s', filter: hover ? 'brightness(1.1)' : 'none' }}>
      <Icon name="ArrowUp" size={18} color="#fff" style={{ transform: spin ? 'rotate(360deg)' : (hover && active ? 'translateY(-2px)' : 'none'), transition: spin ? 'transform .45s var(--ease-out)' : 'transform .15s var(--ease-out)' }} />
    </button>
  );
}

Object.assign(window, { Assistant });
