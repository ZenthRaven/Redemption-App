import { uid, useData, type Habit } from '../../data/store';
import { useGame } from '../../engine/store';
import { DAY, dayKey, now, parseDay } from '../../engine/time';

// Habit actions + H-Coin rules. Good habits pay at check-in; bad habits are scored when each day closes.
export const H_RULES = {
  goodCheck: 2, goodStreakEvery: 7, goodStreakBonus: 5,
  withinAllowance: 3, reducedVsYesterday: 1,
  cleanDay: 3, milestone: 10,
};
export const MILESTONES = [3, 7, 14, 30, 60, 90, 180, 365];

const get = useData.getState;
const game = useGame.getState;
const update = (id: string, fn: (h: Habit) => Partial<Habit>) =>
  useData.setState((s) => ({ habits: s.habits.map((h) => (h.id === id ? { ...h, ...fn(h) } : h)) }));
const shift = (d: string, n: number) => dayKey(parseDay(d) + n * DAY + 3_600_000);

// ---------- good habits ----------

/** Consecutive done days ending today (or yesterday, if today isn't ticked yet). */
export function streak(h: Habit) {
  let d = h.doneDays.includes(dayKey()) ? dayKey() : shift(dayKey(), -1);
  let n = 0;
  while (h.doneDays.includes(d)) { n++; d = shift(d, -1); }
  return n;
}

export function addGood(name: string, time?: string) {
  const h: Habit = { id: uid(), name: name.trim(), kind: 'good', time: time || undefined, doneDays: [], counts: {}, slips: [], createdDay: dayKey(), scored: dayKey() };
  useData.setState((s) => ({ habits: [...s.habits, h] }));
}

/** Tick / untick today. Unticking reverses exactly what ticking paid. */
export function toggleGood(id: string) {
  const h = get().habits.find((x) => x.id === id);
  if (!h) return;
  const today = dayKey();
  if (h.doneDays.includes(today)) {
    const s = streak(h);
    const coins = H_RULES.goodCheck + (s % H_RULES.goodStreakEvery === 0 ? H_RULES.goodStreakBonus : 0);
    update(id, (x) => ({ doneDays: x.doneDays.filter((d) => d !== today) }));
    game().unearn('h', coins, `Unticked ${h.name}`);
  } else {
    update(id, (x) => ({ doneDays: [...x.doneDays, today] }));
    const s = streak(get().habits.find((x) => x.id === id)!);
    const bonus = s % H_RULES.goodStreakEvery === 0;
    game().earn('h', H_RULES.goodCheck + (bonus ? H_RULES.goodStreakBonus : 0), bonus ? `${h.name} · ${s}-day streak` : h.name);
  }
}

// ---------- bad habits ----------

export type NewBad = Pick<Habit, 'name' | 'mode' | 'libId' | 'unit' | 'baseline' | 'stepPct' | 'stepDays'>;

export function addBad(x: NewBad) {
  const h: Habit = {
    // scored = the day before, so the first day counts too
    ...x, id: uid(), kind: 'bad', doneDays: [], counts: {}, slips: [], createdDay: dayKey(), scored: shift(dayKey(), -1),
    cleanSince: x.mode === 'cold' ? now() : undefined,
  };
  useData.setState((s) => ({ habits: [...s.habits, h] }));
}

/** Auto-weaning: the allowance steps down by a share of the baseline every few days until it reaches zero. */
export function allowance(h: Habit, day = dayKey()) {
  const steps = Math.floor(Math.max(0, (parseDay(day) - parseDay(h.createdDay)) / DAY) / (h.stepDays ?? 4));
  return Math.max(0, Math.round((h.baseline ?? 0) * (1 - (h.stepPct ?? 0.15) * steps)));
}

/** Day the allowance first hits zero. */
export function zeroDay(h: Habit) {
  const steps = Math.ceil(1 / (h.stepPct ?? 0.15));
  return shift(h.createdDay, steps * (h.stepDays ?? 4));
}

/** Log occurrences for today; returns true when it pushes you over the allowance. */
export function logCount(id: string, delta: number) {
  const today = dayKey();
  update(id, (h) => ({ counts: { ...h.counts, [today]: Math.max(0, (h.counts[today] ?? 0) + delta) } }));
  const h = get().habits.find((x) => x.id === id)!;
  return delta > 0 && (h.counts[today] ?? 0) > allowance(h);
}

export function logSlip(id: string, trigger?: string) {
  update(id, (h) => ({ slips: [{ t: now(), trigger }, ...h.slips], cleanSince: now() }));
}

export const cleanMs = (h: Habit) => now() - (h.cleanSince ?? now());
export const nextMilestone = (days: number) => MILESTONES.find((m) => m > days);

export const removeHabit = (id: string) => useData.setState((s) => ({ habits: s.habits.filter((h) => h.id !== id) }));

/** Clock housekeeping: close out each finished day for bad habits. */
export function habitsTick() {
  const yesterday = shift(dayKey(), -1);
  for (const h of get().habits) {
    if (h.scored >= yesterday) continue;
    if (h.kind === 'bad') {
      let coins = 0;
      for (let d = shift(h.scored, 1); d <= yesterday; d = shift(d, 1)) {
        if (d < h.createdDay) continue;
        if (h.mode === 'wean') {
          const c = h.counts[d] ?? 0;
          if (c <= allowance(h, d)) coins += H_RULES.withinAllowance;
          const prev = h.counts[shift(d, -1)];
          if (prev !== undefined && c < prev) coins += H_RULES.reducedVsYesterday;
        } else {
          const end = parseDay(d) + DAY;
          if (!h.slips.some((s) => dayKey(s.t) === d)) coins += H_RULES.cleanDay;
          const days = Math.floor((end - (h.cleanSince ?? end)) / DAY);
          if (h.cleanSince && h.cleanSince < end && MILESTONES.includes(days)) coins += H_RULES.milestone;
        }
      }
      if (coins) game().earn('h', coins, `${h.name} · ${h.mode === 'wean' ? 'kept under the allowance' : 'stayed clean'}`);
    }
    update(h.id, () => ({ scored: yesterday }));
  }
}
