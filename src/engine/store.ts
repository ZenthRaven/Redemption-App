import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { RULES, badgeById, earnedBadges, levelInfo, type Domain } from './rules';
import { HOUR, dayKey, endOfDay, monthKey, now, setClockOffset } from './time';

export interface VaultEntry {
  id: string;
  amount: number;
  reason: string;
  createdAt: number;
  expiresAt: number;
  status: 'locked' | 'redeemed' | 'expired';
}

export interface Allocation { id: string; hours: number; source: string; label: string; cat?: string; }

export interface LogEntry { id: string; t: number; text: string; }

interface GameState {
  exp: number;
  lifetime: Record<Domain, number>; // domain coins earned, drive badges
  leisure: number; // spendable Leisure Coins
  badges: string[];
  vault: VaultEntry[];
  recovery: { month: string; used: number; activeUntil: number };
  time: Record<string, Allocation[]>; // per day
  log: LogEntry[];
  devOffset: number;

  earn: (d: Domain, coins: number, reason: string) => void;
  gainExp: (n: number, reason: string) => void;
  revokeExp: (n: number, reason: string) => void;
  unearn: (d: Domain, coins: number, reason: string) => void;
  penalize: (amount: number, reason: string) => string | null;
  redeem: (id: string) => boolean;
  spendLeisure: (n: number, reason: string) => boolean;
  buyLeisureHours: (hours: number, day?: string) => boolean;
  allocate: (hours: number, source: string, label: string, day?: string, cat?: string) => string | null;
  resize: (id: string, hours: number, day?: string) => boolean;
  release: (id: string, day?: string) => void;
  activateRecovery: () => boolean;
  tick: () => void;
  devAdvance: (hours: number) => void;
  reset: () => void;
}

// ---- transient toast channel (not persisted) ----
export interface Toast { id: string; text: string; tone: 'gain' | 'loss' | 'badge' | 'info'; }
export const useToasts = create<{ list: Toast[]; push: (t: Omit<Toast, 'id'>) => void }>((set) => ({
  list: [],
  push: (t) => {
    const id = uid();
    set((s) => ({ list: [...s.list, { ...t, id }].slice(-3) }));
    setTimeout(() => set((s) => ({ list: s.list.filter((x) => x.id !== id) })), 2800);
  },
}));
const toast = (text: string, tone: Toast['tone'] = 'info') => useToasts.getState().push({ text, tone });

const uid = () => Math.random().toString(36).slice(2, 10);

const initial = () => ({
  exp: 0,
  lifetime: { f: 0, h: 0, l: 0 },
  leisure: 0,
  badges: [] as string[],
  vault: [] as VaultEntry[],
  recovery: { month: monthKey(), used: 0, activeUntil: 0 },
  time: {} as Record<string, Allocation[]>,
  log: [] as LogEntry[],
  devOffset: 0,
});

// ---- selectors ----
export const hoursUsed = (s: Pick<GameState, 'time'>, day = dayKey()) =>
  (s.time[day] ?? []).reduce((a, x) => a + x.hours, 0);
export const hoursLeft = (s: Pick<GameState, 'time'>, day = dayKey()) => RULES.dailyHours - hoursUsed(s, day);
export const recoveryActive = (s: Pick<GameState, 'recovery'>) => s.recovery.activeUntil > now();
export const lockedVault = (s: Pick<GameState, 'vault'>) => s.vault.filter((v) => v.status === 'locked');

