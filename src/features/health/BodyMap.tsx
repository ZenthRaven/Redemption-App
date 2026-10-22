import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { TAP_BAD, TAP_GOOD, buildBody, levelColor, type Gender, type ZoneShape } from './zones';

const HOLD_MS = 300; // press this long to start the liquid fill
const DOUBLE_MS = 300; // second tap within this window marks the part unwell
const MOVE_CANCEL = 8; // px of movement before the hold kicks in cancels the press
const SPLASH_MS = 900; // a tap makes the liquid slosh this long before it settles

const MIRROR = 'matrix(-1 0 0 1 200 0)';
const WAVE_LEN = 16; // wavelength (view-box units); the wave layer scrolls by one length per loop
const WAVE_AMP = 2.6;

type Box = { x: number; y: number; w: number; h: number };

/** Liquid surface across a part: a sine top edge at `top`, filled down past the bottom. Same command
 *  structure for any amplitude, so CSS can animate between the wavy and flat shapes. */
function liquidPath(b: Box, top: number, amp: number) {
  const x0 = b.x - WAVE_LEN * 2;
  const x1 = b.x + b.w + WAVE_LEN * 2;
  let d = `M${x0},${top.toFixed(1)}`;
  let up = true;
  for (let x = x0; x < x1; x += WAVE_LEN / 2) {
    d += ` Q${(x + WAVE_LEN / 4).toFixed(1)},${(top + (up ? -amp : amp)).toFixed(1)} ${(x + WAVE_LEN / 2).toFixed(1)},${top.toFixed(1)}`;
    up = !up;
  }
  return `${d} L${x1},${(b.y + b.h + 40).toFixed(1)} L${x0},${(b.y + b.h + 40).toFixed(1)}Z`;
}

/**
 * Anatomical body map. Tap = feels fine (green). Double-tap = unwell (red).
 * Hold, then drag up or down = exact level: liquid fills the part (red → blue → green), waving while
 * your finger is down and settling flat when you let go.
 */
