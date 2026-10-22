import { uid, useData, type CalEvent } from '../../data/store';
import { DAY, dayKey, parseDay } from '../../engine/time';

export type EventDraft = Omit<CalEvent, 'id'>;

export const addEvent = (e: EventDraft) => useData.setState((s) => ({ events: [...s.events, { ...e, id: uid() }] }));
export const updateEvent = (id: string, e: EventDraft) =>
  useData.setState((s) => ({ events: s.events.map((x) => (x.id === id ? { ...e, id } : x)) }));
export const removeEvent = (id: string) => useData.setState((s) => ({ events: s.events.filter((x) => x.id !== id) }));

export const byTime = (a: CalEvent, b: CalEvent) => (a.date + a.time).localeCompare(b.date + b.time);

/** 6 weeks × 7 days of day keys, Monday first, covering the given month. */
export function monthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const start = first.getTime() - ((first.getDay() + 6) % 7) * DAY;
  return Array.from({ length: 42 }, (_, i) => dayKey(start + i * DAY + 3_600_000));
}

/** When the reminder fires, as a timestamp (notifications are wired in Step 15). */
export const reminderAt = (e: CalEvent) => {
  const [h, m] = e.time.split(':').map(Number);
  return parseDay(e.date) + (h * 60 + m - e.remind) * 60_000;
};

export const REMIND_OPTIONS: [number, string][] = [[0, 'At time'], [10, '10 min'], [30, '30 min'], [60, '1 hour'], [1440, '1 day']];
export const remindLabel = (m: number) => (m === 0 ? 'At the time' : `${REMIND_OPTIONS.find(([v]) => v === m)?.[1] ?? `${m} min`} before`);
