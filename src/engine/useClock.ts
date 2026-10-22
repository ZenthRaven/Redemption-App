import { useEffect, useState } from 'react';
import { walletTick } from '../features/finance/wallet';
import { liabilitiesTick } from '../features/liabilities/liabilities';
import { commissionsTick } from '../features/commissions/commissions';
import { habitsTick } from '../features/habits/habits';
import { learningTick } from '../features/learning/learning';
import { timebankTick } from '../features/time/timebank';
import { projectsTick } from '../features/projects/projects';
import { useGame } from './store';
import { now } from './time';

/** Engine + module housekeeping that must run on the clock (expiries, day scoring, month rollover). */
// The routine is pre-filled first, so later modules see the day's real free hours.
export const tickAll = () => { useGame.getState().tick(); timebankTick(); walletTick(); liabilitiesTick(); commissionsTick(); habitsTick(); learningTick(); projectsTick(); };

/** Re-render every `ms` and run housekeeping, so countdowns and expiries stay live. */
export function useClock(ms = 30_000) {
  const [t, setT] = useState(now);
  useEffect(() => {
    const step = () => { tickAll(); setT(now()); };
    step();
    const id = setInterval(step, ms);
    return () => clearInterval(id);
  }, [ms]);
  return t;
}
