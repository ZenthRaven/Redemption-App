import { useState } from 'react';
import { ArrowLeft, Check, Plus, Repeat, RotateCcw, Trash2 } from 'lucide-react';
import { Sheet } from '../../components/Sheet';
import { isOpen, useData, type Cadence, type Commission } from '../../data/store';
import { RULES } from '../../engine/rules';
import { DAY, dayKey, fmtDay, fmtLeft, monthName, now, parseDay, periodEnd, periodKey, weekStart } from '../../engine/time';
import { go } from '../../router';
import { AddCommission } from './AddCommission';
import { completeCommission, missPenalty, removeCommission, reopenCommission, reward, toggleSubtask } from './commissions';
import './commissions.css';

const TABS: [Cadence, string][] = [['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly']];

function periodLabel(c: Cadence) {
  if (c === 'daily') return new Date(now()).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short' });
  if (c === 'weekly') { const s = weekStart(); return `${fmtDay(s)} – ${fmtDay(dayKey(parseDay(s) + 6 * DAY))}`; }
  return monthName(periodKey('monthly'));
}

export function CommissionsScreen() {
  const all = useData((s) => s.commissions);
  const [tab, setTab] = useState<Cadence>('daily');
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const board = (c: Cadence) => all.filter((q) => q.cadence === c && (
    (q.period === periodKey(c) && !q.missed) || (q.comeback && isOpen(q))
  ));
  const list = board(tab).sort((a, b) => Number(a.done) - Number(b.done) || Number(b.comeback) - Number(a.comeback));
  const active = list.filter(isOpen);
  const done = list.filter((q) => q.done);
  const pct = list.length ? done.length / list.length : 0;
  const expLeft = active.reduce((a, q) => a + (q.comeback ? Math.round(missPenalty(q) * RULES.vaultMultiplier) : reward(q)), 0);

  return (
    <div className="screen fade-in">
      <div className="mod-top">
        <button className="label" onClick={() => go('/')}><ArrowLeft size={14} /> HUD</button>
      </div>
      <span className="label">Module 04 · Quest board</span>
      <h1 className="display mod-title">Commissions</h1>

      <div className="tabs">
        {TABS.map(([c, label]) => {
          const n = board(c).filter(isOpen).length;
          return <button key={c} className={tab === c ? 'on' : ''} onClick={() => setTab(c)}>{label}{n ? ` · ${n}` : ''}</button>;
        })}
      </div>

      <div className="board-head">
        <div>
          <span className="label">{periodLabel(tab)}</span>
          <div className="display board-count">{done.length}<span>/{list.length}</span></div>
        </div>
        <div className="board-meta">
          <span>ends in {fmtLeft(periodEnd(tab) - now())}</span>
          <span>+{expLeft} EXP on the table</span>
        </div>
      </div>
      <div className="bar"><div className="bar-fill" style={{ width: `${pct * 100}%` }} /></div>

      <button className="btn add-btn" style={{ marginTop: 18 }} onClick={() => setAdding(true)}><Plus size={14} /> Add commission</button>

      {list.length === 0 && <p className="quiet">No {tab} commissions yet. Break a goal into a quest you can finish this {tab === 'daily' ? 'day' : tab === 'weekly' ? 'week' : 'month'}.</p>}

      <ul className="quest-list">
        {list.map((q) => (
          <Quest key={q.id} q={q} open={open === q.id} onToggle={() => setOpen(open === q.id ? null : q.id)} />
        ))}
      </ul>

      <div className="rules">
        <span className="label">How commissions work</span>
        <p>Daily +{RULES.commissionExp.daily} · weekly +{RULES.commissionExp.weekly} · monthly +{RULES.commissionExp.monthly} EXP. Each quest costs Time Credits, and daily quests can't overbook today's 24h. A missed deadline moves {RULES.missPenaltyFactor}× the reward into the Redemption Vault. Reschedule it within {RULES.vaultGraceHours}h and finishing it wins the EXP back at {RULES.vaultMultiplier}×.</p>
      </div>

      <Sheet open={adding} onClose={() => setAdding(false)}>
        <AddCommission cadence={tab} onDone={() => setAdding(false)} />
      </Sheet>
    </div>
  );
}

function Quest({ q, open, onToggle }: { q: Commission; open: boolean; onToggle: () => void }) {
  const steps = q.subtasks.filter((s) => s.done).length;
  const gain = q.comeback ? Math.round(missPenalty(q) * RULES.vaultMultiplier) : reward(q);

  return (
    <li className={`quest ${q.done ? 'done' : ''} ${q.comeback ? 'comeback' : ''}`}>
      <div className="quest-row">
        <button
          className="check"
          aria-label={q.done ? 'Reopen' : 'Complete'}
          onClick={() => (q.done ? !q.comeback && reopenCommission(q.id) : completeCommission(q.id))}
        >
          {q.done && <Check size={16} strokeWidth={2.5} />}
        </button>
        <button className="quest-body" onClick={onToggle}>
          <span className="quest-title">{q.title}</span>
          <span className="quest-meta">
            {q.hours}h · +{gain} EXP{q.subtasks.length ? ` · ${steps}/${q.subtasks.length} steps` : ''}
            {q.repeat && <Repeat size={11} />}
          </span>
          {q.comeback && !q.done && (
            <span className="chip loss comeback-chip"><RotateCcw size={11} /> Comeback · 1.5× · {fmtLeft(q.deadline - now())} left</span>
          )}
        </button>
      </div>

      {open && (
        <div className="quest-detail fade-in">
          {q.subtasks.map((s) => (
            <button key={s.id} className={`step ${s.done ? 'done' : ''}`} onClick={() => !q.done && toggleSubtask(q.id, s.id)}>
              <i>{s.done && <Check size={11} strokeWidth={3} />}</i>{s.title}
            </button>
          ))}
          <div className="quest-actions">
            {q.done && !q.comeback && <button className="link" onClick={() => reopenCommission(q.id)}>Reopen (returns the EXP)</button>}
            <button className="icon-btn" aria-label="Delete commission" onClick={() => confirm(`Delete "${q.title}"?`) && removeCommission(q.id)}><Trash2 size={15} /></button>
          </div>
        </div>
      )}
    </li>
  );
}
