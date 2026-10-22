import { useEffect, useState } from 'react';
import { useGame } from './store';
import { now } from './time';

/** Re-render every `ms` and run engine housekeeping, so countdowns and expiries stay live. */
export function useClock(ms = 30_000) {
  const [t, setT] = useState(now);
  useEffect(() => {
    const step = () => { useGame.getState().tick(); setT(now()); };
    step();
    const id = setInterval(step, ms);
    return () => clearInterval(id);
  }, [ms]);
  return t;
}
