// Anatomical body map. Every outline is traced from a smooth width profile (half-width along the
// body or limb), so the figure reads as a real physique: trapezius slope, V-taper or waist curve,
// hips, biceps, elbows, calves. Parts are separated by small gaps so each is easy to hit.
// The figure faces you: the person's right side is on the screen's left. Left-side parts reuse the
// right-side shape, mirrored.

export type Gender = 'male' | 'female';

export interface ZoneShape { id: string; name: string; d: string; mirror?: boolean; }

export const ZONE_NAMES: { id: string; name: string }[] = [
  { id: 'head', name: 'Head' },
  { id: 'shoulder-r', name: 'Right shoulder' }, { id: 'shoulder-l', name: 'Left shoulder' },
  { id: 'chest', name: 'Chest' },
  { id: 'arm-r', name: 'Right arm' }, { id: 'arm-l', name: 'Left arm' },
  { id: 'belly', name: 'Belly' }, { id: 'hip', name: 'Hips' },
  { id: 'palm-r', name: 'Right hand' }, { id: 'palm-l', name: 'Left hand' },
  { id: 'thigh-r', name: 'Right thigh' }, { id: 'thigh-l', name: 'Left thigh' },
  { id: 'leg-r', name: 'Right leg' }, { id: 'leg-l', name: 'Left leg' },
  { id: 'foot-r', name: 'Right foot' }, { id: 'foot-l', name: 'Left foot' },
];
export const zoneById = (id: string) => ZONE_NAMES.find((z) => z.id === id);

type Profile = [number, number][]; // [position, half-width or width]

interface Build {
  head: number; // head half-width
  torso: Profile; // [y, half-width] down the trunk
  cap: number; // shoulder (deltoid) width
  arm: Profile; // [t 0..1, width] shoulder → wrist
  armDrop: number; // how far the wrist sits outward of the shoulder
  hand: number;
  thigh: Profile; // [t, width] hip → knee
  leg: Profile; // [t, width] knee → ankle
  foot: number;
}

const BUILDS: Record<Gender, Build> = {
  male: {
    head: 18,
    torso: [[72, 27], [84, 28.5], [100, 27.5], [116, 25], [128, 23.5], [140, 22.5], [152, 21.5], [164, 22], [176, 23.5], [188, 25.5], [200, 26.5], [212, 26.5], [224, 25.5]],
    cap: 19,
    arm: [[0, 15.5], [0.2, 17.5], [0.42, 12.5], [0.5, 12], [0.62, 13.5], [0.85, 11], [1, 9]],
    armDrop: 8,
    hand: 14,
    thigh: [[0, 24], [0.3, 23.5], [0.7, 18.5], [1, 15]],
    leg: [[0, 15], [0.28, 17], [0.7, 11], [1, 8.5]],
    foot: 17,
  },
  female: {
    head: 16.5,
    torso: [[72, 22], [84, 23], [98, 23.5], [110, 22], [122, 19.5], [134, 17.5], [146, 16.5], [158, 17.5], [170, 21], [182, 25], [194, 28], [208, 29], [224, 27]],
    cap: 14,
    arm: [[0, 12.5], [0.2, 13.5], [0.45, 10], [0.6, 10.5], [0.85, 9], [1, 7.5]],
    armDrop: 7,
    hand: 12,
    thigh: [[0, 27], [0.25, 26.5], [0.7, 18.5], [1, 14]],
    leg: [[0, 14], [0.28, 14.8], [0.7, 10], [1, 7.2]],
    foot: 15,
  },
};

const C = 100; // centre line
const r1 = (v: number) => Math.round(v * 10) / 10;

/** Smooth (cosine) interpolation through a profile. */
function at(p: Profile, x: number) {
  if (x <= p[0][0]) return p[0][1];
  for (let i = 1; i < p.length; i++) {
    if (x <= p[i][0]) {
      const [x0, y0] = p[i - 1];
      const [x1, y1] = p[i];
      const t = (x - x0) / (x1 - x0);
      return y0 + (y1 - y0) * (1 - Math.cos(Math.PI * t)) / 2;
    }
  }
  return p[p.length - 1][1];
}