export const useGame = create<GameState>()(
  persist(
    (set, get) => {
      const log = (text: string) =>
        set((s) => ({ log: [{ id: uid(), t: now(), text }, ...s.log].slice(0, 100) }));

      // Re-derive badges after any EXP / coin change and announce new ones.
      const settle = (prevLevel: number) => {
        const s = get();
        const { level } = levelInfo(s.exp);
        if (level > prevLevel) toast(`Level up · ${level}`, 'gain');
        const fresh = earnedBadges(s.lifetime, level).filter((b) => !s.badges.includes(b));
        if (fresh.length) {
          set({ badges: [...s.badges, ...fresh] });
          fresh.forEach((b) => { toast(`Badge · ${badgeById(b)?.name}`, 'badge'); log(`Badge earned: ${badgeById(b)?.name}`); });
        }
      };

      return {
        ...initial(),

        earn: (d, coins, reason) => {
          const prev = levelInfo(get().exp).level;
          set((s) => ({
            lifetime: { ...s.lifetime, [d]: s.lifetime[d] + coins },
            exp: s.exp + coins * RULES.expPerCoin,
            leisure: s.leisure + coins * RULES.leisurePerCoin,
          }));
          log(`+${coins} ${d.toUpperCase()}-Coin · ${reason}`);
          toast(`+${coins} ${d.toUpperCase()} · +${coins * RULES.expPerCoin} EXP`, 'gain');
          settle(prev);
        },

        gainExp: (n, reason) => {
          const prev = levelInfo(get().exp).level;
          set((s) => ({ exp: s.exp + n }));
          log(`+${n} EXP · ${reason}`);
          toast(`+${n} EXP`, 'gain');
          settle(prev);
        },

        // Undoing a reward (e.g. un-checking a quest). Not a penalty, so no vault.
        revokeExp: (n, reason) => {
          set((s) => ({ exp: Math.max(0, s.exp - n) }));
          log(`-${n} EXP · ${reason}`);
        },

        // Exact reverse of earn() (e.g. un-checking a habit). Badges already earned are kept.
        unearn: (d, coins, reason) => {
          set((s) => ({
            lifetime: { ...s.lifetime, [d]: Math.max(0, s.lifetime[d] - coins) },
            exp: Math.max(0, s.exp - coins * RULES.expPerCoin),
            leisure: Math.max(0, s.leisure - coins * RULES.leisurePerCoin),
          }));
          log(`-${coins} ${d.toUpperCase()}-Coin · ${reason}`);
        },

        // Missed task: EXP moves into the Redemption Vault. Never drops you below your current level's floor.
        penalize: (amount, reason) => {
          const s = get();
          if (recoveryActive(s)) { log(`Penalty waived (Recovery Mode) · ${reason}`); toast('Penalty waived · Recovery', 'info'); return null; }
          const take = Math.min(amount, s.exp - levelInfo(s.exp).floor);
          if (take <= 0) { log(`Missed · ${reason} (nothing to escrow)`); return null; }
          const entry: VaultEntry = {
            id: uid(), amount: take, reason, createdAt: now(),
            expiresAt: now() + RULES.vaultGraceHours * HOUR, status: 'locked',
          };
          set({ exp: s.exp - take, vault: [entry, ...s.vault] });
          log(`-${take} EXP → Vault · ${reason}`);
          toast(`-${take} EXP → Redemption Vault`, 'loss');
          return entry.id;
        },

        // Comeback: completing the rescheduled task inside the grace window returns 1.5x.
        redeem: (id) => {
          get().tick();
          const v = get().vault.find((x) => x.id === id && x.status === 'locked');
          if (!v) return false;
          const back = Math.round(v.amount * RULES.vaultMultiplier);
          const prev = levelInfo(get().exp).level;
          set((s) => ({
            exp: s.exp + back,
            vault: s.vault.map((x) => (x.id === id ? { ...x, status: 'redeemed' } : x)),
          }));
          log(`Redeemed +${back} EXP (1.5×) · ${v.reason}`);
          toast(`Redeemed · +${back} EXP`, 'gain');
          settle(prev);
          return true;
        },

        spendLeisure: (n, reason) => {
          if (get().leisure < n) return false;
          set((s) => ({ leisure: s.leisure - n }));
          log(`-${n} Leisure · ${reason}`);
          return true;
        },

        buyLeisureHours: (hours, day = dayKey()) => {
          const cost = hours * RULES.leisurePerHour;
          if (get().leisure < cost || hoursLeft(get(), day) < hours) return false;
          get().spendLeisure(cost, `${hours}h leisure`);
          get().allocate(hours, 'leisure', 'Guilt-free leisure', day);
          toast(`${hours}h leisure unlocked`, 'gain');
          return true;
        },

        // Time Credits: refuse anything that would overbook the 24h day.
        allocate: (hours, source, label, day = dayKey(), cat) => {
          if (hours <= 0 || hoursLeft(get(), day) < hours) return null;
          const a: Allocation = { id: uid(), hours, source, label, ...(cat ? { cat } : {}) };
          set((s) => ({ time: { ...s.time, [day]: [...(s.time[day] ?? []), a] } }));
          return a.id;
        },

        // Change an entry's length, still within the 24h cap.
        resize: (id, hours, day = dayKey()) => {
          const a = (get().time[day] ?? []).find((x) => x.id === id);
          if (!a || hours <= 0 || hoursLeft(get(), day) + a.hours < hours) return false;
          set((s) => ({ time: { ...s.time, [day]: s.time[day].map((x) => (x.id === id ? { ...x, hours } : x)) } }));
          return true;
        },

        release: (id, day = dayKey()) =>
          set((s) => ({ time: { ...s.time, [day]: (s.time[day] ?? []).filter((a) => a.id !== id) } })),

        activateRecovery: () => {
          get().tick();
          const s = get();
          if (recoveryActive(s) || s.recovery.used >= RULES.recoveryPerMonth) return false;
          set({ recovery: { ...s.recovery, used: s.recovery.used + 1, activeUntil: endOfDay() } });
          log('Recovery Mode on for today');
          toast('Recovery Mode · penalties paused today', 'info');
          return true;
        },

        // Housekeeping: expire vault entries, refill recovery charges on a new month.
        tick: () => {
          const s = get();
          const t = now();
          const expired = s.vault.filter((v) => v.status === 'locked' && v.expiresAt <= t);
          const patch: Partial<GameState> = {};
          if (expired.length)
            patch.vault = s.vault.map((v) => (expired.includes(v) ? { ...v, status: 'expired' } : v));
          if (s.recovery.month !== monthKey()) patch.recovery = { month: monthKey(), used: 0, activeUntil: 0 };
          if (Object.keys(patch).length) set(patch);
          expired.forEach((v) => log(`Vault expired · ${v.amount} EXP lost · ${v.reason}`));
        },

        devAdvance: (hours) => {
          const devOffset = get().devOffset + hours * HOUR;
          setClockOffset(devOffset);
          set({ devOffset });
          get().tick();
        },

        reset: () => { setClockOffset(0); set(initial()); },
      };
    },
    {
      name: 'redemption.game',
      version: 1,
      onRehydrateStorage: () => (s) => { if (s) setClockOffset(s.devOffset); },
    },
  ),
);
