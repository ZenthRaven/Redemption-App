import { useState } from 'react';
import { ArrowLeft, Check, Flame, Minus, Plus, ShieldCheck, Trash2, TrendingDown } from 'lucide-react';
import { Sheet } from '../../components/Sheet';
import { useData, type Habit } from '../../data/store';
import { DAY, dayKey, fmtDay, fmtLeft, now } from '../../engine/time';
import { go } from '../../router';
import { AddBad, AddGood } from './AddHabit';
import { H_RULES, allowance, cleanMs, logCount, nextMilestone, removeHabit, streak, toggleGood, zeroDay } from './habits';
import { libById, pickQuote } from './library';
import { RealityCheck } from './RealityCheck';
import './habits.css';

const lastDays = (n: number) => Array.from({ length: n }, (_, i) => dayKey(now() - (n - 1 - i) * DAY));

export function HabitsScreen() {
  const habits = useData((s) => s.habits);
  const [tab, setTab] = useState<'good' | 'bad'>('good');
  const [adding, setAdding] = useState(false);
  const [check, setCheck] = useState<{ h: Habit; slip: boolean } | null>(null);

  const good = habits.filter((h) => h.kind === 'good');
  const bad = habits.filter((h) => h.kind === 'bad');
  const doneToday = good.filter((h) => h.doneDays.includes(dayKey())).length;
  const best = Math.max(0, ...good.map(streak));
  const cleanBest = Math.max(0, ...bad.filter((h) => h.mode === 'cold').map((h) => Math.floor(cleanMs(h) / DAY)));
  const underToday = bad.filter((h) => h.mode === 'wean' && (h.counts[dayKey()] ?? 0) <= allowance(h)).length;
  const weans = bad.filter((h) => h.mode === 'wean').length;

  return (
    <div className="screen fade-in">
      <div className="mod-top"><button className="label" onClick={() => go('/')}><ArrowLeft size={14} /> HUD</button></div>
      <span className="label">Module 03 · Build the good, starve the bad</span>
      <h1 className="display mod-title">Habits</h1>

      <div className="tabs">
        <button className={tab === 'good' ? 'on' : ''} onClick={() => setTab('good')}>Build · {good.length}</button>
        <button className={tab === 'bad' ? 'on' : ''} onClick={() => setTab('bad')}>Break · {bad.length}</button>
      </div>

      {tab === 'good' ? (
        <>
          <div className="board-head">
            <div><span className="label">Today</span><div className="display board-count">{doneToday}<span>/{good.length}</span></div></div>
            <div className="board-meta"><span><Flame size={12} /> best streak {best}d</span><span>+{H_RULES.goodCheck} H per check-in</span></div>
          </div>
          <button className="btn add-btn" onClick={() => setAdding(true)}><Plus size={14} /> Add good habit</button>
          {good.length === 0 && <p className="quiet">Start with one small daily practice. Consistency matters more than size.</p>}
          <ul className="habit-list">{good.map((h) => <GoodRow key={h.id} h={h} />)}</ul>
        </>
      ) : (
        <>
          <div className="board-head">
            <div><span className="label">Longest clean streak</span><div className="display board-count">{cleanBest}<span>d</span></div></div>
            <div className="board-meta">{weans > 0 && <span>{underToday}/{weans} under allowance today</span>}<span>H-Coins paid at day end</span></div>
          </div>
          <button className="btn add-btn" onClick={() => setAdding(true)}><Plus size={14} /> Add bad habit</button>
          {bad.length === 0 && <p className="quiet">Pick a habit from the library. It sets up the right tracker, reality checks and tips for you.</p>}
          <div className="bad-list">
            {bad.map((h) => (h.mode === 'wean'
              ? <WeanCard key={h.id} h={h} onOver={() => setCheck({ h, slip: false })} />
              : <ColdCard key={h.id} h={h} onSlip={() => setCheck({ h, slip: true })} />))}
          </div>
        </>
      )}

      <div className="rules">
        <span className="label">Earning H-Coins</span>
        <p>Good habit: +{H_RULES.goodCheck} per check-in, +{H_RULES.goodStreakBonus} every {H_RULES.goodStreakEvery}-day streak. Step-down habits: +{H_RULES.withinAllowance} each day within the allowance, +{H_RULES.reducedVsYesterday} when lower than the day before. Quit habits: +{H_RULES.cleanDay} per clean day, +{H_RULES.milestone} at 3, 7, 14, 30, 60, 90 days and beyond.</p>
      </div>

      <Sheet open={adding} onClose={() => setAdding(false)}>
        {tab === 'good' ? <AddGood onDone={() => setAdding(false)} /> : <AddBad onDone={() => setAdding(false)} />}
      </Sheet>
      <Sheet open={!!check} onClose={() => setCheck(null)}>
        {check && <RealityCheck h={check.h} slip={check.slip} onDone={() => setCheck(null)} />}
      </Sheet>
    </div>
  );
}