/**
 * Torso band between y0 and y1, traced from the half-width profile: down the left side, across the
 * bottom (`bottom`: path ending at the bottom-right point), up the right side, back across the top
 * (`top`: path from the top-right point to the top-left point). Both default to straight edges.
 */
function band(p: Profile, y0: number, y1: number, top?: string, bottom?: string) {
  const left: string[] = [];
  const right: string[] = [];
  for (let y = y0; y <= y1 + 0.01; y += 2) {
    left.push(`${r1(C - at(p, y))},${y}`);
    right.unshift(`${r1(C + at(p, y))},${y}`);
  }
  return `M${left.join(' L')} ${bottom ?? ''} L${right.join(' L')} ${top ?? ''}Z`;
}

/** A limb from (x1,y1) to (x2,y2) following a width profile, with rounded ends. */
function limb(x1: number, y1: number, x2: number, y2: number, p: Profile) {
  const left: string[] = [];
  const right: string[] = [];
  const steps = Math.ceil((y2 - y1) / 2);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    const w = at(p, t) / 2;
    left.push(`${r1(x - w)},${r1(y)}`);
    right.unshift(`${r1(x + w)},${r1(y)}`);
  }
  const wb = at(p, 1) / 2;
  const wt = at(p, 0) / 2;
  return `M${left.join(' L')} Q${r1(x2)},${r1(y2 + wb * 0.9)} ${right[0]} L${right.join(' L')} Q${r1(x1)},${r1(y1 - wt * 0.6)} ${left[0]}Z`;
}

