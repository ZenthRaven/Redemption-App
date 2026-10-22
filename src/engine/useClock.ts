import { useEffect, useState } from 'react';
import { walletTick } from '../features/finance/wallet';
import { useGame } from './store';
import { now } from './time';

/** Engine + module housekeeping that must run on the clock (expiries, day scoring, month rollover). */
export const tickAll = () => { useGame.getState().tick(); walletTick(); };

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
