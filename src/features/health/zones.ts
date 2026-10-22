// Body-map zones, slightly separated so each is easy to hit. The figure faces you,
// so the person's right side is on the screen's left (marked R / L on the map).
export interface Zone {
  id: string;
  name: string;
  shape: 'rect' | 'ellipse';
  x: number; y: number; w: number; h: number; r?: number; // ellipse: x, y = centre; w, h = radii
}

export const ZONES: Zone[] = [
  { id: 'head', name: 'Head', shape: 'ellipse', x: 100, y: 34, w: 21, h: 26 },
  { id: 'shoulder-r', name: 'Right shoulder', shape: 'rect', x: 46, y: 68, w: 26, h: 22, r: 10 },
  { id: 'shoulder-l', name: 'Left shoulder', shape: 'rect', x: 128, y: 68, w: 26, h: 22, r: 10 },
  { id: 'chest', name: 'Chest', shape: 'rect', x: 75, y: 66, w: 50, h: 58, r: 14 },
  { id: 'arm-r', name: 'Right arm', shape: 'rect', x: 40, y: 94, w: 20, h: 104, r: 10 },
  { id: 'arm-l', name: 'Left arm', shape: 'rect', x: 140, y: 94, w: 20, h: 104, r: 10 },
  { id: 'belly', name: 'Belly', shape: 'rect', x: 77, y: 128, w: 46, h: 46, r: 12 },
  { id: 'hip', name: 'Hips', shape: 'rect', x: 73, y: 178, w: 54, h: 32, r: 12 },
  { id: 'palm-r', name: 'Right hand', shape: 'ellipse', x: 50, y: 218, w: 11, h: 15 },
  { id: 'palm-l', name: 'Left hand', shape: 'ellipse', x: 150, y: 218, w: 11, h: 15 },
  { id: 'thigh-r', name: 'Right thigh', shape: 'rect', x: 75, y: 214, w: 24, h: 84, r: 12 },
  { id: 'thigh-l', name: 'Left thigh', shape: 'rect', x: 101, y: 214, w: 24, h: 84, r: 12 },
  { id: 'leg-r', name: 'Right leg', shape: 'rect', x: 77, y: 302, w: 20, h: 86, r: 10 },
  { id: 'leg-l', name: 'Left leg', shape: 'rect', x: 103, y: 302, w: 20, h: 86, r: 10 },
  { id: 'foot-r', name: 'Right foot', shape: 'ellipse', x: 85, y: 400, w: 14, h: 8 },
  { id: 'foot-l', name: 'Left foot', shape: 'ellipse', x: 115, y: 400, w: 14, h: 8 },
];

export const zoneById = (id: string) => ZONES.find((z) => z.id === id);

/** Vertical extent of a zone in SVG units (for the hold-and-drag fill). */
export const zoneSpan = (z: Zone) => (z.shape === 'ellipse' ? { top: z.y - z.h, bottom: z.y + z.h } : { top: z.y, bottom: z.y + z.h });

/** Liquid colour: red when low, blue around the middle, green near the top. */
export const levelColor = (pct: number) => (pct < 34 ? 'var(--bad)' : pct < 67 ? 'var(--mid)' : 'var(--good)');
export const TAP_GOOD = 100;
export const TAP_BAD = 10;
