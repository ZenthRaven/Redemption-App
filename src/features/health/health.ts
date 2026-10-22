import { useData, type Checkin, type Health } from '../../data/store';
import { recoveryActive, useGame } from '../../engine/store';
import { RULES } from '../../engine/rules';
import { DAY, dayKey, now } from '../../engine/time';
import { addEvent } from '../calendar/calendar';
import { zoneById } from './zones';

// Vitality: body-map reports, mood check-ins, weight & BMI, checkup prompts and the Recovery Mode offer.
export const V_RULES = { checkinExp: 5, badZone: 34, badDays: 3, window: 7, recoveryBody: 50, recoveryMood: 40, recoveryRedZones: 3 };

const get = () => useData.getState().health;
const setHealth = (patch: Partial<Health>) => useData.setState((s) => ({ health: { ...s.health, ...patch } }));
const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
const today = () => dayKey();
const todayOf = (xs: Checkin[]) => xs.find((x) => x.date === today());

// ---------- body ----------

export const todayBody = () => todayOf(get().body);

/** Set one zone in today's report (upserts the day). First report of the day pays EXP. */
export function setZone(zone: string, pct: number) {
  const prev = todayBody();
  const zones = { ...(prev?.zones ?? {}), [zone]: Math.round(pct) };
  const entry: Checkin = { date: today(), zones, score: avg(Object.values(zones)) };
  setHealth({ body: [...get().body.filter((b) => b.date !== today()), entry] });
  if (!prev) useGame.getState().gainExp(V_RULES.checkinExp, 'Body check-in');
}

export function clearBodyToday() {
  setHealth({ body: get().body.filter((b) => b.date !== today()) });
}

/** Zones that felt bad on 3+ of the last 7 reports, unless the prompt was dismissed this week. */
export function checkupAlerts() {
  const since = dayKey(now() - (V_RULES.window - 1) * DAY);
  const recent = get().body.filter((b) => b.date >= since);
  const bad: Record<string, number> = {};
  recent.forEach((b) => Object.entries(b.zones ?? {}).forEach(([z, v]) => { if (v < V_RULES.badZone) bad[z] = (bad[z] ?? 0) + 1; }));
  const snoozed = get().checkupSnoozed;
  return Object.entries(bad)
    .filter(([z, n]) => n >= V_RULES.badDays && !(snoozed[z] && snoozed[z] >= since))
    .map(([z, n]) => ({ zone: z, name: zoneById(z)?.name ?? z, days: n }));
}

export const snoozeCheckup = (zone: string) => setHealth({ checkupSnoozed: { ...get().checkupSnoozed, [zone]: today() } });

/** Puts a checkup on tomorrow's calendar and quiets the prompt for a week. */
export function bookCheckup(zone: string) {
  const name = zoneById(zone)?.name ?? zone;
  addEvent({ title: `Checkup: ${name.toLowerCase()}`, kind: 'event', date: dayKey(now() + DAY), time: '10:00', remind: 60, tone: 'bell', note: 'Booked from Vitality' });
  snoozeCheckup(zone);
}

// ---------- mind ----------

export const MOOD_QUESTIONS: { q: string; low: string; high: string; invert?: boolean }[] = [
  { q: 'How is your mood overall?', low: 'Very low', high: 'Great' },
  { q: 'How much energy do you have?', low: 'Drained', high: 'Charged' },
  { q: 'How stressed do you feel?', low: 'Calm', high: 'Overwhelmed', invert: true },
  { q: 'How did you sleep?', low: 'Badly', high: 'Deeply' },
  { q: 'How clear is your focus?', low: 'Foggy', high: 'Sharp' },
];

export function moodLabel(score: number) {
  if (score >= 80) return 'Thriving';
  if (score >= 62) return 'Good';
  if (score >= 45) return 'Okay';
  if (score >= 28) return 'Low';
  return 'Struggling';
}

export const todayMood = () => todayOf(get().mood);

/** answers: 1–5 each; stress is inverted so higher always means better. */
export function saveMood(answers: number[]) {
  const norm = answers.map((a, i) => (MOOD_QUESTIONS[i].invert ? 6 - a : a));
  const score = Math.round(((norm.reduce((x, y) => x + y, 0) / norm.length - 1) / 4) * 100);
  const first = !todayMood();
  setHealth({ mood: [...get().mood.filter((m) => m.date !== today()), { date: today(), score, label: moodLabel(score), answers }] });
  if (first) useGame.getState().gainExp(V_RULES.checkinExp, 'Mood check-in');
}

// ---------- weight ----------

export function logWeight(kg: number) {
  if (!(kg > 20 && kg < 400)) return;
  setHealth({ weights: [...get().weights.filter((w) => w.date !== today()), { date: today(), kg: Math.round(kg * 10) / 10 }].sort((a, b) => a.date.localeCompare(b.date)) });
}
export const setGender = (gender: 'male' | 'female') => setHealth({ gender });
export const setHeight =(cm: number) => setHealth({ heightCm: cm > 80 && cm < 250 ? Math.round(cm) : undefined });
export const setGoal = (kg: number) => setHealth({ goalKg: kg > 20 ? Math.round(kg * 10) / 10 : undefined });

export function bmiOf(kg?: number, cm?: number) {
  if (!kg || !cm) return null;
  const v = Math.round((kg / (cm / 100) ** 2) * 10) / 10;
  const cat = v < 18.5 ? 'Underweight' : v < 25 ? 'Healthy' : v < 30 ? 'Overweight' : 'Obese';
  return { v, cat, color: v < 18.5 ? 'var(--mid)' : v < 25 ? 'var(--good)' : v < 30 ? 'var(--leisure)' : 'var(--bad)' };
}

// ---------- recovery ----------

/** Why today looks like a recovery day (or null). The user still decides whether to use a charge. */
export function recoveryReason(): string | null {
  const body = todayBody();
  const mood = todayMood();
  const red = Object.values(body?.zones ?? {}).filter((v) => v < V_RULES.badZone).length;
  if (red >= V_RULES.recoveryRedZones) return `${red} body zones marked unwell today.`;
  if (body && body.score < V_RULES.recoveryBody) return `Today's body report is at ${body.score}%.`;
  if (mood && mood.score < V_RULES.recoveryMood) return `Your mood check-in reads "${mood.label}".`;
  return null;
}

export function recoveryState() {
  const g = useGame.getState();
  return { active: recoveryActive(g), left: RULES.recoveryPerMonth - g.recovery.used };
}
