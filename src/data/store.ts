import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { dayKey, monthKey, now, periodEnd, periodKey, type Period } from '../engine/time';
import { FIXED_CATEGORIES } from '../features/finance/categories';

// Module data. Each slice starts minimal and is extended by its own roadmap step.

export interface Spend { id: string; amount: number; category: string; note?: string; t: number; }
export interface Payment { date: string; due: string; amount: number; onTime: boolean; }
export interface Liability {
  id: string;
  name: string;
  kind: 'loan' | 'mortgage' | 'subscription';
  amount: number; // per payment
  dueDate: string; // next due date
  repeat: 'monthly' | 'yearly' | 'once';
  principal?: number; // original debt (loans / mortgages)
  balance?: number; // outstanding debt
  payments: Payment[];
  streak: number; // consecutive on-time payments
  vaultId?: string; // EXP escrowed while overdue
  closed: boolean;
}
const LIABILITY_DEFAULTS: Pick<Liability, 'repeat' | 'payments' | 'streak' | 'closed'> = { repeat: 'monthly', payments: [], streak: 0, closed: false };
export type Cadence = Period;
export interface Subtask { id: string; title: string; done: boolean; }
export interface Commission {
  id: string;
  title: string;
  cadence: Cadence;
  hours: number; // Time Credits it costs
  subtasks: Subtask[];
  period: string; // day / week / month it belongs to
  deadline: number;
  repeat: boolean; // spawns a fresh copy each new period
  done: boolean;
  doneAt?: number;
  alloc?: { id: string; day: string }; // Time Bank entry made on completion
  missed: boolean;
  vaultId?: string; // EXP escrowed when missed
  comeback: boolean; // rescheduled after a miss; completing redeems the vault at 1.5×
  letGo: boolean; // missed and not rescheduled
  spawned?: boolean;
}
const COMMISSION_DEFAULTS: Pick<Commission, 'subtasks' | 'repeat' | 'missed' | 'comeback' | 'letGo'> = {
  subtasks: [], repeat: false, missed: false, comeback: false, letGo: false,
};
/** Still on the board: not done, not missed (or rescheduled as a comeback). */
export const isOpen = (c: Commission) => !c.done && !c.missed;
export interface Slip { t: number; trigger?: string; }
export interface Habit {
  id: string;
  name: string;
  kind: 'good' | 'bad';
  createdDay: string;
  scored: string; // last day closed out for H-Coins
  // good habits
  time?: string; // daily reminder, HH:MM
  doneDays: string[];
  // bad habits
  mode?: 'wean' | 'cold';
  libId?: string;
  unit?: string;
  baseline?: number;
  stepPct?: number;
  stepDays?: number;
  counts: Record<string, number>; // wean: occurrences per day
  slips: Slip[]; // cold: relapses
  cleanSince?: number;
}
const HABIT_DEFAULTS: Pick<Habit, 'doneDays' | 'counts' | 'slips'> = { doneDays: [], counts: {}, slips: [] };
export interface CalEvent {
  id: string;
  title: string;
  kind: 'meeting' | 'event' | 'deadline';
  date: string;
  time: string; // HH:MM
  location?: string;
  remind: number; // minutes before
  tone: string;
  note?: string;
}
const EVENT_DEFAULTS: Pick<CalEvent, 'kind' | 'remind' | 'tone'> = { kind: 'event', remind: 30, tone: 'chime' };
export interface Resource { id: string; title: string; url?: string; }
export interface LearningCommit {
  id: string;
  skill: string;
  time: string; // daily session time, HH:MM
  minutes: number;
  startDate: string;
  days: number | null; // quota; null = indefinite
  resources: Resource[];
  sessions: Record<string, number>; // day → minutes logged
  paused: string[]; // medical-pause days (extend the quota)
  missed: { day: string; vaultId?: string; madeUp: boolean }[];
  checked: string; // last day closed out
  status: 'active' | 'completed' | 'broken';
  endedAt?: string;
}
const LEARNING_DEFAULTS: Pick<LearningCommit, 'resources' | 'sessions' | 'paused' | 'missed' | 'status'> = {
  resources: [], sessions: {}, paused: [], missed: [], status: 'active',
};
export interface Project { id: string; name: string; hoursPerDay: number; deadline: string; progress: number; }
export interface Checkin { date: string; score: number; label?: string; }
export interface LifeItem { id: string; title: string; description: string; }
export interface Wish { id: string; title: string; amount: number; t: number; }
export interface MonthRecord { month: string; salary: number; spent: number; leftover: number; choice?: 'save' | 'wish'; }

