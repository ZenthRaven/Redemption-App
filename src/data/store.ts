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
export interface Habit { id: string; name: string; kind: 'good' | 'bad'; time?: string; doneDays: string[]; }
export interface CalEvent { id: string; title: string; date: string; time: string; location?: string; }
export interface LearningCommit { id: string; skill: string; time: string; minutes: number; startDate: string; days: number | null; }
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
            { id: uid(), name: 'Morning run', kind: 'good', time: '06:30', doneDays: [] },
            { id: uid(), name: 'Read 20 pages', kind: 'good', time: '22:00', doneDays: [] },
            { id: uid(), name: 'Doomscrolling', kind: 'bad', doneDays: [] },
          ],
          events: [
            { id: uid(), title: 'Design review', date: dayKey(), time: '11:00', location: 'Office, Room 4' },
            { id: uid(), title: 'Dentist', date: dayKey(), time: '17:30', location: 'City Dental' },
          ],
          learning: [{ id: uid(), skill: 'Japanese N5', time: '20:00', minutes: 45, startDate: inDays(-3), days: 30 }],
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

export const learningActive = (s: D) =>
  s.learning.filter((l) => l.days === null || l.startDate >= inDays(-(l.days - 1)));

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
    ...learningActive(s).map((l) => ({ id: l.id, time: l.time, title: `${l.skill} · ${l.minutes}m`, kind: 'Learning', to: '/m/learning' })),
  ].sort((a, b) => a.time!.localeCompare(b.time!));
  const quests = s.commissions.filter((c) => isOpen(c) && (c.cadence === 'daily' || c.comeback))
    .map((c) => ({ id: c.id, title: c.title, kind: 'Commission', to: '/m/commissions' }));
  return [...timed, ...quests];
}

export const fmtMoney = (n: number, cur: string) => `${n < 0 ? '−' : ''}${cur}${Math.abs(n).toLocaleString('en-US')}`;
