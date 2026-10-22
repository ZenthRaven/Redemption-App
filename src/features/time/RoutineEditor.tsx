import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { useData } from '../../data/store';
import { TIME_CATS } from './categories';
import { setRoutine } from './timebank';

// Synced categories (learning, projects, quests, leisure) fill themselves; the routine covers the rest.
const ROUTINE_CATS = TIME_CATS.filter((c) => !['learning', 'projects', 'quests'].includes(c.id));

export function RoutineEditor({ onDone, cta }: { onDone: () => void; cta: string }) {
  const saved = useData((s) => s.timebank.template);
  const [hours, setHours] = useState<Record<string, number>>(() => Object.fromEntries(saved.map((r) => [r.cat, r.hours])));
  const total = Object.values(hours).reduce((a, b) => a + b, 0);
  const step = (cat: string, d: number) => setHours((h) => ({ ...h, [cat]: Math.max(0, Math.min(16, (h[cat] ?? 0) + d)) }));

  return (
    <div className="form routine">
      <ul className="routine-list">
        {ROUTINE_CATS.map((c) => (
          <li key={c.id} className={hours[c.id] ? 'on' : ''}>
            <c.icon size={15} strokeWidth={1.5} style={{ color: c.color }} />
            <span>{c.name}</span>
            <button aria-label={`Less ${c.name}`} onClick={() => step(c.id, -0.5)}><Minus size={13} /></button>
            <b>{hours[c.id] ?? 0}h</b>
            <button aria-label={`More ${c.name}`} onClick={() => step(c.id, 0.5)}><Plus size={13} /></button>
          </li>
        ))}
      </ul>
      <p className={`hint ${total > 24 ? 'warn' : ''}`}>{total}h of routine · {24 - total}h left for everything else</p>
      <button
        className="btn primary"
        disabled={total > 24}
        onClick={() => { setRoutine(ROUTINE_CATS.filter((c) => hours[c.id]).map((c) => ({ cat: c.id, hours: hours[c.id] }))); onDone(); }}
      >{cta}</button>
    </div>
  );
}
