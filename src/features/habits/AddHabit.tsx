import { useState } from 'react';
import { ArrowLeft, ShieldCheck, TrendingDown } from 'lucide-react';
import type { Habit } from '../../data/store';
import { dayKey, fmtDay } from '../../engine/time';
import { addBad, addGood, zeroDay, type NewBad } from './habits';
import { LIBRARY, type LibHabit } from './library';

export function AddGood({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('');
  const [time, setTime] = useState('');
  return (
    <div className="form">
      <span className="label">New good habit</span>
      <input className="field" placeholder="e.g. Morning run, Read 20 pages" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus />
      <label><span className="label">Daily reminder time (optional)</span>
        <input className="field" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </label>
      <button className="btn primary" disabled={!name.trim()} onClick={() => { addGood(name, time); onDone(); }}>Add habit</button>
    </div>
  );
}

const CUSTOM: LibHabit = { id: '', name: '', mode: 'cold', quotes: [], tips: [], swap: '' };

/** Library first; picking an entry auto-configures the tracker. Custom habits ask one question. */
export function AddBad({ onDone }: { onDone: () => void }) {
  const [pick, setPick] = useState<LibHabit | null>(null);
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'wean' | 'cold'>('cold');
  const [unit, setUnit] = useState('times');
  const [baseline, setBaseline] = useState('');

  const choose = (l: LibHabit) => { setPick(l); setName(l.name); setMode(l.mode); setUnit(l.unit ?? 'times'); setBaseline(String(l.baseline ?? '')); };

  if (!pick) {
    return (
      <div className="form">
        <span className="label">Bad-habit library</span>
        <div className="lib-grid">
          {LIBRARY.map((l) => (
            <button key={l.id} onClick={() => choose(l)}>
              <b>{l.name}</b>
              <small>{l.mode === 'wean' ? <><TrendingDown size={11} /> Step down</> : <><ShieldCheck size={11} /> Quit</>}</small>
            </button>
          ))}
          <button className="custom" onClick={() => choose(CUSTOM)}><b>Something else</b><small>Custom habit</small></button>
        </div>
      </div>
    );
  }

  const base = parseFloat(baseline);
  const draft: NewBad = {
    name: name.trim(), mode, libId: pick.id || undefined, unit: mode === 'wean' ? unit.trim() || 'times' : undefined,
    baseline: mode === 'wean' ? base : undefined, stepPct: pick.stepPct ?? 0.15, stepDays: pick.stepDays ?? 4,
  };
  const valid = draft.name && (mode === 'cold' || base > 0);
  const zero = mode === 'wean' && base > 0 ? zeroDay({ ...draft, createdDay: dayKey() } as Habit) : null;

  return (
    <div className="form">
      <button className="label back" onClick={() => setPick(null)}><ArrowLeft size={14} /> Library</button>
      {pick.id ? <h3 className="lib-title">{pick.name}</h3> : (
        <input className="field" placeholder="Name the habit" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus />
      )}

      {!pick.id && (
        <label><span className="label">Cut it out immediately, or step down gradually?</span>
          <div className="seg">
            <button className={mode === 'cold' ? 'on' : ''} onClick={() => setMode('cold')}>Cut out now</button>
            <button className={mode === 'wean' ? 'on' : ''} onClick={() => setMode('wean')}>Step down</button>
          </div>
        </label>
      )}

      {mode === 'wean' ? (
        <>
          <label><span className="label">How much on a typical day?</span>
            <div className="step-add">
              <input className="field" inputMode="decimal" placeholder="0" value={baseline} onChange={(e) => setBaseline(e.target.value.replace(/[^\d.]/g, ''))} />
              {pick.id ? <span className="unit">{unit}</span> : <input className="field" placeholder="unit" value={unit} onChange={(e) => setUnit(e.target.value)} maxLength={16} />}
            </div>
          </label>
          {zero && <p className="plan">Your allowance drops {Math.round((draft.stepPct ?? 0.15) * 100)}% of this every {draft.stepDays} days and reaches zero by <b>{fmtDay(zero)}</b>.</p>}
        </>
      ) : (
        <p className="plan">A clean-streak timer starts now. Log a slip honestly if it happens: you'll get a reality check and a 2-minute urge exercise, and the timer restarts.</p>
      )}

      {pick.tips.length > 0 && <p className="plan dim">Tips: {pick.tips.join(' · ')}</p>}
      <button className="btn primary" disabled={!valid} onClick={() => { addBad(draft); onDone(); }}>Start tracking</button>
    </div>
  );
}
