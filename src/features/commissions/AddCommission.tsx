import { useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import type { Cadence } from '../../data/store';
import { RULES } from '../../engine/rules';
import { addCommission, freeHoursToday } from './commissions';

const CADENCES: [Cadence, string][] = [['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly']];

export function AddCommission({ cadence: initial, onDone }: { cadence: Cadence; onDone: () => void }) {
  const [title, setTitle] = useState('');
  const [cadence, setCadence] = useState<Cadence>(initial);
  const [hours, setHours] = useState(1);
  const [steps, setSteps] = useState<string[]>([]);
  const [step, setStep] = useState('');
  const [repeat, setRepeat] = useState(false);
  const free = freeHoursToday();
  const over = cadence === 'daily' && hours > free;

  const addStep = () => { if (step.trim()) { setSteps([...steps, step.trim()]); setStep(''); } };
  const save = () => { if (title.trim() && !over && addCommission(title, cadence, hours, steps, repeat)) onDone(); };

  return (
    <div className="form">
      <span className="label">New commission</span>
      <input className="field" placeholder="What needs to get done?" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} autoFocus />
      <div className="seg">
        {CADENCES.map(([c, label]) => <button key={c} className={cadence === c ? 'on' : ''} onClick={() => setCadence(c)}>{label}</button>)}
      </div>

      <label>
        <span className="label">Time credits · +{RULES.commissionExp[cadence]} EXP</span>
        <div className="stepper">
          <button aria-label="Less time" onClick={() => setHours(Math.max(0.5, hours - 0.5))}><Minus size={16} /></button>
          <b>{hours}h</b>
          <button aria-label="More time" onClick={() => setHours(Math.min(12, hours + 0.5))}><Plus size={16} /></button>
        </div>
        {cadence === 'daily' && <small className={`hint ${over ? 'warn' : ''}`}>{over ? `Only ${free}h left in today's Time Bank` : `${free}h free today`}</small>}
      </label>

      <label>
        <span className="label">Steps (optional)</span>
        {steps.map((s, i) => (
          <span key={i} className="step-chip">{s}<button aria-label="Remove step" onClick={() => setSteps(steps.filter((_, j) => j !== i))}><X size={12} /></button></span>
        ))}
        <div className="step-add">
          <input className="field" placeholder="Add a step" value={step} onChange={(e) => setStep(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addStep()} maxLength={50} />
          <button className="btn" onClick={addStep} disabled={!step.trim()}>Add</button>
        </div>
      </label>

      <div className="seg">
        <button className={!repeat ? 'on' : ''} onClick={() => setRepeat(false)}>One time</button>
        <button className={repeat ? 'on' : ''} onClick={() => setRepeat(true)}>Repeats every {cadence === 'daily' ? 'day' : cadence === 'weekly' ? 'week' : 'month'}</button>
      </div>

      <button className="btn primary" disabled={!title.trim() || over} onClick={save}>Add commission</button>
    </div>
  );
}