function GoodRow({ h }: { h: Habit }) {
  const [open, setOpen] = useState(false);
  const done = h.doneDays.includes(dayKey());
  const s = streak(h);
  return (
    <li className={`habit ${done ? 'done' : ''}`}>
      <div className="quest-row">
        <button className="check" aria-label={done ? 'Untick' : 'Done today'} onClick={() => toggleGood(h.id)}>{done && <Check size={16} strokeWidth={2.5} />}</button>
        <button className="quest-body" onClick={() => setOpen(!open)}>
          <span className="quest-title">{h.name}</span>
          <span className="quest-meta">{h.time ? `${h.time} daily` : 'Any time'}{s > 0 && <><Flame size={11} className="flame" /> {s}d</>}</span>
        </button>
      </div>
      {open && (
        <div className="habit-detail fade-in">
          <div className="dots">{lastDays(14).map((d) => <i key={d} className={h.doneDays.includes(d) ? 'on' : d < h.createdDay ? 'pre' : ''} title={d} />)}</div>
          <span className="label">Last 14 days</span>
          <button className="icon-btn" aria-label="Delete habit" onClick={() => confirm(`Delete ${h.name}?`) && removeHabit(h.id)}><Trash2 size={15} /></button>
        </div>
      )}
    </li>
  );
}

function WeanCard({ h, onOver }: { h: Habit; onOver: () => void }) {
  const today = h.counts[dayKey()] ?? 0;
  const cap = allowance(h);
  const over = today > cap;
  const step = h.unit === 'minutes' || (h.unit ?? '').startsWith('min') ? 10 : 1;
  const lib = libById(h.libId);
  const days = lastDays(14);
  const peak = Math.max(1, h.baseline ?? 1, ...days.map((d) => h.counts[d] ?? 0));
  const add = (n: number) => { if (logCount(h.id, n)) onOver(); };

  return (
    <article className={`bad-card frame ${over ? 'over' : ''}`}>
      <header>
        <div><h3>{h.name}</h3><span className="mode-tag"><TrendingDown size={11} /> Step down · {cap} {h.unit}/day now</span></div>
        <button className="icon-btn" aria-label="Delete habit" onClick={() => confirm(`Delete ${h.name}?`) && removeHabit(h.id)}><Trash2 size={15} /></button>
      </header>
      <p className="quote">“{pickQuote(h.libId, now() / 3600)}”</p>
      <div className="counter">
        <button aria-label="Less" onClick={() => add(-step)}><Minus size={18} /></button>
        <div><b className={over ? 'warn' : ''}>{today}</b><span> / {cap} {h.unit} today</span></div>
        <button aria-label="More" onClick={() => add(step)}><Plus size={18} /></button>
      </div>
      <div className="trend" aria-label="Last 14 days">
        {days.map((d) => {
          const c = h.counts[d];
          const a = allowance(h, d);
          return (
            <div key={d} className="trend-col" title={`${fmtDay(d)}: ${c ?? '—'} / ${a}`}>
              <i className="trend-cap" style={{ bottom: `${(a / peak) * 100}%` }} />
              <i className={`trend-bar ${c !== undefined && c > a ? 'over' : ''}`} style={{ height: `${((c ?? 0) / peak) * 100}%` }} />
            </div>
          );
        })}
      </div>
      <p className="bad-foot">Reaches zero by {fmtDay(zeroDay(h))}{lib ? ` · Tip: ${lib.tips[Math.floor(now() / DAY) % lib.tips.length]}` : ''}</p>
    </article>
  );
}

function ColdCard({ h, onSlip }: { h: Habit; onSlip: () => void }) {
  const ms = cleanMs(h);
  const days = Math.floor(ms / DAY);
  const next = nextMilestone(days);
  const lib = libById(h.libId);
  return (
    <article className="bad-card frame">
      <header>
        <div><h3>{h.name}</h3><span className="mode-tag"><ShieldCheck size={11} /> Quit · {h.slips.length} {h.slips.length === 1 ? 'slip' : 'slips'} logged</span></div>
        <button className="icon-btn" aria-label="Delete habit" onClick={() => confirm(`Delete ${h.name}?`) && removeHabit(h.id)}><Trash2 size={15} /></button>
      </header>
      <p className="quote">“{pickQuote(h.libId, now() / 3600)}”</p>
      <span className="label">Clean for</span>
      <div className="display clean-time">{days > 0 ? `${days}d ` : ''}{fmtLeft(ms % DAY)}</div>
      {next && (
        <>
          <div className="bar"><div className="bar-fill good" style={{ width: `${(ms / (next * DAY)) * 100}%` }} /></div>
          <p className="bad-foot">Next milestone: {next} days · +{H_RULES.milestone} H{lib ? ` · Instead: ${lib.swap}` : ''}</p>
        </>
      )}
      <button className="btn slip-btn" onClick={onSlip}>I slipped</button>
    </article>
  );
}
