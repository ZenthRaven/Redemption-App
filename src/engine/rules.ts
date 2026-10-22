// Game rules: every tunable number in Redemption lives here, as plain data + pure functions.

export type Domain = 'f' | 'h' | 'l';

export const RULES = {
  /** each domain coin earned also converts into EXP and Leisure Coins */
  expPerCoin: 10,
  leisurePerCoin: 1,
  /** Leisure Coins needed to buy one guilt-free hour */
  leisurePerHour: 10,
  /** Time Credits: hard daily cap (weekly 168h / monthly ~720h follow from it) */
  dailyHours: 24,
  /** Redemption Vault */
  vaultGraceHours: 72,
  vaultMultiplier: 1.5,
  /** Recovery Mode charges per calendar month */
  recoveryPerMonth: 3,
  /** Contract break penalty (Learning) in Leisure Coins */
  contractBreakLeisure: 15,
  /** EXP for commissions by cadence; missing one escrows 2x its reward */
  commissionExp: { daily: 20, weekly: 60, monthly: 150 },
  missPenaltyFactor: 2,
} as const;

/** EXP needed to go from `level` to `level + 1`. Gentle linear growth: 100, 150, 200 ... */
export const expForLevel = (level: number) => 100 + 50 * (level - 1);

/** Derive level and in-level progress from lifetime EXP. */
export function levelInfo(totalExp: number) {
  let level = 1;
  let floor = 0;
  while (totalExp >= floor + expForLevel(level)) {
    floor += expForLevel(level);
    level++;
  }
  const need = expForLevel(level);
  return { level, floor, into: totalExp - floor, need, pct: (totalExp - floor) / need };
}

// ---------- badges ----------

export interface BadgeDef { id: string; name: string; desc: string; }

const COIN_TIERS = [10, 50, 150, 400, 1000];
const DOMAIN_TITLES: Record<Domain, { label: string; names: string[] }> = {
  f: { label: 'F-Coins', names: ['Penny Watcher', 'Budget Keeper', 'Frugal Strategist', 'Wealth Architect', 'Financial Sovereign'] },
  h: { label: 'H-Coins', names: ['First Step', 'Steady Hand', 'Iron Routine', 'Unbreakable', 'Master of Self'] },
  l: { label: 'L-Coins', names: ['On Time', 'Dues Slayer', 'Interest Dodger', 'Debt Breaker', 'Debt-Free Adult'] },
};

export const BADGES: BadgeDef[] = [
  ...(Object.keys(DOMAIN_TITLES) as Domain[]).flatMap((d) =>
    COIN_TIERS.map((t, i) => ({
      id: `${d}-${t}`,
      name: DOMAIN_TITLES[d].names[i],
      desc: `Earn ${t} ${DOMAIN_TITLES[d].label}`,
    })),
  ),
  ...[10, 20, 30, 40, 50, 75, 100].map((lv) => ({ id: `lv-${lv}`, name: `Level ${lv}`, desc: `Reach level ${lv}` })),
];

/** Badges earned for the given lifetime totals. */
export function earnedBadges(lifetime: Record<Domain, number>, level: number): string[] {
  const ids: string[] = [];
  for (const d of Object.keys(lifetime) as Domain[])
    for (const t of COIN_TIERS) if (lifetime[d] >= t) ids.push(`${d}-${t}`);
  for (const lv of [10, 20, 30, 40, 50, 75, 100]) if (level >= lv) ids.push(`lv-${lv}`);
  return ids;
}

export const badgeById = (id: string) => BADGES.find((b) => b.id === id);
