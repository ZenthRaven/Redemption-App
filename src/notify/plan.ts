import { isOpen, useData } from '../data/store';
import { DAY, dayKey, now, parseDay } from '../engine/time';
import { reminderAt, remindLabel } from '../features/calendar/calendar';
import { reminderTimes } from '../features/liabilities/liabilities';
import { libById, pickQuote } from '../features/habits/library';
import { todaysDream } from '../features/life/life';

// The 3-tier notification shield, as a pure plan: what should fire, when, on which channel.
//  Tier 1 · alarms     loud, with the event's tone: meetings/events, payment countdowns, learning sessions
//  Tier 2 · nudges     normal: good habits, project milestones, the nightly check-out
//  Tier 3 · briefings  silent: morning and evening summaries carrying dreams and reality checks

export type Tier = 'alarms' | 'nudges' | 'briefings';

export interface Planned {
  key: string; // stable identity, hashed into the numeric notification id
  at: number; // timestamp
  tier: Tier;
  channel: string;
  title: string;
  body: string;
  route: string; // where tapping it opens the app
}

export const HORIZON_DAYS = 7;
export const MAX_SCHEDULED = 60;

const at = (day: string, hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return parseDay(day) + (h * 60 + m) * 60_000;
};
const days = (n: number) => Array.from({ length: n }, (_, i) => dayKey(now() + i * DAY + 3_600_000));

export function buildPlan(): Planned[] {
  const d = useData.getState();
  const t0 = now();
  const horizon = t0 + HORIZON_DAYS * DAY;
  const next = days(HORIZON_DAYS);
  const today = dayKey();
  const out: Planned[] = [];
  const add = (p: Planned) => { if (p.at > t0 + 30_000 && p.at < horizon) out.push(p); };
  const n = d.notify;

  if (n.alarms) {
    for (const e of d.events) {
      add({
        key: `ev:${e.id}:${e.date}${e.time}`, at: reminderAt(e), tier: 'alarms', channel: `alarm-${e.tone}`,
        title: e.title, body: `${e.time}${e.location ? ` · ${e.location}` : ''} · ${remindLabel(e.remind).toLowerCase()}`, route: '/m/calendar',
      });
    }
    for (const l of d.liabilities.filter((x) => !x.closed)) {
      for (const r of reminderTimes(l)) {
        add({
          key: `li:${l.id}:${l.dueDate}:${r.label}`, at: r.at, tier: 'alarms', channel: 'alarm-pulse',
          title: `${l.name} due ${r.label === 'Night before' ? 'tomorrow' : `in ${r.label}`}`,
          body: `${d.currency}${l.amount.toLocaleString('en-US')} · pay on time for L-Coins`, route: '/m/liabilities',
        });
      }
    }
    for (const l of d.learning.filter((x) => x.status === 'active')) {
      for (const day of next) {
        if (day < l.startDate || l.paused.includes(day) || l.sessions[day]) continue;
        add({
          key: `le:${l.id}:${day}`, at: at(day, l.time), tier: 'alarms', channel: 'alarm-bell',
          title: `${l.skill} · ${l.minutes} min`, body: 'Your locked learning session starts now.', route: '/m/learning',
        });
      }
    }
  }

  if (n.nudges) {
    for (const h of d.habits.filter((x) => x.kind === 'good' && x.time)) {
      for (const day of next) {
        if (h.doneDays.includes(day)) continue;
        add({ key: `ha:${h.id}:${day}`, at: at(day, h.time!), tier: 'nudges', channel: 'nudges', title: h.name, body: 'Time for your habit. Keep the streak alive.', route: '/m/habits' });
      }
    }
    for (const p of d.projects.filter((x) => x.status === 'active')) {
      for (const m of p.milestones.filter((x) => !x.done && x.due)) {
        add({ key: `ms:${p.id}:${m.id}`, at: at(m.due!, '09:00'), tier: 'nudges', channel: 'nudges', title: `Milestone due today · ${m.title}`, body: p.name, route: '/m/projects' });
      }
    }
    for (const day of next) {
      if (day === today && d.checkouts.includes(today)) continue;
      add({ key: `co:${day}`, at: at(day, n.checkout), tier: 'nudges', channel: 'nudges', title: 'Nightly check-out', body: 'Two minutes to close the day and claim your rewards.', route: '/checkout' });
    }
  }

  if (n.briefings) {
    const bad = d.habits.filter((h) => h.kind === 'bad');
    next.forEach((day, i) => {
      const dueSoon = d.liabilities.filter((l) => !l.closed && l.dueDate >= day && l.dueDate <= dayKey(parseDay(day) + 3 * DAY)).length;
      const quests = d.commissions.filter((c) => isOpen(c) && c.cadence === 'daily').length;
      const events = d.events.filter((e) => e.date === day).length;
      const parts = [events && `${events} on the calendar`, quests && day === today && `${quests} quests open`, dueSoon && `${dueSoon} payment${dueSoon > 1 ? 's' : ''} due soon`].filter(Boolean);
      add({ key: `bm:${day}`, at: at(day, n.morning), tier: 'briefings', channel: 'briefings', title: 'Morning briefing', body: parts.length ? `${parts.join(' · ')}. Make it count.` : 'A clear board. Make it count.', route: '/' });

      // evening: alternate between a dream (Life Canvas) and a reality check (bad habits)
      const dream = todaysDream(d.life);
      const h = bad[i % Math.max(1, bad.length)];
      const useDream = dream && (i % 2 === 0 || !h);
      if (useDream) {
        add({ key: `be:${day}`, at: at(day, n.evening), tier: 'briefings', channel: 'briefings', title: `Someday: ${dream!.dream.title}`, body: dream!.dream.description || 'Picture the moment it comes true.', route: '/m/life' });
      } else if (h) {
        add({ key: `be:${day}`, at: at(day, n.evening), tier: 'briefings', channel: 'briefings', title: `Reality check · ${h.name}`, body: pickQuote(libById(h.libId)?.id, parseDay(day)), route: '/m/habits' });
      }
    });
  }

  return out.sort((a, b) => a.at - b.at).slice(0, MAX_SCHEDULED);
}

/** Stable positive 31-bit id from a key (Android notification ids are ints). */
export function idOf(key: string) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return (h >>> 1) || 1;
}