export function BodyMap({ gender, values, onSet }: { gender: Gender; values: Record<string, number>; onSet: (zone: string, pct: number) => void }) {
  const body = useMemo(() => buildBody(gender), [gender]);
  const svg = useRef<SVGSVGElement>(null);
  const paths = useRef<Record<string, SVGPathElement | null>>({});
  const [boxes, setBoxes] = useState<Record<string, Box>>({});
  const press = useRef<{ zone: ZoneShape; x: number; y: number; timer: number; filling: boolean } | null>(null);
  const lastTap = useRef<{ zone: string; t: number } | null>(null);
  const [drag, setDrag] = useState<{ zone: string; pct: number } | null>(null);
  const [splash, setSplash] = useState<Record<string, number>>({});

  // Measure each part once per figure; the fill level is relative to the part's own height.
  useLayoutEffect(() => {
    const b: Record<string, Box> = {};
    for (const s of body.shapes) {
      const bb = paths.current[s.id]?.getBBox();
      if (bb) b[s.id] = { x: bb.x, y: bb.y, w: bb.width, h: bb.height };
    }
    setBoxes(b);
  }, [body]);

  const pctAt = (z: ZoneShape, clientY: number) => {
    const ctm = svg.current!.getScreenCTM()!;
    const y = (clientY - ctm.f) / ctm.d;
    const b = boxes[z.id];
    return b ? Math.max(0, Math.min(100, ((b.y + b.h - y) / b.h) * 100)) : 50;
  };

  const slosh = (id: string) => {
    const t = Date.now();
    setSplash((s) => ({ ...s, [id]: t }));
    setTimeout(() => setSplash((s) => (s[id] === t ? (({ [id]: _, ...rest }) => rest)(s) : s)), SPLASH_MS);
  };

  const down = (z: ZoneShape) => (e: PointerEvent) => {
    try { svg.current!.setPointerCapture(e.pointerId); } catch { /* capture is a nicety; dragging still works inside the map */ }
    const p = { zone: z, x: e.clientX, y: e.clientY, filling: false, timer: 0 };
    p.timer = window.setTimeout(() => {
      p.filling = true;
      navigator.vibrate?.(12);
      setDrag({ zone: z.id, pct: pctAt(z, p.y) });
    }, HOLD_MS);
    press.current = p;
  };

  const move = (e: PointerEvent) => {
    const p = press.current;
    if (!p) return;
    if (p.filling) { setDrag({ zone: p.zone.id, pct: pctAt(p.zone, e.clientY) }); return; }
    if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > MOVE_CANCEL) { clearTimeout(p.timer); press.current = null; }
  };

  const up = (e: PointerEvent) => {
    const p = press.current;
    press.current = null;
    if (!p) return;
    clearTimeout(p.timer);
    if (p.filling) {
      onSet(p.zone.id, pctAt(p.zone, e.clientY));
      setDrag(null); // release: the surface settles flat
      return;
    }
    const t = performance.now();
    const double = lastTap.current?.zone === p.zone.id && t - lastTap.current.t < DOUBLE_MS;
    onSet(p.zone.id, double ? TAP_BAD : TAP_GOOD);
    slosh(p.zone.id);
    lastTap.current = double ? null : { zone: p.zone.id, t };
  };

  const cancel = () => { if (press.current) clearTimeout(press.current.timer); press.current = null; setDrag(null); };

  return (
    <svg ref={svg} className="body-map" viewBox="0 0 200 430" onPointerMove={move} onPointerUp={up} onPointerCancel={cancel}>
      <defs>
        <radialGradient id="xray-glow" cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor="rgba(77,141,255,0.2)" />
          <stop offset="85%" stopColor="rgba(77,141,255,0)" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="200" height="430" fill="url(#xray-glow)" />
      <text x="10" y="16" className="side">R</text>
      <text x="184" y="16" className="side">L</text>
      {body.hair && <path d={body.hair} className="hair" />}

      {body.shapes.map((z) => {
        const live = drag?.zone === z.id ? drag.pct : values[z.id];
        const set = live !== undefined;
        const b = boxes[z.id];
        const active = drag?.zone === z.id || !!splash[z.id];
        const level = !set ? 0 : live <= TAP_BAD ? 1 : live / 100; // a red tap fills the whole part
        const d = b ? liquidPath(b, b.y + b.h * (1 - level), active ? WAVE_AMP : 0) : '';
        const style = { d: `path('${d}')`, fill: set ? levelColor(live) : 'transparent' } as CSSProperties;
        return (
          <g key={z.id} transform={z.mirror ? MIRROR : undefined} className={`zone ${set ? 'set' : ''} ${active ? 'active' : ''} ${drag?.zone === z.id ? 'dragging' : ''}`}>
            <clipPath id={`clip-${gender}-${z.id}`}><path d={z.d} /></clipPath>
            <path ref={(el) => { paths.current[z.id] = el; }} d={z.d} className="zone-base" onPointerDown={down(z)} />
            {set && b && (
              <g clipPath={`url(#clip-${gender}-${z.id})`} className="liquid-clip">
                <g className="wave-scroll">
                  <path className="liquid" d={d} style={style} />
                </g>
              </g>
            )}
            <path d={z.d} className="zone-line" />
          </g>
        );
      })}

      <path d={body.details} className="anatomy" />
      <circle cx={body.navel.cx} cy={body.navel.cy} r="1.3" className="anatomy-dot" />

      {drag && boxes[drag.zone] && (() => {
        const z = body.shapes.find((s) => s.id === drag.zone)!;
        const b = boxes[drag.zone];
        const cx = z.mirror ? 200 - (b.x + b.w / 2) : b.x + b.w / 2;
        return <text className="drag-pct" x={cx} y={Math.max(14, b.y - 6)}>{Math.round(drag.pct)}%</text>;
      })()}
    </svg>
  );
}
