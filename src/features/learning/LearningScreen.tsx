import { useState } from 'react';
import { ArrowLeft, Check, ExternalLink, Lock, Plus, RotateCcw, Trash2, Trophy, BookOpen } from 'lucide-react';
import { Sheet } from '../../components/Sheet';
import { useData, type LearningCommit } from '../../data/store';
import { DAY, dayKey, fmtDay, now, parseDay } from '../../engine/time';
import { go } from '../../router';
import { CommitForm } from './CommitForm';
import { EndCommitment } from './EndCommitment';
import { LEARN_RULES, dayNumber, endDate, logSession, makeUp, pendingMakeUps, removeCommit, sessionCount } from './learning';
import './learning.css';

const lastDays = (n: number) => Array.from({ length: n }, (_, i) => dayKey(now() - (n - 1 - i) * DAY));

export function LearningScreen() {
  const learning = useData((s) => s.learning);
  const [adding, setAdding] = useState(false);
  const [ending, setEnding] = useState<LearningCommit | null>(null);

  const active = learning.filter((l) => l.status === 'active');
  const archived = learning.filter((l) => l.status !== 'active');
  const totalMin = learning.reduce((a, l) => a + Object.values(l.sessions).reduce((x, y) => x + y, 0), 0);
  const weekAgo = dayKey(now() - 6 * DAY);
  const thisWeek = learning.reduce((a, l) => a + Object.keys(l.sessions).filter((d) => d >= weekAgo).length, 0);

  return (
    <div className="screen fade-in">
      <div className="mod-top"><button className="label" onClick={() => go('/')}><ArrowLeft size={14} /> HUD</button></div>
      <span className="label">Module 06 · Ironclad commitments</span>
      <h1 className="display mod-title">Learning</h1>

      <div className="stat-row">
        <div><span className="label">Active</span><b>{active.length}</b><small>locked commits</small></div>
        <div><span className="label">This week</span><b>{thisWeek}</b><small>sessions</small></div>
        <div><span className="label">All time</span><b>{Math.round((totalMin / 60) * 10) / 10}h</b><small>learned</small></div>
      </div>

      <button className="btn add-btn" onClick={() => setAdding(true)}><Plus size={14} /> Commit to learning</button>
      {active.length === 0 && <p className="quiet">Pick one skill, a time of day and a length. Once you commit, there's no delete button until you finish.</p>}

      <div className="commits">
        {active.map((l) => <CommitCard key={l.id} l={l} onEnd={() => setEnding(l)} />)}
      </div>

      {archived.length > 0 && (
        <>
          <h2 className="label sub-h">Finished & broken</h2>
          <ul className="entries">
            {archived.map((l) => (
              <li key={l.id}>
                <span>{l.endedAt ? fmtDay(l.endedAt) : ''}</span>
                <span className="entry-note">{l.status === 'completed' ? <Trophy size={13} className="gold" /> : <RotateCcw size={13} />} {l.skill}</span>
                <b>{sessionCount(l)} sessions</b>
                <button aria-label="Delete" onClick={() => removeCommit(l.id)}><Trash2 size={14} /></button>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="rules">
        <span className="label">The contract</span>
        <p>+{LEARN_RULES.sessionExp} EXP per session; finishing the commitment pays a bonus of {LEARN_RULES.completionExpPerDay} EXP per session attended. A missed session puts {LEARN_RULES.missExp} EXP in the Redemption Vault, and a make-up session wins it back at 1.5×. Ending early costs {LEARN_RULES.breakLeisure} Leisure Coins. A Medical Pause appears only when your health check-ins from the last few days show you're unwell.</p>
      </div>

      <Sheet open={adding} onClose={() => setAdding(false)}><CommitForm onDone={() => setAdding(false)} /></Sheet>
      <Sheet open={!!ending} onClose={() => setEnding(null)}>{ending && <EndCommitment l={ending} onDone={() => setEnding(null)} />}</Sheet>
    </div>
  );
}

function CommitCard({ l, onEnd }: { l: LearningCommit; onEnd: () => void }) {
  const today = dayKey();
  const end = endDate(l);
  const n = Math.max(1, dayNumber(l));
  const doneToday = !!l.sessions[today];
  const pausedToday = l.paused.includes(today);
  const makeUps = pendingMakeUps(l);
  const total = l.days ?? null;

  return (
    <article className="commit frame">
      <i className="tick tl" /><i className="tick tr" /><i className="tick bl" /><i className="tick br" />
      <header>
        <div>
          <h3>{l.skill}</h3>
          <span className="mode-tag"><Lock size={11} /> {l.time} · {l.minutes} min · {total ? `until ${fmtDay(end!)}` : 'indefinite'}</span>
        </div>
      </header>

      <div className="commit-progress">
        <span className="display">Day {n}<small>{total ? ` / ${total}` : ''}</small></span>
        <span className="label">{sessionCount(l)} sessions</span>
      </div>
      {total && <div className="bar"><div className="bar-fill" style={{ width: `${Math.min(100, (n / total) * 100)}%` }} /></div>}

      <div className="dots learn-dots">
        {lastDays(14).map((d) => (
          <i key={d} title={d} className={
            l.sessions[d] ? 'on' : l.paused.includes(d) ? 'paused' : d < l.startDate || d >= today ? 'pre' : 'miss'
          } />
        ))}
      </div>

      {pausedToday ? (
        <p className="paused-note">Medical pause today. Rest; the quota waits for you.</p>
      ) : (
        <button className={`btn ${doneToday ? 'done-btn' : 'primary'}`} disabled={doneToday} onClick={() => logSession(l.id)}>
          {doneToday ? <><Check size={14} /> Today's session done</> : `Log today's session · ${l.minutes} min`}
        </button>
      )}

      {makeUps.length > 0 && (
        <button className="btn makeup" onClick={() => makeUp(l.id)}>
          <RotateCcw size={14} /> Make-up session · win back {Math.round(LEARN_RULES.missExp * 1.5)} EXP ({makeUps.length} missed)
        </button>
      )}

      {l.resources.length > 0 && (
        <ul className="resources">
          {l.resources.map((r) => (
            <li key={r.id}>
              {r.url
                ? <a href={r.url} target="_blank" rel="noreferrer"><ExternalLink size={12} /> {r.title}</a>
                : <span><BookOpen size={12} /> {r.title}</span>}
            </li>
          ))}
        </ul>
      )}

      <button className="link end-link" onClick={onEnd}>End commitment</button>
      <span className="started">Started {fmtDay(l.startDate)} · {Math.round((parseDay(today) - parseDay(l.startDate)) / DAY)} days ago</span>
    </article>
  );
}
