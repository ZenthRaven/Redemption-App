import { isOpen, newCommission, useData, type Cadence, type Commission } from '../../data/store';
import { RULES } from '../../engine/rules';
import { hoursLeft, useGame, useToasts } from '../../engine/store';
import { DAY, dayKey, endOfDay, now, periodKey } from '../../engine/time';

// Commission (to-do quest) actions, the miss → Redemption Vault flow and repeating quests.
const get = useData.getState;
const game = useGame.getState;
const update = (id: string, patch: Partial<Commission> | ((c: Commission) => Partial<Commission>)) =>
  useData.setState((s) => ({
    commissions: s.commissions.map((c) => (c.id === id ? { ...c, ...(typeof patch === 'function' ? patch(c) : patch) } : c)),
  }));

export const reward = (c: Pick<Commission, 'cadence'>) => RULES.commissionExp[c.cadence];
export const missPenalty = (c: Pick<Commission, 'cadence'>) => reward(c) * RULES.missPenaltyFactor;

/** Hours still free today once today's open daily quests are counted. */
export function freeHoursToday() {
  const planned = get().commissions
    .filter((c) => isOpen(c) && c.cadence === 'daily' && c.period === dayKey())
    .reduce((a, c) => a + c.hours, 0);
  return hoursLeft(game()) - planned;
}

/** Adds a quest. Daily quests may not overbook today's Time Credits. */
export function addCommission(title: string, cadence: Cadence, hours: number, subtasks: string[], repeat: boolean) {
  if (cadence === 'daily' && hours > freeHoursToday()) return false;
  useData.setState((s) => ({ commissions: [newCommission(title.trim(), cadence, hours, subtasks, repeat), ...s.commissions] }));
  return true;
}

export function removeCommission(id: string) {
  const c = get().commissions.find((x) => x.id === id);
  if (c?.alloc) game().release(c.alloc.id, c.alloc.day);
  useData.setState((s) => ({ commissions: s.commissions.filter((x) => x.id !== id) }));
}

/** Complete: EXP (or the 1.5× vault comeback) and the hours land in today's Time Bank. */
export function completeCommission(id: string) {
  const c = get().commissions.find((x) => x.id === id);
  if (!c || !isOpen(c)) return;
  if (c.comeback && c.vaultId) {
    if (!game().redeem(c.vaultId)) game().gainExp(reward(c), `${c.title} (vault expired)`);
  } else {
    game().gainExp(reward(c), `Commission · ${c.title}`);
  }
  const hours = Math.min(c.hours, hoursLeft(game()));
  const allocId = hours > 0 ? game().allocate(hours, 'commissions', c.title) : null;
  update(id, {
    done: true, doneAt: now(),
    subtasks: c.subtasks.map((s) => ({ ...s, done: true })),
    alloc: allocId ? { id: allocId, day: dayKey() } : undefined,
  });
}

/** Undo an accidental check-off (not available for comebacks, whose vault is already claimed). */
export function reopenCommission(id: string) {
  const c = get().commissions.find((x) => x.id === id);
  if (!c || !c.done || c.comeback) return;
  game().revokeExp(reward(c), `Reopened · ${c.title}`);
  if (c.alloc) game().release(c.alloc.id, c.alloc.day);
  update(id, { done: false, doneAt: undefined, alloc: undefined });
}

/** Ticking the last step completes the quest. */
export function toggleSubtask(id: string, subId: string) {
  update(id, (c) => ({ subtasks: c.subtasks.map((s) => (s.id === subId ? { ...s, done: !s.done } : s)) }));
  const c = get().commissions.find((x) => x.id === id)!;
  if (isOpen(c) && c.subtasks.length && c.subtasks.every((s) => s.done)) completeCommission(id);
}

// ---------- Redemption flow ----------

/** Missed quests waiting for the "reset the clock" decision. */
export const pendingComebacks = (list: Commission[]) => list.filter((c) => c.missed && !c.letGo && c.vaultId);

/** Pick a new timeline: tonight (0), tomorrow (1) or the day after (2) — all inside the vault grace window. */
export function reschedule(id: string, daysAhead: 0 | 1 | 2) {
  update(id, { missed: false, comeback: true, deadline: endOfDay(now() + daysAhead * DAY) });
}

export const letGo = (id: string) => update(id, { letGo: true });

/** Clock housekeeping: deadlines → vault, repeating quests → fresh copy each period. */
export function commissionsTick() {
  const t = now();
  for (const c of get().commissions) {
    if (!isOpen(c) || c.deadline >= t) continue;
    if (c.comeback) { update(c.id, { missed: true, letGo: true }); continue; } // second miss: the vault simply runs out
    const vaultId = game().penalize(missPenalty(c), `Missed · ${c.title}`);
    update(c.id, { missed: true, vaultId: vaultId ?? undefined, letGo: !vaultId });
    if (!vaultId) useToasts.getState().push({ text: `${c.title} missed`, tone: 'info' });
  }

  const fresh: Commission[] = [];
  for (const c of get().commissions) {
    if (!c.repeat || c.spawned || c.period === periodKey(c.cadence)) continue;
    update(c.id, { spawned: true });
    fresh.push(newCommission(c.title, c.cadence, c.hours, c.subtasks.map((s) => s.title), true));
  }
  if (fresh.length) useData.setState((s) => ({ commissions: [...fresh, ...s.commissions] }));
}
