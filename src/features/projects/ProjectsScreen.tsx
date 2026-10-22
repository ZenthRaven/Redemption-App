import { useState } from 'react';
import { ArrowLeft, Check, Flag, Plus, Trash2, Trophy, X } from 'lucide-react';
import { Sheet } from '../../components/Sheet';
import { useData, type Project } from '../../data/store';
import { DAY, dayKey, daysUntil, fmtDay, now } from '../../engine/time';
import { go } from '../../router';
import { ProjectForm } from './ProjectForm';
import {
  P_RULES, addMilestone, completeProject, hoursTotal, logWork, nextMilestone, progressOf,
  removeMilestone, removeProject, setProgress, toggleMilestone,
} from './projects';
import './projects.css';

const h1 = (n: number) => `${Math.round(n * 10) / 10}h`;

function deadlinePill(p: Project) {
  const d = daysUntil(p.deadline);
  const cls = d < 0 ? 's-overdue' : d <= 2 ? 's-2d' : d <= 7 ? 's-5d' : d <= 14 ? 's-10d' : '';
  return <span className={`pill ${cls}`}>{d < 0 ? `${-d}d late` : d === 0 ? 'Due today' : `${d} days left`}</span>;
}

export function ProjectsScreen() {
  const projects = useData((s) => s.projects);
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const active = projects.filter((p) => p.status === 'active').sort((a, b) => a.deadline.localeCompare(b.deadline));
  const done = projects.filter((p) => p.status === 'done');
  const perDay = active.reduce((a, p) => a + p.hoursPerDay, 0);
  const weekAgo = dayKey(now() - 6 * DAY);
  const week = projects.reduce((a, p) => a + Object.entries(p.worked).filter(([d]) => d >= weekAgo).reduce((x, [, h]) => x + h, 0), 0);

  return (
    <div className="screen fade-in">
      <div className="mod-top"><button className="label" onClick={() => go('/')}><ArrowLeft size={14} /> HUD</button></div>
      <span className="label">Module 08 · Build your own things</span>
      <h1 className="display mod-title">Projects</h1>

      <div className="stat-row">
        <div><span className="label">Active</span><b>{active.length}</b><small>projects</small></div>
        <div><span className="label">Budget</span><b>{h1(perDay)}</b><small>per day</small></div>
        <div><span className="label">This week</span><b>{h1(week)}</b><small>worked</small></div>
      </div>

      <button className="btn add-btn" onClick={() => setAdding(true)}><Plus size={14} /> New project</button>
      {active.length === 0 && <p className="quiet">Add a project, give it a daily time budget, a deadline and a few milestones.</p>}

      <div className="projects">
        {active.map((p) => <ProjectCard key={p.id} p={p} open={open === p.id} onToggle={() => setOpen(open === p.id ? null : p.id)} />)}
      </div>

      {done.length > 0 && (
        <>
          <h2 className="label sub-h">Shipped · {done.length}</h2>
          <ul className="entries">
            {done.map((p) => (
              <li key={p.id}>
                <span>{p.doneAt ? fmtDay(p.doneAt) : ''}</span>
                <span className="entry-note"><Trophy size={13} className="gold" /> {p.name}</span>
                <b>{h1(hoursTotal(p))}</b>
                <button aria-label="Delete" onClick={() => removeProject(p.id)}><Trash2 size={14} /></button>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="rules">
        <span className="label">Project rewards</span>
        <p>+{P_RULES.workExp} EXP the first time you log work each day · +{P_RULES.milestoneExp} per milestone · +{P_RULES.completeExp} when you finish, +{P_RULES.onTimeBonus} more if it's on time. A milestone past its due date puts {P_RULES.overdueMilestoneExp} EXP in the Redemption Vault; finishing it within the grace window wins it back at 1.5×. Logged hours go into the Time Bank.</p>
      </div>

      <Sheet open={adding} onClose={() => setAdding(false)}><ProjectForm onDone={() => setAdding(false)} /></Sheet>
    </div>
  );
}

function ProjectCard({ p, open, onToggle }: { p: Project; open: boolean; onToggle: () => void }) {
  const [ms, setMs] = useState('');
  const [msDue, setMsDue] = useState('');
  const pct = progressOf(p);
  const today = p.worked[dayKey()] ?? 0;
  const next = nextMilestone(p);

  return (
    <article className="project frame">
      <button className="project-head" onClick={onToggle}>
        <div>
          <h3>{p.name}</h3>
          <span className="mode-tag">Due {fmtDay(p.deadline)} · {h1(p.hoursPerDay)}/day</span>
        </div>
        {deadlinePill(p)}
      </button>

      <div className="project-progress">
        <div className="bar"><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
        <b>{pct}%</b>
      </div>

      <div className="today-work">
        <span><b>{h1(today)}</b> / {h1(p.hoursPerDay)} today</span>
        <div>
          <button onClick={() => logWork(p.id, 0.5)}>+30m</button>
          <button onClick={() => logWork(p.id, 1)}>+1h</button>
          {p.hoursPerDay > today && <button className="fill" onClick={() => logWork(p.id, p.hoursPerDay - today)}>Done for today</button>}
        </div>
      </div>

      {next && !open && (
        <p className="next-ms"><Flag size={12} /> Next: {next.title}{next.due ? ` · ${fmtDay(next.due)}` : ''}{next.vaultId && next.vaultId !== 'waived' ? ' · overdue' : ''}</p>
      )}

      {open && (
        <div className="project-detail fade-in">
          {p.description && <p className="plan">{p.description}</p>}
          <span className="label">Milestones</span>
          {p.milestones.length === 0 && (
            <label className="manual">
              <span className="plan dim">No milestones: set progress by hand</span>
              <input type="range" min={0} max={100} step={5} value={p.progress} onChange={(e) => setProgress(p.id, +e.target.value)} />
            </label>
          )}
          <ul className="ms-list">
            {p.milestones.map((m) => {
              const late = !m.done && m.due && daysUntil(m.due) < 0;
              return (
                <li key={m.id} className={`${m.done ? 'done' : ''} ${late ? 'late' : ''}`}>
                  <button className="step-box" aria-label={m.done ? 'Reopen' : 'Complete'} onClick={() => toggleMilestone(p.id, m.id)}>{m.done && <Check size={11} strokeWidth={3} />}</button>
                  <span>{m.title}{m.due && <small>{late ? 'overdue · ' : ''}{fmtDay(m.due)}</small>}</span>
                  <button className="icon-btn" aria-label="Remove milestone" onClick={() => removeMilestone(p.id, m.id)}><X size={13} /></button>
                </li>
              );
            })}
          </ul>
          <div className="ms-add">
            <input className="field" placeholder="Add a milestone" value={ms} onChange={(e) => setMs(e.target.value)} maxLength={50} />
            <input className="field date-mini" type="date" value={msDue} onChange={(e) => setMsDue(e.target.value)} aria-label="Milestone due date" />
            <button className="btn" disabled={!ms.trim()} onClick={() => { addMilestone(p.id, ms, msDue); setMs(''); setMsDue(''); }}>Add</button>
          </div>
          <p className="plan dim">{h1(hoursTotal(p))} worked in total · started {fmtDay(p.createdDay)}</p>
          <div className="project-actions">
            <button className="btn" onClick={() => confirm(`Mark "${p.name}" as complete?`) && completeProject(p.id)}><Trophy size={14} /> Complete project</button>
            <button className="icon-btn" aria-label="Delete project" onClick={() => confirm(`Delete "${p.name}"?`) && removeProject(p.id)}><Trash2 size={16} /></button>
          </div>
        </div>
      )}
    </article>
  );
}
