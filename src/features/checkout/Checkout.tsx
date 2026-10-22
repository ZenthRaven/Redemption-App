import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Plus } from 'lucide-react';
import { daySpends, fmtMoney, isOpen, useData } from '../../data/store';
import { levelInfo, RULES } from '../../engine/rules';
import { hoursUsed, useGame } from '../../engine/store';
import { dayKey } from '../../engine/time';
import { go } from '../../router';
import { useUI } from '../../ui';
import { categoryById } from '../finance/categories';
import { completeCommission, reopenCommission } from '../commissions/commissions';
import { toggleGood } from '../habits/habits';
import { BodyMap } from '../health/BodyMap';
import { MoodCheck } from '../health/MoodCheck';
import { setZone, todayBody } from '../health/health';
import { DayBar } from '../time/TimeScreen';
import { catById, catOf } from '../time/categories';
import './checkout.css';

export const CHECKOUT_EXP = 10;
const STEPS = ['Spending', 'Quests & habits', 'Body & mind', 'Your 24 hours', 'Rewards'];

/** The 2-minute Nightly Check-Out: one swipe-through flow, ending in the day's reward tally. */
export function Checkout() {
  const [i, setI] = useState(0);
  const last = i === STEPS.length - 1;
  return (
    <div className="screen checkout fade-in">
      <div className="mod-top">
        <button className="label" onClick={() => (i ? setI(i - 1) : go('/'))}><ArrowLeft size={14} /> {i ? 'Back' : 'HUD'}</button>
        <span className="label">{i + 1} / {STEPS.length}</span>
      </div>
      <div className="co-progress">{STEPS.map((s, j) => <i key={s} className={j <= i ? 'on' : ''} />)}</div>
      <span className="label">Nightly check-out</span>
      <h1 className="display co-title">{STEPS[i]}</h1>

      <div key={i} className="fade-in">
        {i === 0 && <SpendStep />}
        {i === 1 && <QuestStep />}
        {i === 2 && <BodyStep />}
        {i === 3 && <TimeStep />}
        {i === 4 && <RewardStep />}
      </div>

      {!last && <button className="btn primary co-next" onClick={() => setI(i + 1)}>Looks right · next</button>}
    </div>
  );
}

function SpendStep() {
  const d = useData();
  const today = daySpends(d);
  const total = today.reduce((a, x) => a + x.amount, 0);
  return (
    <>
      <p className="plan">Anything you paid for today that isn't here yet?</p>
      <div className="co-big"><b>{fmtMoney(total, d.currency)}</b><span>spent today</span></div>
      <ul className="entries">
        {today.map((s) => <li key={s.id}><span>{categoryById(s.category).name}</span><span className="entry-note">{s.note ?? ''}</span><b>{fmtMoney(s.amount, d.currency)}</b><span /></li>)}
      </ul>
      <button className="btn add-btn" style={{ marginTop: 12 }} onClick={() => useUI.getState().open('spend')}><Plus size={14} /> Add a spend</button>
    </>
  );
}

