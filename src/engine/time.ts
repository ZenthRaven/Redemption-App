// Clock with a dev offset so the test panel can fast-forward time (vault expiry, month rollover).
let offsetMs = 0;
export const setClockOffset = (ms: number) => { offsetMs = ms; };
export const now = () => Date.now() + offsetMs;

const pad = (n: number) => String(n).padStart(2, '0');
export const dayKey = (t = now()) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const monthKey = (t = now()) => dayKey(t).slice(0, 7);
export const endOfDay = (t = now()) => { const d = new Date(t); d.setHours(23, 59, 59, 999); return d.getTime(); };

export const HOUR = 3_600_000;

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** '2026-10' → 'October 2026' */
export const monthName = (m: string) => `${MONTH_NAMES[+m.slice(5) - 1]} ${m.slice(0, 4)}`;

/** "2h 14m" style countdown. */
export function fmtLeft(ms: number) {
  if (ms <= 0) return '0m';
  const h = Math.floor(ms / HOUR);
  const m = Math.floor((ms % HOUR) / 60_000);
  return h ? `${h}h ${pad(m)}m` : `${m}m`;
}