export function buildBody(g: Gender) {
  const b = BUILDS[g];
  const hw = b.head;
  const sh = at(b.torso, 72); // half-width where the chest meets the shoulders
  const sx = C - sh - 2.5; // inner edge of the right shoulder cap
  const ax1 = sx - b.cap * 0.6; // arm top centre
  const ax2 = ax1 - b.armDrop; // wrist centre
  const tx = 98 - at(b.thigh, 0) / 2; // thigh top centre (4-unit gap between the legs)
  const kx = tx + 2; // knee centre
  const h = b.hand / 2;

  const shapes: ZoneShape[] = [
    {
      id: 'head', name: 'Head',
      d: `M${C},10 C${C + hw},10 ${C + hw + 1},29 ${C + hw - 1},40 C${C + hw - 3},52 ${C + 7},60 ${C},60 C${C - 7},60 ${C - hw + 3},52 ${C - hw + 1},40 C${C - hw - 1},29 ${C - hw},10 ${C},10Z`,
    },
    // chest: the top edge rises from the shoulders to the base of the neck (trapezius slope)
    { id: 'chest', name: 'Chest', d: band(b.torso, 72, 126, `Q${r1(C + sh * 0.55)},66 ${C + 9},64 L${C - 9},64 Q${r1(C - sh * 0.55)},66 ${r1(C - sh)},72`) },
    { id: 'belly', name: 'Belly', d: band(b.torso, 130, 180) },
    // hips: the bottom edge curves up between the legs
    { id: 'hip', name: 'Hips', d: band(b.torso, 184, 222, undefined, `Q${C - 8},228 ${C},229 Q${C + 8},228 ${r1(C + at(b.torso, 222))},222`) },
  ];

  const sides: { id: string; name: string; d: string }[] = [
    {
      id: 'shoulder', name: 'shoulder',
      d: `M${r1(sx)},73 C${r1(sx - b.cap * 0.45)},67 ${r1(sx - b.cap)},72 ${r1(sx - b.cap - 1)},88 C${r1(sx - b.cap - 1)},96 ${r1(sx - b.cap + 1)},101 ${r1(sx - b.cap + 3)},104 L${r1(sx - b.cap * 0.38)},102 C${r1(sx - 4)},94 ${r1(sx - 2)},84 ${r1(sx)},78Z`,
    },
    { id: 'arm', name: 'arm', d: limb(ax1, 108, ax2, 214, b.arm) },
    {
      id: 'palm', name: 'hand',
      // mitten with the thumb on the body side
      d: `M${r1(ax2 - h)},219 C${r1(ax2 - h - 2)},232 ${r1(ax2 - h)},247 ${r1(ax2 - 1)},253 C${r1(ax2 + h - 2)},251 ${r1(ax2 + h)},244 ${r1(ax2 + h)},236 L${r1(ax2 + h + 4)},229 C${r1(ax2 + h + 4)},225 ${r1(ax2 + h + 1)},224 ${r1(ax2 + h - 1)},226 L${r1(ax2 + h - 1)},221 Q${r1(ax2)},216 ${r1(ax2 - h)},219Z`,
    },
    { id: 'thigh', name: 'thigh', d: limb(tx, 231, kx, 311, b.thigh) },
    { id: 'leg', name: 'leg', d: limb(kx, 316, kx + 1, 396, b.leg) },
    {
      id: 'foot', name: 'foot',
      // toes point outward
      d: `M${r1(kx + 4.5)},401 L${r1(kx - 3.5)},401 C${r1(kx - 6)},407 ${r1(kx - b.foot * 0.62)},411 ${r1(kx - b.foot * 0.62)},415 Q${r1(kx - 3)},421 ${r1(kx + 6)},419 C${r1(kx + 8)},414 ${r1(kx + 7)},406 ${r1(kx + 4.5)},401Z`,
    },
  ];
  for (const s of sides) {
    shapes.push({ id: `${s.id}-r`, name: `Right ${s.name}`, d: s.d });
    shapes.push({ id: `${s.id}-l`, name: `Left ${s.name}`, d: s.d, mirror: true });
  }

  // Decorative x-ray anatomy (not tappable): neck, collarbones, sternum, chest/core lines, knees.
  const details = [
    `M${C - 6.5},57 Q${C - 7},63 ${C - 9},66 M${C + 6.5},57 Q${C + 7},63 ${C + 9},66`,
    `M${r1(C - sh + 4)},76 Q${r1(C - sh / 2)},80 ${C - 2},75 M${r1(C + sh - 4)},76 Q${r1(C + sh / 2)},80 ${C + 2},75`,
    `M${C},80 L${C},120`,
    g === 'male'
      ? `M${r1(C - sh + 4)},103 Q${r1(C - sh / 2)},113 ${C - 2},106 M${r1(C + sh - 4)},103 Q${r1(C + sh / 2)},113 ${C + 2},106 M${C - 8},146 Q${C},148 ${C + 8},146 M${C - 8},159 Q${C},161 ${C + 8},159 M${C},134 L${C},170`
      : `M${r1(C - sh + 3)},98 Q${r1(C - sh / 2 - 1)},121 ${C - 3},105 M${r1(C + sh - 3)},98 Q${r1(C + sh / 2 + 1)},121 ${C + 3},105`,
    `M${r1(kx - 4)},323 Q${r1(kx)},327 ${r1(kx + 4)},323 M${r1(200 - kx - 4)},323 Q${r1(200 - kx)},327 ${r1(200 - kx + 4)},323`,
  ];
  const hair = g === 'female'
    ? `M${C},5 C${C + hw + 8},5 ${C + hw + 9},30 ${C + hw + 7},52 C${C + hw + 6},62 ${C + hw + 10},70 ${C + hw + 4},77 L${C - hw - 4},77 C${C - hw - 10},70 ${C - hw - 6},62 ${C - hw - 7},52 C${C - hw - 9},30 ${C - hw - 8},5 ${C},5Z`
    : null;

  return { shapes, details: details.join(' '), navel: { cx: C, cy: 168 }, hair };
}

/** Liquid colour: red when low, blue around the middle, green near the top. */
export const levelColor = (pct: number) => (pct < 34 ? 'var(--bad)' : pct < 67 ? 'var(--mid)' : 'var(--good)');
export const TAP_GOOD = 100;
export const TAP_BAD = 10;