function QuestStep() {
  const { commissions, habits } = useData();
  const today = dayKey();
  const quests = commissions.filter((c) => (c.cadence === 'daily' && c.period === today && !c.missed) || (c.comeback && isOpen(c)));
  const good = habits.filter((h) => h.kind === 'good');
  return (
    <>
      <p className="plan">Tick off anything you finished today.</p>
      {quests.length + good.length === 0 && <p className="quiet">No daily quests or habits yet.</p>}
      <ul className="co-checks">
        {quests.map((q) => (
          <li key={q.id} className={q.done ? 'done' : ''} onClick={() => (q.done ? reopenCommission(q.id) : completeCommission(q.id))}>
            <i>{q.done && <Check size={13} strokeWidth={3} />}</i><span>{q.title}</span><small>Quest</small>
          </li>
        ))}
        {good.map((h) => {
          const done = h.doneDays.includes(today);
          return (
            <li key={h.id} className={done ? 'done' : ''} onClick={() => toggleGood(h.id)}>
              <i>{done && <Check size={13} strokeWidth={3} />}</i><span>{h.name}</span><small>Habit</small>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function BodyStep() {
  const gender = useData((s) => s.health.gender ?? 'male');
  useData((s) => s.health.body);
  return (
    <>
      <p className="plan">Tap how each part feels, then a quick mood check.</p>
      <div className="co-body"><BodyMap gender={gender} values={todayBody()?.zones ?? {}} onSet={setZone} /></div>
      <MoodCheck />
    </>
  );
}

function TimeStep() {
  const time = useGame((s) => s.time);
  const entries = time[dayKey()] ?? [];
  const free = RULES.dailyHours - hoursUsed({ time });
  return (
    <>
      <p className="plan">Your routine and synced hours. Anything missing? Log it in the Time Bank.</p>
      <div className="co-big"><b>{Math.round(free * 10) / 10}h</b><span>unaccounted</span></div>
      <DayBar entries={entries} />
      <ul className="co-time">
        {entries.map((a) => <li key={a.id}><i style={{ background: catById(catOf(a)).color }} />{a.source === 'template' || a.source === 'manual' ? catById(catOf(a)).name : a.label}<b>{Math.round(a.hours * 10) / 10}h</b></li>)}
      </ul>
      <button className="link" onClick={() => go('/m/time')}>Open the Time Bank</button>
    </>
  );
}

/** Count up from 0 to `to` over `ms`. */
function useCountUp(to: number, ms = 1200) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      setV(Math.round(to * (1 - (1 - k) ** 3)));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return v;
}

function RewardStep() {
  const g = useGame();
  const checkouts = useData((s) => s.checkouts);
  const today = dayKey();
  const claimed = checkouts.includes(today);
  const entries = g.log.filter((e) => dayKey(e.t) === today && e.delta);
  const sum = (f: (x: NonNullable<(typeof entries)[number]['delta']>) => number | undefined) => entries.reduce((a, e) => a + (f(e.delta!) ?? 0), 0);
  const exp = sum((x) => x.exp);
  const coins = { f: sum((x) => (x.coin === 'f' ? x.coins : 0)), h: sum((x) => (x.coin === 'h' ? x.coins : 0)), l: sum((x) => (x.coin === 'l' ? x.coins : 0)) };
  const leisure = sum((x) => x.leisure);
  const expUp = useCountUp(exp);
  const lv = levelInfo(g.exp);
  const [burst, setBurst] = useState(false);

  const claim = () => {
    useData.setState((s) => ({ checkouts: [...s.checkouts, today] }));
    g.gainExp(CHECKOUT_EXP, 'Nightly check-out');
    setBurst(true);
    setTimeout(() => go('/'), 1600);
  };

  return (
    <div className="rewards">
      <div className={`reward-orb ${burst ? 'burst' : ''}`}>
        <span className="label">Today</span>
        <b>{expUp >= 0 ? '+' : ''}{expUp}</b>
        <span className="label">EXP</span>
        {burst && Array.from({ length: 14 }, (_, k) => <i key={k} style={{ ['--a' as string]: `${(k / 14) * 360}deg` }} />)}
      </div>
      <div className="reward-coins">
        {([['F', 'var(--f-coin)', coins.f], ['H', 'var(--h-coin)', coins.h], ['L', 'var(--l-coin)', coins.l], ['Leisure', 'var(--leisure)', leisure]] as const).map(([k, c, v]) => (
          <div key={k}><i style={{ background: c }} /><span className="label">{k}</span><b>{v >= 0 ? '+' : ''}{v}</b></div>
        ))}
      </div>
      <div className="reward-level">
        <span className="label">Level {lv.level} · {lv.into} / {lv.need} EXP</span>
        <div className="bar"><div className="bar-fill" style={{ width: `${lv.pct * 100}%` }} /></div>
      </div>
      <p className="plan reward-note">{exp > 0 ? 'Consistency beats perfection. See you tomorrow.' : 'A quiet day still counts. Tomorrow is a fresh board.'}</p>
      <button className="btn primary" disabled={claimed} onClick={claim}>{claimed ? <><Check size={14} /> Claimed today</> : `Claim · +${CHECKOUT_EXP} EXP`}</button>
    </div>
  );
}
