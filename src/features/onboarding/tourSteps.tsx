import type { ReactNode } from 'react';
import { inDays, useData } from '../../data/store';
import { addSpend, setSalary } from '../finance/wallet';
import { CATEGORIES } from '../finance/categories';
import { addLiability } from '../liabilities/liabilities';
import { addBad, addGood } from '../habits/habits';
import { LIBRARY } from '../habits/library';
import { addCommission } from '../commissions/commissions';
import { addEvent } from '../calendar/calendar';
import { commit } from '../learning/learning';
import { RoutineEditor } from '../time/RoutineEditor';
import { addProject } from '../projects/projects';
import { MoodCheck } from '../health/MoodCheck';
import { logWeight, setGender, setHeight } from '../health/health';
import { addDream } from '../life/life';
import { MiniList } from './MiniList';

type D = ReturnType<typeof useData.getState>;

export interface TourStep {
  id: string;
  title: string;
  why: string;
  min: number; // items needed before Next unlocks
  count: (d: D) => number;
  skip?: string; // label for an honest "doesn't apply to me" exit
  body: (d: D) => ReactNode;
}

const money = (d: D, n: number) => `${d.currency}${n.toLocaleString('en-US')}`;

// The 5-minute Full Tour: seed real items in every module so the HUD is alive on day one.
export const TOUR: TourStep[] = [
  {
    id: 'wallet', title: 'Wallet', min: 3,
    why: "Set this month's salary, then log two things you spent money on recently.",
    count: (d) => (d.wallet.salary ? 1 : 0) + Math.min(2, d.wallet.spends.length),
    body: (d) => (
      <>
        {!d.wallet.salary ? (
          <MiniList fields={[{ key: 'amt', placeholder: 'Monthly salary', type: 'number' }]} items={[]} addLabel="Set" onAdd={(v) => setSalary(parseFloat(v.amt))} />
        ) : <p className="plan">Salary set: <b>{money(d, d.wallet.salary)}</b></p>}
        <MiniList
          fields={[{ key: 'amt', placeholder: 'Amount', type: 'number' }, { key: 'cat', placeholder: 'Category', type: 'select', options: CATEGORIES.map((c) => [c.id, c.name]) }]}
          items={d.wallet.spends.slice(0, 6).map((s) => `${money(d, s.amount)} · ${CATEGORIES.find((c) => c.id === s.category)?.name}`)}
          onAdd={(v) => addSpend(parseFloat(v.amt), v.cat)}
        />
      </>
    ),
  },
  {
    id: 'liabilities', title: 'Liabilities', min: 2, skip: 'I have no loans or subscriptions',
    why: 'Loans, EMIs and subscriptions. You get reminders 10, 5 and 2 days before and the night before.',
    count: (d) => d.liabilities.length,
    body: (d) => (
      <MiniList
        fields={[
          { key: 'name', placeholder: 'Name (e.g. Netflix)' },
          { key: 'amt', placeholder: 'Amount', type: 'number' },
          { key: 'due', placeholder: 'Next due date', type: 'date', initial: inDays(10) },
          { key: 'kind', placeholder: 'Type', type: 'select', options: [['subscription', 'Subscription'], ['loan', 'Loan'], ['mortgage', 'Mortgage']] },
        ]}
        items={d.liabilities.map((l) => `${l.name} · ${money(d, l.amount)}`)}
        onAdd={(v) => addLiability({ name: v.name.trim(), amount: parseFloat(v.amt), dueDate: v.due, kind: v.kind as 'loan', repeat: 'monthly' })}
      />
    ),
  },
  {
    id: 'habits', title: 'Habits', min: 2,
    why: 'Two good habits you want to build. Optionally tap a bad habit to start breaking it.',
    count: (d) => d.habits.filter((h) => h.kind === 'good').length,
    body: (d) => (
      <>
        <MiniList
          fields={[{ key: 'name', placeholder: 'Good habit (e.g. Morning walk)' }, { key: 'time', placeholder: 'Time', type: 'time', initial: '07:00' }]}
          items={d.habits.filter((h) => h.kind === 'good').map((h) => `${h.name}${h.time ? ` · ${h.time}` : ''}`)}
          onAdd={(v) => addGood(v.name, v.time)}
        />
        <span className="label">Break a bad habit (optional)</span>
        <div className="cat-chips">
          {LIBRARY.slice(0, 8).map((l) => {
            const on = d.habits.some((h) => h.libId === l.id);
            return (
              <button key={l.id} className={on ? 'on' : ''} disabled={on} onClick={() => addBad({ name: l.name, mode: l.mode, libId: l.id, unit: l.unit, baseline: l.baseline, stepPct: l.stepPct, stepDays: l.stepDays })}>{l.name}</button>
            );
          })}
        </div>
      </>
    ),
  },
  {
    id: 'commissions', title: 'Commissions', min: 2,
    why: 'Your quests. Add two or three things to get done today or this week.',
    count: (d) => d.commissions.length,
    body: (d) => (
      <MiniList
        fields={[
          { key: 'title', placeholder: 'Quest (e.g. Reply to emails)' },
          { key: 'cad', placeholder: 'When', type: 'select', options: [['daily', 'Today'], ['weekly', 'This week'], ['monthly', 'This month']] },
          { key: 'h', placeholder: 'Hours', type: 'select', options: [['0.5', '30 min'], ['1', '1 hour'], ['2', '2 hours'], ['3', '3 hours']] },
        ]}
        items={d.commissions.map((c) => `${c.title} · ${c.hours}h`)}
        onAdd={(v) => addCommission(v.title, v.cad as 'daily', parseFloat(v.h), [], false)}
      />
    ),
  },
  {
    id: 'calendar', title: 'Calendar', min: 2,
    why: 'Two upcoming meetings, appointments or deadlines.',
    count: (d) => d.events.length,
    body: (d) => (
      <MiniList
        fields={[{ key: 'title', placeholder: 'Event' }, { key: 'date', placeholder: 'Date', type: 'date', initial: inDays(1) }, { key: 'time', placeholder: 'Time', type: 'time', initial: '10:00' }]}
        items={d.events.map((e) => `${e.title} · ${e.date.slice(5)} ${e.time}`)}
        onAdd={(v) => addEvent({ title: v.title.trim(), kind: 'event', date: v.date, time: v.time, remind: 30, tone: 'chime' })}
      />
    ),
  },
  {
    id: 'learning', title: 'Learning', min: 1, skip: 'Not right now',
    why: "Commit to one skill at a set time each day. Once you commit there's no delete button until you finish.",
    count: (d) => d.learning.length,
    body: (d) => (
      <MiniList
        fields={[
          { key: 'skill', placeholder: 'Skill (e.g. Spanish)' },
          { key: 'time', placeholder: 'Time', type: 'time', initial: '20:00' },
          { key: 'days', placeholder: 'For', type: 'select', options: [['7', '7 days'], ['21', '21 days'], ['30', '30 days']] },
        ]}
        items={d.learning.map((l) => `${l.skill} · ${l.time} · ${l.days ?? '∞'} days`)}
        addLabel="Commit"
        onAdd={(v) => commit({ skill: v.skill.trim(), time: v.time, minutes: 30, days: parseInt(v.days, 10), resources: [] })}
      />
    ),
  },
  {
    id: 'time', title: 'Time Bank', min: 1,
    why: 'Your daily routine pre-fills every day, so you only adjust what changed.',
    count: (d) => (d.timebank.applied ? 1 : 0),
    body: (d) => (d.timebank.applied ? <p className="plan">Routine saved. You can change it any time in the Time Bank.</p> : <RoutineEditor onDone={() => undefined} cta="Save my routine" />),
  },
  {
    id: 'projects', title: 'Projects', min: 2, skip: 'No personal projects yet',
    why: 'Things you are building for yourself, each with a daily time budget and a deadline.',
    count: (d) => d.projects.length,
    body: (d) => (
      <MiniList
        fields={[
          { key: 'name', placeholder: 'Project' },
          { key: 'deadline', placeholder: 'Deadline', type: 'date', initial: inDays(30) },
          { key: 'h', placeholder: 'Per day', type: 'select', options: [['0.5', '30 min/day'], ['1', '1 h/day'], ['2', '2 h/day']] },
        ]}
        items={d.projects.map((p) => `${p.name} · due ${p.deadline.slice(5)}`)}
        onAdd={(v) => addProject({ name: v.name.trim(), hoursPerDay: parseFloat(v.h), deadline: v.deadline, milestones: [] })}
      />
    ),
  },
  {
    id: 'health', title: 'Vitality', min: 1,
    why: 'Pick your body figure, add height and weight, and take your first mood check-in.',
    count: (d) => d.health.mood.length,
    body: (d) => (
      <>
        <div className="seg">
          <button className={(d.health.gender ?? 'male') === 'male' ? 'on' : ''} onClick={() => setGender('male')}>Male</button>
          <button className={d.health.gender === 'female' ? 'on' : ''} onClick={() => setGender('female')}>Female</button>
        </div>
        <MiniList
          fields={[{ key: 'cm', placeholder: 'Height (cm)', type: 'number', required: false }, { key: 'kg', placeholder: 'Weight (kg)', type: 'number', required: false }]}
          items={[d.health.heightCm ? `${d.health.heightCm} cm` : '', d.health.weights.at(-1) ? `${d.health.weights.at(-1)!.kg} kg` : ''].filter(Boolean)}
          addLabel="Save"
          onAdd={(v) => { if (v.cm) setHeight(parseFloat(v.cm)); if (v.kg) logWeight(parseFloat(v.kg)); }}
        />
        <MoodCheck />
      </>
    ),
  },
  {
    id: 'life', title: 'Life Canvas', min: 2,
    why: 'Two things you want from life, and how it will feel when they happen.',
    count: (d) => d.life.length,
    body: (d) => (
      <MiniList
        fields={[{ key: 'title', placeholder: 'A dream (e.g. See Kyoto)' }, { key: 'feel', placeholder: 'How will it feel?', required: false }]}
        items={d.life.map((l) => l.title)}
        onAdd={(v) => addDream(v.title, v.feel, 'experience')}
      />
    ),
  },
];
