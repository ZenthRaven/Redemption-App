import { daySpends, isFixed, newWallet, uid, useData, walletInfo, type MonthRecord } from '../../data/store';
import { useGame } from '../../engine/store';
import { dayKey, monthKey, now } from '../../engine/time';

// Wallet actions + F-Coin rules.
export const F_RULES = { firstLogOfDay: 1, underAllowance: 3, savedLeftover: 5, hitSavingsGoal: 20 };

const get = useData.getState;
const setWallet = (patch: Partial<ReturnType<typeof get>['wallet']>) =>
  useData.setState((s) => ({ wallet: { ...s.wallet, ...patch } }));
const earn = (n: number, why: string) => useGame.getState().earn('f', n, why);

export function setSalary(amount: number) {
  setWallet({ salary: Math.max(0, Math.round(amount)), lastSalary: Math.round(amount) });
  freezeAllowance();
}

export function addSpend(amount: number, category: string, note?: string) {
  if (amount <= 0) return;
  const first = daySpends(get()).length === 0;
  setWallet({ spends: [{ id: uid(), amount, category, note: note?.trim() || undefined, t: now() }, ...get().wallet.spends] });
  if (first) earn(F_RULES.firstLogOfDay, 'Tracked spending today');
}

export const removeSpend = (id: string) => setWallet({ spends: get().wallet.spends.filter((x) => x.id !== id) });
export const setSavingsPct = (pct: number) => setWallet({ savingsPct: Math.min(0.9, Math.max(0, pct)) });
export const setCurrency = (currency: string) => useData.setState({ currency: currency.trim().slice(0, 4) });

function freezeAllowance() {
  const s = get();
  const today = dayKey();
  if (s.wallet.salary > 0 && s.wallet.allowance[today] === undefined)
    setWallet({ allowance: { ...s.wallet.allowance, [today]: walletInfo(s).allowance } });
}

/** Runs on the app clock: scores finished days, rolls the month over, freezes today's allowance. */
export function walletTick() {
  const s = get();
  const today = dayKey();

  // Score each finished day that had an allowance.
  const due = Object.keys(s.wallet.allowance).filter((d) => d < today && !s.wallet.scored.includes(d));
  if (due.length) {
    setWallet({ scored: [...s.wallet.scored, ...due] });
    for (const d of due) {
      const flex = daySpends(get(), d).filter((x) => !isFixed(x.category)).reduce((a, x) => a + x.amount, 0);
      if (flex <= s.wallet.allowance[d]) earn(F_RULES.underAllowance, `Under allowance on ${d.slice(5)}`);
    }
  }

  // New month: archive, reward the savings goal, and queue the Buffer decision.
  if (s.wallet.month !== monthKey()) {
    const w = get().wallet;
    const spent = w.spends.reduce((a, x) => a + x.amount, 0);
    const rec: MonthRecord = { month: w.month, salary: w.salary, spent, leftover: w.salary - spent };
    if (w.salary > 0 && rec.leftover >= w.salary * w.savingsPct) earn(F_RULES.hitSavingsGoal, `Savings goal met in ${w.month}`);
    useData.setState((st) => ({
      history: [rec, ...st.history],
      pendingBuffer: w.salary > 0 && rec.leftover > 0 ? rec : st.pendingBuffer,
      wallet: { ...newWallet(w.lastSalary || w.salary), savingsPct: w.savingsPct },
    }));
  }

  freezeAllowance();
}

/** End-of-month decision for leftover money. */
export function resolveBuffer(choice: 'save' | 'wish', wishTitle = '') {
  const rec = get().pendingBuffer;
  if (!rec) return;
  useData.setState((s) => ({
    pendingBuffer: null,
    savings: choice === 'save' ? s.savings + rec.leftover : s.savings,
    wishes: choice === 'wish' ? [{ id: uid(), title: wishTitle.trim() || 'Something I wanted', amount: rec.leftover, t: now() }, ...s.wishes] : s.wishes,
    history: s.history.map((h) => (h.month === rec.month ? { ...h, choice } : h)),
  }));
  if (choice === 'save') earn(F_RULES.savedLeftover, 'Saved leftover money');
}
