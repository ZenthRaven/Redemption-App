import { uid, useData, type Liability } from '../../data/store';
import { useGame } from '../../engine/store';
import { DAY, addMonths, dayKey, daysUntil, parseDay } from '../../engine/time';
import { addSpend } from '../finance/wallet';

// Liability actions + L-Coin rules. Paying syncs straight into the Wallet.
export const L_RULES = { onTime: 5, earlyBonus: 2, late: 1, streakEvery: 3, streakBonus: 5, debtCleared: 25, overdueExp: 30 };

const get = useData.getState;
const update = (id: string, patch: Partial<Liability>) =>
  useData.setState((s) => ({ liabilities: s.liabilities.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));
const earn = (n: number, why: string) => useGame.getState().earn('l', n, why);

export type NewLiability = Pick<Liability, 'name' | 'kind' | 'amount' | 'dueDate' | 'repeat'> & { balance?: number };

export function addLiability(x: NewLiability) {
  const l: Liability = {
    ...x, id: uid(), payments: [], streak: 0, closed: false,
    principal: x.balance, balance: x.balance,
  };
  useData.setState((s) => ({ liabilities: [...s.liabilities, l] }));
}

export const removeLiability = (id: string) =>
  useData.setState((s) => ({ liabilities: s.liabilities.filter((l) => l.id !== id) }));

/** Pay the current installment: wallet deduction, L-Coins, streak, next due date, debt payoff. */
export function payLiability(id: string) {
  const l = get().liabilities.find((x) => x.id === id);
  if (!l || l.closed) return;
  const today = dayKey();
  const left = daysUntil(l.dueDate);
  const onTime = left >= 0;
  const amount = l.balance !== undefined ? Math.min(l.amount, l.balance) : l.amount;

  addSpend(amount, l.kind === 'subscription' ? 'subscriptions' : 'loans', l.name);

  const streak = onTime ? l.streak + 1 : 0;
  let coins = onTime ? L_RULES.onTime + (left >= 2 ? L_RULES.earlyBonus : 0) : L_RULES.late;
  if (onTime && streak % L_RULES.streakEvery === 0) coins += L_RULES.streakBonus;
  earn(coins, `${l.name} paid ${onTime ? (left >= 2 ? 'early' : 'on time') : 'late'}${streak && streak % L_RULES.streakEvery === 0 ? ` · ${streak} streak` : ''}`);

  // Paying while overdue reclaims the escrowed EXP at 1.5× if still inside the vault grace window.
  if (l.vaultId) useGame.getState().redeem(l.vaultId);

  const balance = l.balance !== undefined ? l.balance - amount : undefined;
  const cleared = l.repeat === 'once' || (balance !== undefined && balance <= 0);
  const next = l.repeat === 'yearly' ? addMonths(l.dueDate, 12) : addMonths(l.dueDate, 1);

  update(id, {
    payments: [{ date: today, due: l.dueDate, amount, onTime }, ...l.payments],
    streak,
    balance,
    vaultId: undefined,
    closed: cleared,
    dueDate: cleared ? l.dueDate : next,
  });
  if (cleared && l.kind !== 'subscription') earn(L_RULES.debtCleared, `${l.name} fully cleared`);
}

/** Clock housekeeping: an unpaid due date escrows EXP into the Redemption Vault once. */
export function liabilitiesTick() {
  for (const l of get().liabilities) {
    if (l.closed || l.vaultId || daysUntil(l.dueDate) >= 0) continue;
    const vaultId = useGame.getState().penalize(L_RULES.overdueExp, `Overdue: ${l.name}`);
    update(l.id, { vaultId: vaultId ?? 'waived' });
  }
}

export type Stage = 'overdue' | 'today' | '2d' | '5d' | '10d' | 'later';

/** Countdown stage matching the 10d / 5d / 2d / night-before reminders. */
export function stageOf(l: Liability): Stage {
  const d = daysUntil(l.dueDate);
  if (d < 0) return 'overdue';
  if (d === 0) return 'today';
  if (d <= 2) return '2d';
  if (d <= 5) return '5d';
  if (d <= 10) return '10d';
  return 'later';
}

/** The four reminder moments for the current due date (notifications are wired in Step 15). */
export function reminderTimes(l: Liability) {
  const due = parseDay(l.dueDate);
  return [
    { label: '10 days', at: due - 10 * DAY + 10 * 3_600_000 },
    { label: '5 days', at: due - 5 * DAY + 10 * 3_600_000 },
    { label: '2 days', at: due - 2 * DAY + 10 * 3_600_000 },
    { label: 'Night before', at: due - DAY + 21 * 3_600_000 },
  ];
}
