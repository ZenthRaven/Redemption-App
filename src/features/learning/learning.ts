import { uid, useData, type LearningCommit, type Resource } from '../../data/store';
import { RULES } from '../../engine/rules';
import { hoursLeft, useGame } from '../../engine/store';
import { DAY, dayKey, parseDay } from '../../engine/time';

// Learning commitments: locked until the quota is met. Exits: a Leisure-Coin contract break,
// or a Medical Pause that only appears when recent health check-ins say you're unwell.
export const LEARN_RULES = {
  sessionExp: 15, completionExpPerDay: 5, completionExpCap: 300, missExp: 20,
  breakLeisure: RULES.contractBreakLeisure, pauseDays: 2, minDays: 3,
  // medical pause thresholds over the last 3 days of check-ins
  healthWindow: 3, bodyBelow: 50, moodBelow: 40,
};

const get = useData.getState;
const game = useGame.getState;
const shift = (d: string, n: number) => dayKey(parseDay(d) + n * DAY + 3_600_000);
const update = (id: string, fn: (l: LearningCommit) => Partial<LearningCommit>) =>
  useData.setState((s) => ({ learning: s.learning.map((l) => (l.id === id ? { ...l, ...fn(l) } : l)) }));

export type NewCommit = Pick<LearningCommit, 'skill' | 'time' | 'minutes' | 'days'> & { resources: Omit<Resource, 'id'>[] };

export function commit(x: NewCommit) {
  const l: LearningCommit = {
    ...x, id: uid(), startDate: dayKey(), checked: shift(dayKey(), -1),
    resources: x.resources.map((r) => ({ ...r, id: uid() })),
    sessions: {}, paused: [], missed: [], status: 'active',
  };
  useData.setState((s) => ({ learning: [l, ...s.learning] }));
}

/** Last day of the quota, pushed back by paused days. null = indefinite. */
export const endDate = (l: LearningCommit) => (l.days === null ? null : shift(l.startDate, l.days - 1 + l.paused.length));
export const dayNumber = (l: LearningCommit) => Math.round((parseDay(dayKey()) - parseDay(l.startDate)) / DAY) + 1 - l.paused.filter((p) => p <= dayKey()).length;
export const sessionCount = (l: LearningCommit) => Object.keys(l.sessions).length + l.missed.filter((m) => m.madeUp).length;
export const pendingMakeUps = (l: LearningCommit) => l.missed.filter((m) => !m.madeUp && m.vaultId);

/** Log today's session: EXP, and the minutes go into today's Time Bank. */
export function logSession(id: string, minutes?: number) {
  const l = get().learning.find((x) => x.id === id);
  if (!l || l.status !== 'active' || l.sessions[dayKey()]) return;
  const mins = minutes ?? l.minutes;
  update(id, (x) => ({ sessions: { ...x.sessions, [dayKey()]: mins } }));
  game().gainExp(LEARN_RULES.sessionExp, `${l.skill} session`);
  const h = Math.min(mins / 60, hoursLeft(game()));
  if (h > 0) game().allocate(h, 'learning', l.skill);
}

/** An extra session after a missed day wins the escrowed EXP back at 1.5×. */
export function makeUp(id: string) {
  const l = get().learning.find((x) => x.id === id);
  const m = l && pendingMakeUps(l)[0];
  if (!l || !m) return;
  const ok = game().redeem(m.vaultId!);
  update(id, (x) => ({ missed: x.missed.map((y) => (y.day === m.day ? { ...y, madeUp: true } : y)) }));
  const h = Math.min(l.minutes / 60, hoursLeft(game()));
  if (h > 0) game().allocate(h, 'learning', `${l.skill} (make-up)`);
  if (!ok) game().gainExp(LEARN_RULES.sessionExp, `${l.skill} make-up (vault expired)`);
}

/** Medical Pause is offered only when recent health data shows you're unwell — never on demand. */
export function medicalReason(): string | null {
  const { health } = get();
  const since = shift(dayKey(), -(LEARN_RULES.healthWindow - 1));
  const recent = (xs: { date: string; score: number }[]) => xs.filter((x) => x.date >= since);
  const avg = (xs: { score: number }[]) => (xs.length ? xs.reduce((a, x) => a + x.score, 0) / xs.length : null);
  const body = avg(recent(health.body));
  const mood = avg(recent(health.mood));
  if (body !== null && body < LEARN_RULES.bodyBelow) return `Body check-ins averaged ${Math.round(body)}% over the last ${LEARN_RULES.healthWindow} days.`;
  if (mood !== null && mood < LEARN_RULES.moodBelow) return `Mood check-ins averaged ${Math.round(mood)}% over the last ${LEARN_RULES.healthWindow} days.`;
  return null;
}

export function medicalPause(id: string) {
  const days = Array.from({ length: LEARN_RULES.pauseDays }, (_, i) => shift(dayKey(), i));
  update(id, (l) => ({ paused: [...new Set([...l.paused, ...days])] }));
}

/** Break the contract early: costs Leisure Coins (whatever you have, up to the fee). */
export function breakContract(id: string) {
  const fee = Math.min(LEARN_RULES.breakLeisure, game().leisure);
  if (fee > 0) game().spendLeisure(fee, 'Learning contract broken');
  update(id, () => ({ status: 'broken', endedAt: dayKey() }));
}

/** Only finished or broken commitments can be deleted. */
export const removeCommit = (id: string) =>
  useData.setState((s) => ({ learning: s.learning.filter((l) => l.id !== id || l.status === 'active') }));

/** Clock housekeeping: missed sessions escrow EXP; finished quotas complete with a bonus. */
export function learningTick() {
  const yesterday = shift(dayKey(), -1);
  for (const l of get().learning) {
    if (l.status !== 'active' || l.checked >= yesterday) continue;
    const end = endDate(l);
    const missed: LearningCommit['missed'] = [];
    for (let d = shift(l.checked, 1); d <= yesterday; d = shift(d, 1)) {
      if (d < l.startDate || (end && d > end) || l.paused.includes(d) || l.sessions[d]) continue;
      missed.push({ day: d, vaultId: game().penalize(LEARN_RULES.missExp, `Missed ${l.skill} session`) ?? undefined, madeUp: false });
    }
    const done = end !== null && end <= yesterday;
    update(l.id, (x) => ({ checked: yesterday, missed: [...x.missed, ...missed], ...(done ? { status: 'completed' as const, endedAt: end! } : {}) }));
    // Finishing pays per session actually attended, so sitting out the quota earns nothing extra.
    const bonus = Math.min(LEARN_RULES.completionExpCap, sessionCount(l) * LEARN_RULES.completionExpPerDay);
    if (done && bonus > 0) game().gainExp(bonus, `Learning commitment complete · ${l.skill}`);
  }
}