export interface Wallet {
  month: string;
  salary: number;
  spends: Spend[];
  savingsPct: number; // monthly savings goal, as a share of salary
  allowance: Record<string, number>; // day → flexible-spend allowance, fixed when the day starts
  scored: string[]; // days already scored for F-Coins
  lastSalary: number;
}

interface DataState {
  currency: string;
  wallet: Wallet;
  savings: number;
  history: MonthRecord[];
  pendingBuffer: MonthRecord | null; // month waiting for the Save / Wish decision
  wishes: Wish[];
  liabilities: Liability[];
  commissions: Commission[];
  habits: Habit[];
  events: CalEvent[];
  learning: LearningCommit[];
  projects: Project[];
  health: { mood: Checkin[]; body: Checkin[] };
  life: LifeItem[];
  seedSample: () => void;
  clear: () => void;
}

export const newWallet = (lastSalary = 0): Wallet => ({
  month: monthKey(), salary: 0, spends: [], savingsPct: 0.2, allowance: {}, scored: [], lastSalary,
});

const empty = () => ({
  currency: '৳',
  wallet: newWallet(),
  savings: 0,
  history: [] as MonthRecord[],
  pendingBuffer: null as MonthRecord | null,
  wishes: [] as Wish[],
  liabilities: [] as Liability[],
  commissions: [] as Commission[],
  habits: [] as Habit[],
  events: [] as CalEvent[],
  learning: [] as LearningCommit[],
  projects: [] as Project[],
  health: { mood: [] as Checkin[], body: [] as Checkin[] },
  life: [] as LifeItem[],
});

export const uid = () => Math.random().toString(36).slice(2, 10);
const DAY = 86_400_000;
export const inDays = (n: number) => dayKey(now() + n * DAY);

/** A fresh commission for the current period. */
export const newCommission = (title: string, cadence: Cadence, hours: number, subtasks: string[] = [], repeat = false): Commission => ({
  ...COMMISSION_DEFAULTS,
  id: uid(), title, cadence, hours, repeat, done: false,
  subtasks: subtasks.map((t) => ({ id: uid(), title: t, done: false })),
  period: periodKey(cadence), deadline: periodEnd(cadence),
});
const sampleQuest = newCommission;

