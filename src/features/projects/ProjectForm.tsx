import { useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import { inDays } from '../../data/store';
import { fmtDay } from '../../engine/time';
import { addProject } from './projects';

export function ProjectForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [hours, setHours] = useState(1);
  const [deadline, setDeadline] = useState(inDays(30));
  const [ms, setMs] = useState<{ title: string; due?: string }[]>([]);
  const [msTitle, setMsTitle] = useState('');
  const [msDue, setMsDue] = useState('');

  const addMs = () => { if (msTitle.trim()) { setMs([...ms, { title: msTitle.trim(), due: msDue || undefined }]); setMsTitle(''); setMsDue(''); } };
  const valid = name.trim() && deadline;

  return (
    <div className="form">
      <span className="label">New project</span>
      <input className="field" placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus />
      <input className="field" placeholder="What is it? (optional)" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={120} />
      <div className="two">
        <label><span className="label">Daily time budget</span>
          <div className="stepper">
            <button aria-label="Less" onClick={() => setHours(Math.max(0.5, hours - 0.5))}><Minus size={14} /></button>
            <b>{hours}h</b>
            <button aria-label="More" onClick={() => setHours(Math.min(8, hours + 0.5))}><Plus size={14} /></button>
          </div>
        </label>
        <label><span className="label">Deadline</span><input className="field" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></label>
      </div>
      <label><span className="label">Milestones</span>
        {ms.map((m, i) => (
          <span key={i} className="step-chip">{m.title}{m.due ? ` · ${fmtDay(m.due)}` : ''}<button aria-label="Remove" onClick={() => setMs(ms.filter((_, j) => j !== i))}><X size={12} /></button></span>
        ))}
        <div className="ms-add">
          <input className="field" placeholder="Milestone" value={msTitle} onChange={(e) => setMsTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addMs()} maxLength={50} />
          <input className="field date-mini" type="date" value={msDue} onChange={(e) => setMsDue(e.target.value)} aria-label="Milestone due date" />
          <button className="btn" onClick={addMs} disabled={!msTitle.trim()}>Add</button>
        </div>
      </label>
      <button className="btn primary" disabled={!valid} onClick={() => { addProject({ name: name.trim(), description: description.trim() || undefined, hoursPerDay: hours, deadline, milestones: ms }); onDone(); }}>Start project</button>
    </div>
  );
}
