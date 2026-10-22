import { useEffect, useState } from 'react';
import type { Habit } from '../../data/store';
import { logSlip } from './habits';
import { TRIGGERS, libById, pickQuote } from './library';

const PHASES: [string, number][] = [['Breathe in', 4], ['Hold', 4], ['Breathe out', 6]];
const CYCLE = PHASES.reduce((a, [, s]) => a + s, 0);

/** Reality check + 2-minute urge surfing. For quit habits it also records the slip and its trigger. */
export function RealityCheck({ h, slip, onDone }: { h: Habit; slip: boolean; onDone: () => void }) {
  const [quote] = useState(() => pickQuote(h.libId));
  const [surfing, setSurfing] = useState(false);
  const [left, setLeft] = useState(120);
  const [trigger, setTrigger] = useState<string>();

  useEffect(() => {
    if (!surfing || left <= 0) return;
    const id = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(id);
  }, [surfing, left]);

  const t = (120 - left) % CYCLE;
  const phase = t < 4 ? 0 : t < 8 ? 1 : 2;
  const lib = libById(h.libId);

  return (
    <div className="form reality">
      <span className="label">{slip ? 'Reality check' : `Over today's allowance · ${h.name}`}</span>
      <p className="reality-quote">“{quote}”</p>

      {surfing ? (
        <div className="surf">
          <div className={`breath p${phase}`}><span>{left > 0 ? PHASES[phase][0] : 'Done'}</span></div>
          <p className="plan">{left > 0 ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')} · the urge peaks and fades. Just watch it.` : 'You rode it out. The urge passed without you.'}</p>
        </div>
      ) : (
        <button className="btn" onClick={() => setSurfing(true)}>Ride the urge · 2 minutes</button>
      )}

      {lib && <p className="plan dim">Instead: {lib.swap}</p>}

      {slip ? (
        <>
          <span className="label">What triggered it?</span>
          <div className="chips-row">
            {TRIGGERS.map((x) => <button key={x} className={trigger === x ? 'on' : ''} onClick={() => setTrigger(trigger === x ? undefined : x)}>{x}</button>)}
          </div>
          <button className="btn primary" onClick={() => { logSlip(h.id, trigger); onDone(); }}>Log the slip · restart timer</button>
          <button className="btn" onClick={onDone}>I resisted it</button>
        </>
      ) : (
        <button className="btn primary" onClick={onDone}>Back to it</button>
      )}
    </div>
  );
}
