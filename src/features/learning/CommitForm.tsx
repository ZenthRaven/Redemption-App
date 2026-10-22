import { useState } from 'react';
import { Lock, Minus, Plus, X } from 'lucide-react';
import { DAY, dayKey, fmtDay, now } from '../../engine/time';
import { LEARN_RULES, commit } from './learning';

const LENGTHS: [number | null, string][] = [[3, '3d'], [7, '7d'], [21, '21d'], [30, '30d'], [90, '90d'], [null, '∞']];

export function CommitForm({ onDone }: { onDone: () => void }) {
  const [skill, setSkill] = useState('');
  const [time, setTime] = useState('20:00');
  const [minutes, setMinutes] = useState(30);
  const [days, setDays] = useState<number | null>(21);
  const [res, setRes] = useState<{ title: string; url?: string }[]>([]);
  const [resText, setResText] = useState('');
  const [sure, setSure] = useState(false);

  const addRes = () => {
    const t = resText.trim();
    if (!t) return;
    const isUrl = /^https?:\/\//i.test(t);
    setRes([...res, isUrl ? { title: t.replace(/^https?:\/\/(www\.)?/i, '').slice(0, 40), url: t } : { title: t }]);
    setResText('');
  };
  const until = days ? fmtDay(dayKey(now() + (days - 1) * DAY)) : null;
  const valid = skill.trim() && time && (days === null || days >= LEARN_RULES.minDays);

  return (
    <div className="form">
      <span className="label">New learning commitment</span>
      <input className="field" placeholder="What will you learn?" value={skill} onChange={(e) => setSkill(e.target.value)} maxLength={40} autoFocus />
      <div className="two">
        <label><span className="label">Daily time</span><input className="field" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
        <label><span className="label">Session</span>
          <div className="stepper">
            <button aria-label="Shorter" onClick={() => setMinutes(Math.max(15, minutes - 15))}><Minus size={14} /></button>
            <b>{minutes}m</b>
            <button aria-label="Longer" onClick={() => setMinutes(Math.min(240, minutes + 15))}><Plus size={14} /></button>
          </div>
        </label>
      </div>
      <label><span className="label">Commit for</span>
        <div className="seg">
          {LENGTHS.map(([d, label]) => <button key={label} className={days === d ? 'on' : ''} onClick={() => setDays(d)}>{label}</button>)}
        </div>
      </label>

      <label><span className="label">Resources (links, books, notes)</span>
        {res.map((r, i) => (
          <span key={i} className="step-chip">{r.title}<button aria-label="Remove" onClick={() => setRes(res.filter((_, j) => j !== i))}><X size={12} /></button></span>
        ))}
        <div className="step-add">
          <input className="field" placeholder="Paste a link or name a book" value={resText} onChange={(e) => setResText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addRes()} />
          <button className="btn" onClick={addRes} disabled={!resText.trim()}>Add</button>
        </div>
      </label>

      <div className="contract">
        <Lock size={14} />
        <p>{until ? <>No delete button until <b>{until}</b>.</> : <>This commitment has <b>no end date</b>.</>} Ending early costs {LEARN_RULES.breakLeisure} Leisure Coins.</p>
      </div>
      <label className="agree"><input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} /> I'm committing to this</label>

      <button className="btn primary" disabled={!valid || !sure} onClick={() => { commit({ skill: skill.trim(), time, minutes, days, resources: res }); onDone(); }}>Lock it in</button>
    </div>
  );
}
