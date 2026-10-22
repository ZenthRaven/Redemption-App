import { useState } from 'react';
import { ArrowLeft, Link2, Minus, Plus, Settings2, X } from 'lucide-react';
import { Sheet } from '../../components/Sheet';
import { useData } from '../../data/store';
import { RULES } from '../../engine/rules';
import { hoursUsed, useGame, type Allocation } from '../../engine/store';
import { dayKey, parseDay } from '../../engine/time';
import { go } from '../../router';
import { TIME_CATS, catById, catOf, isSynced } from './categories';
import { RoutineEditor } from './RoutineEditor';
import { lastN, logTime, monthDays, report, shiftDay, type Report } from './timebank';
import './time.css';

const SYNC_FROM: Record<string, string> = { projects: 'Projects', learning: 'Learning', commissions: 'Quests', leisure: 'Leisure bought' };
const h1 = (n: number) => `${Math.round(n * 10) / 10}h`;

export function TimeScreen() {
  const applied = useData((s) => s.timebank.applied);
  const time = useGame((s) => s.time);
  const [tab, setTab] = useState<'today' | 'week' | 'month'>('today');
  const [sheet, setSheet] = useState<'log' | 'routine' | null>(null);

  const today = dayKey();
  const entries = time[today] ?? [];
  const free = RULES.dailyHours - hoursUsed({ time });

  return (
    <div className="screen fade-in">
      <div className="mod-top">
        <button className="label" onClick={() => go('/')}><ArrowLeft size={14} /> HUD</button>
        {applied && <button className="icon-btn" aria-label="Edit daily routine" onClick={() => setSheet('routine')}><Settings2 size={18} strokeWidth={1.5} /></button>}
      </div>
      <span className="label">Module 07 · Time is the currency</span>
      <h1 className="display mod-title">Time Bank</h1>

      {!applied ? (
        <div className="frame routine-setup">
          <i className="tick tl" /><i className="tick tr" /><i className="tick bl" /><i className="tick br" />
          <span className="label">Set your daily routine</span>
          <p className="plan">These hours pre-fill every day, so you only adjust what changed. Learning, projects and quests add their hours automatically.</p>
          <RoutineEditor onDone={() => undefined} cta="Start pre-filling my days" />
        </div>
      ) : (
        <>
          <div className="tabs">
            {(['today', 'week', 'month'] as const).map((t) => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t === 'today' ? 'Today' : t === 'week' ? 'This week' : 'This month'}</button>)}
          </div>

          {tab === 'today' ? (
            <>
              <div className="board-head">
                <div><span className="label">Free today</span><div className="display board-count time-free">{h1(free)}<span> / 24h</span></div></div>
                <div className="board-meta"><span>{h1(24 - free)} accounted for</span></div>
              </div>
              <DayBar entries={entries} />
              <button className="btn add-btn" style={{ marginTop: 18 }} onClick={() => setSheet('log')}><Plus size={14} /> Log time</button>
              <ul className="time-list">
                {entries.length === 0 && <p className="quiet">Nothing logged today yet.</p>}
                {[...entries].sort((a, b) => b.hours - a.hours).map((a) => <EntryRow key={a.id} a={a} free={free} />)}
              </ul>
            </>
          ) : (
            <ReportView r={report(tab === 'week' ? lastN(7) : monthDays())} prev={tab === 'week' ? report(lastN(7, shiftDay(today, -7))) : undefined} mode={tab} />
          )}
        </>
      )}

      <Sheet open={!!sheet} onClose={() => setSheet(null)}>
        {sheet === 'log' && <LogTime free={free} onDone={() => setSheet(null)} />}
        {sheet === 'routine' && <><span className="label">Daily routine</span><RoutineEditor onDone={() => setSheet(null)} cta="Save routine" /></>}
      </Sheet>
    </div>
  );
}

function DayBar({ entries }: { entries: Allocation[] }) {
  const by: Record<string, number> = {};
  entries.forEach((a) => { by[catOf(a)] = (by[catOf(a)] ?? 0) + a.hours; });
  const used = Object.values(by).reduce((x, y) => x + y, 0);
  return (
    <div className="timebar big">
      {TIME_CATS.filter((c) => by[c.id]).map((c) => <i key={c.id} style={{ flex: by[c.id], background: c.color }} title={`${c.name} ${h1(by[c.id])}`} />)}
      {used < 24 && <i className="timebar-free" style={{ flex: 24 - used }} />}
    </div>
  );
}