export const useData = create<DataState>()(
  persist(
    (set) => ({
      ...empty(),
      clear: () => set(empty()),
      // Dev-only: realistic content so the HUD can be tested before each module exists.
      seedSample: () =>
        set({
          wallet: {
            ...newWallet(),
            salary: 85000,
            spends: [
              { id: uid(), amount: 25000, category: 'rent', t: now() },
              { id: uid(), amount: 3200, category: 'electricity', t: now() },
              { id: uid(), amount: 6400, category: 'grocery-monthly', t: now() },
              { id: uid(), amount: 850, category: 'entertainment', t: now() },
            ],
          },
          liabilities: [
            { id: uid(), name: 'Car loan', kind: 'loan', amount: 12000, dueDate: inDays(4), repeat: 'monthly', principal: 300000, balance: 186000, payments: [], streak: 2, closed: false },
            { id: uid(), name: 'Netflix', kind: 'subscription', amount: 800, dueDate: inDays(9), repeat: 'monthly', payments: [], streak: 0, closed: false },
            { id: uid(), name: 'Home mortgage', kind: 'mortgage', amount: 30000, dueDate: inDays(21), repeat: 'monthly', principal: 4500000, balance: 3810000, payments: [], streak: 5, closed: false },
            { id: uid(), name: 'Phone EMI', kind: 'loan', amount: 4500, dueDate: inDays(-1), repeat: 'monthly', principal: 27000, balance: 9000, payments: [], streak: 0, closed: false },
          ],
          commissions: [
            sampleQuest('Clear inbox to zero', 'daily', 0.5, [], true),
            sampleQuest('Prepare client deck', 'daily', 2, ['Outline', 'Draft slides', 'Rehearse']),
            sampleQuest('Gym 3×', 'weekly', 3, ['Monday', 'Wednesday', 'Friday'], true),
            sampleQuest('File tax documents', 'monthly', 2, ['Collect receipts', 'Fill return', 'Submit']),
          ],
          habits: [
            { ...HABIT_DEFAULTS, id: uid(), name: 'Morning run', kind: 'good', time: '06:30', createdDay: inDays(-6), scored: inDays(-1), doneDays: [-5, -4, -3, -2, -1].map(inDays) },
            { ...HABIT_DEFAULTS, id: uid(), name: 'Read 20 pages', kind: 'good', time: '22:00', createdDay: inDays(-3), scored: inDays(-1), doneDays: [inDays(-1)] },
            {
              ...HABIT_DEFAULTS, id: uid(), name: 'Doomscrolling', kind: 'bad', mode: 'wean', libId: 'doomscroll', unit: 'minutes',
              baseline: 180, stepPct: 0.12, stepDays: 4, createdDay: inDays(-9), scored: inDays(-1),
              counts: Object.fromEntries([-8, -7, -6, -5, -4, -3, -2, -1].map((d, i) => [inDays(d), [190, 175, 170, 160, 150, 155, 140, 130][i]])),
            },
            { ...HABIT_DEFAULTS, id: uid(), name: 'Snoozing the alarm', kind: 'bad', mode: 'cold', libId: 'snooze', createdDay: inDays(-5), scored: inDays(-1), cleanSince: now() - 4 * DAY },
          ],
          events: [
            { ...EVENT_DEFAULTS, id: uid(), kind: 'meeting', title: 'Design review', date: dayKey(), time: '11:00', location: 'Office, Room 4', remind: 10, tone: 'bell' },
            { ...EVENT_DEFAULTS, id: uid(), title: 'Dentist', date: dayKey(), time: '17:30', location: 'City Dental' },
            { ...EVENT_DEFAULTS, id: uid(), kind: 'deadline', title: 'Visa documents due', date: inDays(3), time: '17:00', remind: 1440, tone: 'radar' },
            { ...EVENT_DEFAULTS, id: uid(), title: "Rafi's birthday dinner", date: inDays(6), time: '20:00', location: 'Dhanmondi' },
          ],
          learning: [
            {
              ...LEARNING_DEFAULTS, id: uid(), skill: 'Japanese N5', time: '20:00', minutes: 45, startDate: inDays(-3), days: 30, checked: inDays(-1),
              sessions: { [inDays(-3)]: 45, [inDays(-2)]: 45, [inDays(-1)]: 50 },
              resources: [{ id: uid(), title: 'Genki I textbook' }, { id: uid(), title: 'Tofugu kana guide', url: 'https://www.tofugu.com/japanese/learn-hiragana/' }],
            },
            { ...LEARNING_DEFAULTS, id: uid(), skill: 'TypeScript deep dive', time: '07:00', minutes: 30, startDate: inDays(-1), days: 7, checked: inDays(-2) },
          ],
          projects: [
            { id: uid(), name: 'Redemption app', hoursPerDay: 2, deadline: inDays(60), progress: 12 },
            { id: uid(), name: 'Photo portfolio', hoursPerDay: 1, deadline: inDays(30), progress: 40 },
          ],
          health: { mood: [{ date: dayKey(), score: 72, label: 'Calm' }], body: [{ date: dayKey(), score: 81 }] },
          life: [
            { id: uid(), title: 'See the northern lights', description: 'Standing under a green sky in Tromsø, silent.' },
            { id: uid(), title: 'Run a marathon', description: 'Crossing the line knowing every morning counted.' },
            { id: uid(), title: 'Own a home studio', description: 'A quiet room with my own light and my own work on the walls.' },
          ],
        }),
    }),
    {
      name: 'redemption.data',
      version: 1,
      // New fields from later steps get their defaults when older saved data loads.
      merge: (saved, current) => {
        const s = (saved ?? {}) as Partial<DataState>;
        return {
          ...current,
          ...s,
          wallet: { ...current.wallet, ...s.wallet },
          liabilities: (s.liabilities ?? []).map((l) => ({ ...LIABILITY_DEFAULTS, ...(l as Partial<Liability>) }) as Liability),
          learning: (s.learning ?? []).map((l) => ({
            ...LEARNING_DEFAULTS, checked: inDays(-1), ...(l as Partial<LearningCommit>),
          }) as LearningCommit),
          events: (s.events ?? []).map((e) => ({ ...EVENT_DEFAULTS, ...(e as Partial<CalEvent>) }) as CalEvent),
          habits: (s.habits ?? []).map((h) => ({
            ...HABIT_DEFAULTS, createdDay: dayKey(), scored: dayKey(), ...(h as Partial<Habit>),
          }) as Habit),
          commissions: (s.commissions ?? []).map((c) => ({
            ...COMMISSION_DEFAULTS, period: periodKey(c.cadence), deadline: periodEnd(c.cadence), ...(c as Partial<Commission>),
          }) as Commission),
        };
      },
    },
  ),
);

