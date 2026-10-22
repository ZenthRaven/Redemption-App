import { useData, type RoutineItem } from '../../data/store';
import { useGame } from '../../engine/store';
import { DAY, dayKey, parseDay } from '../../engine/time';
import { catById, catOf, TIME_CATS } from './categories';

// Time Bank: the daily routine pre-fills each day; other modules sync their hours in; you log the rest.
const game = useGame.getState;
const shift = (d: string, n: number) => dayKey(parseDay(d) + n * DAY + 3_600_000);
const BACKFILL_MAX = 31;

function applyRoutine(day: string, items: RoutineItem[]) {
  for (const it of items) game().allocate(it.hours, 'template', catById(it.cat).name, day, it.cat);
}

/** Save the routine and rewrite today's routine entries to match (synced and manual entries stay). */
export function setRoutine(items: RoutineItem[]) {
  const today = dayKey();
  for (const a of game().time[today] ?? []) if (a.source === 'template') game().release(a.id, today);
  applyRoutine(today, items);
  useData.setState({ timebank: { template: items, applied: today } });
}

/** Clock housekeeping: pre-fill every day since the routine was last applied (up to a month back). */
export function timebankTick() {
  const { applied, template } = useData.getState().timebank;
  const today = dayKey();
  if (!applied || applied >= today) return;
  let d = shift(applied, 1);
  const oldest = shift(today, -(BACKFILL_MAX - 1));
  if (d < oldest) d = oldest;
  for (; d <= today; d = shift(d, 1)) applyRoutine(d, template);
  useData.setState((s) => ({ timebank: { ...s.timebank, applied: today } }));
}

export const logTime = (cat: string, hours: number, day = dayKey()) => game().allocate(hours, 'manual', catById(cat).name, day, cat);

export interface Report {
  days: string[];
  perDay: { day: string; byCat: Record<string, number>; total: number }[];
  byCat: Record<string, number>;
  total: number;
  productive: number;
  tracked: number; // days with anything logged
}

export function report(days: string[]): Report {
  const time = game().time;
  const byCat: Record<string, number> = {};
  const perDay = days.map((day) => {
    const dc: Record<string, number> = {};
    for (const a of time[day] ?? []) {
      const c = catOf(a);
      dc[c] = (dc[c] ?? 0) + a.hours;
      byCat[c] = (byCat[c] ?? 0) + a.hours;
    }
    return { day, byCat: dc, total: Object.values(dc).reduce((x, y) => x + y, 0) };
  });
  const total = Object.values(byCat).reduce((x, y) => x + y, 0);
  const productive = TIME_CATS.filter((c) => c.productive).reduce((a, c) => a + (byCat[c.id] ?? 0), 0);
  return { days, perDay, byCat, total, productive, tracked: perDay.filter((p) => p.total > 0).length };
}

/** Day keys for the last `n` days ending today. */
export const lastN = (n: number, end = dayKey()) => Array.from({ length: n }, (_, i) => shift(end, i - n + 1));
export const monthDays = () => {
  const today = dayKey();
  const first = `${today.slice(0, 8)}01`;
  return lastN(Math.round((parseDay(today) - parseDay(first)) / DAY) + 1);
};
export const shiftDay = shift;