function EntryRow({ a, free }: { a: Allocation; free: number }) {
  const g = useGame.getState();
  const c = catById(catOf(a));
  const synced = isSynced(a);
  return (
    <li className="time-row">
      <i className="swatch" style={{ background: c.color }} />
      <c.icon size={16} strokeWidth={1.5} />
      <span className="time-name">{synced ? a.label : c.name}{synced && <small><Link2 size={10} /> from {SYNC_FROM[a.source]}</small>}</span>
      {synced ? <b>{h1(a.hours)}</b> : (
        <span className="time-ctl">
          <button aria-label="Less" onClick={() => (a.hours > 0.5 ? g.resize(a.id, a.hours - 0.5) : g.release(a.id))}><Minus size={13} /></button>
          <b>{h1(a.hours)}</b>
          <button aria-label="More" disabled={free < 0.5} onClick={() => g.resize(a.id, a.hours + 0.5)}><Plus size={13} /></button>
          <button aria-label="Remove" onClick={() => g.release(a.id)}><X size={13} /></button>
        </span>
      )}
    </li>
  );
}

function LogTime({ free, onDone }: { free: number; onDone: () => void }) {
  const [cat, setCat] = useState('family');
  const [hours, setHours] = useState(1);
  return (
    <div className="form">
      <span className="label">Log time · {h1(free)} free today</span>
      <div className="cat-pick">
        {TIME_CATS.filter((c) => !['learning', 'quests'].includes(c.id)).map((c) => (
          <button key={c.id} className={cat === c.id ? 'on' : ''} onClick={() => setCat(c.id)}>
            <c.icon size={18} strokeWidth={1.4} style={{ color: c.color }} /><span>{c.name}</span>
          </button>
        ))}
      </div>
      <div className="stepper">
        <button aria-label="Less time" onClick={() => setHours(Math.max(0.5, hours - 0.5))}><Minus size={16} /></button>
        <b>{h1(hours)}</b>
        <button aria-label="More time" onClick={() => setHours(Math.min(free, hours + 0.5))}><Plus size={16} /></button>
      </div>
      <button className="btn primary" disabled={hours > free || hours <= 0} onClick={() => { logTime(cat, hours); onDone(); }}>Log {h1(hours)} of {catById(cat).name.toLowerCase()}</button>
      <p className="plan dim">Learning sessions, project work and quests are added automatically from their modules.</p>
    </div>
  );
}

function ReportView({ r, prev, mode }: { r: Report; prev?: Report; mode: 'week' | 'month' }) {
  const cats = TIME_CATS.filter((c) => r.byCat[c.id]).sort((a, b) => r.byCat[b.id] - r.byCat[a.id]);
  const days = Math.max(1, r.tracked);
  const change = prev && prev.productive ? Math.round(((r.productive - prev.productive) / prev.productive) * 100) : null;

  return (
    <>
      <div className="board-head">
        <div><span className="label">Productive hours</span><div className="display board-count">{h1(r.productive)}</div></div>
        <div className="board-meta">
          <span>{h1(r.productive / days)} / day avg</span>
          {change !== null && <span className={change >= 0 ? 'up' : 'down'}>{change >= 0 ? '▲' : '▼'} {Math.abs(change)}% vs last week</span>}
          <span>{r.tracked} of {r.days.length} days tracked</span>
        </div>
      </div>

      <div className={`stack-chart ${mode}`}>
        {r.perDay.map((p) => (
          <div key={p.day} className="stack-col" title={`${p.day}: ${h1(p.total)}`}>
            <div className="stack">
              {TIME_CATS.filter((c) => p.byCat[c.id]).map((c) => <i key={c.id} style={{ height: `${(p.byCat[c.id] / 24) * 100}%`, background: c.color }} />)}
            </div>
            {mode === 'week' && <span>{new Date(parseDay(p.day)).toLocaleDateString('en-GB', { weekday: 'narrow' })}</span>}
          </div>
        ))}
      </div>

      <ul className="cat-totals">
        {cats.length === 0 && <p className="quiet">Nothing tracked in this period yet.</p>}
        {cats.map((c) => (
          <li key={c.id}>
            <c.icon size={15} strokeWidth={1.5} style={{ color: c.color }} />
            <span className="time-name">{c.name}{c.productive && <small>productive</small>}</span>
            <span className="avg">{h1(r.byCat[c.id] / days)}/day</span>
            <b>{h1(r.byCat[c.id])}</b>
            <i className="cat-share" style={{ width: `${(r.byCat[c.id] / r.total) * 100}%`, background: c.color }} />
          </li>
        ))}
      </ul>
    </>
  );
}