// ---------- selectors ----------

type D = Omit<DataState, 'seedSample' | 'clear'>;

export const monthSpent = (s: D) =>
  s.wallet.month === monthKey() ? s.wallet.spends.reduce((a, x) => a + x.amount, 0) : 0;

export const isFixed = (category: string) => FIXED_CATEGORIES.includes(category);
export const daySpends = (s: D, day = dayKey()) => s.wallet.spends.filter((x) => dayKey(x.t) === day);

export const walletInfo = (s: D) => {
  const salary = s.wallet.month === monthKey() ? s.wallet.salary : 0;
  const spent = monthSpent(s);
  const d = new Date(now());
  const daysLeft = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() - d.getDate() + 1;
  const remaining = salary - spent;
  const goal = Math.round(salary * s.wallet.savingsPct);
  const todayFlex = daySpends(s).filter((x) => !isFixed(x.category)).reduce((a, x) => a + x.amount, 0);
  // Safe to spend per day after protecting the savings goal; today's allowance is frozen at day start.
  const perDay = Math.max(0, Math.floor((remaining - goal) / daysLeft));
  const allowance = s.wallet.allowance[dayKey()] ?? Math.max(0, Math.floor((remaining + todayFlex - goal) / daysLeft));
  return { salary, spent, remaining, daysLeft, goal, perDay, allowance, todayFlex };
};

/** Active commitments that have a session scheduled today (not paused). */
export const learningActive = (s: D) =>
  s.learning.filter((l) => l.status === 'active' && l.startDate <= dayKey() && !l.paused.includes(dayKey()));

/** Open liabilities due within `within` days, overdue ones included. */
export const duesSoon = (s: D, within = 10) =>
  s.liabilities.filter((l) => !l.closed && l.dueDate <= inDays(within))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

export const undone = (s: D) => {
  const c = { daily: 0, weekly: 0, monthly: 0 };
  s.commissions.forEach((x) => { if (isOpen(x)) c[x.cadence]++; });
  return c;
};

export interface QuestItem { id: string; time?: string; title: string; kind: string; to: string; done?: boolean; }

/** Today's questline: timed items first (events, habits, learning), then untimed daily commissions. */
export function questline(s: D): QuestItem[] {
  const today = dayKey();
  const timed: QuestItem[] = [
    ...s.events.filter((e) => e.date === today).map((e) => ({ id: e.id, time: e.time, title: e.title, kind: 'Event', to: '/m/calendar' })),
    ...s.habits.filter((h) => h.kind === 'good' && h.time).map((h) => ({
      id: h.id, time: h.time, title: h.name, kind: 'Habit', to: '/m/habits', done: h.doneDays.includes(today),
    })),
    ...learningActive(s).map((l) => ({
      id: l.id, time: l.time, title: `${l.skill} · ${l.minutes}m`, kind: 'Learning', to: '/m/learning', done: !!l.sessions[today],
    })),
  ].sort((a, b) => a.time!.localeCompare(b.time!));
  const quests = s.commissions.filter((c) => isOpen(c) && (c.cadence === 'daily' || c.comeback))
    .map((c) => ({ id: c.id, title: c.title, kind: 'Commission', to: '/m/commissions' }));
  return [...timed, ...quests];
}

export const fmtMoney = (n: number, cur: string) => `${n < 0 ? '−' : ''}${cur}${Math.abs(n).toLocaleString('en-US')}`;
