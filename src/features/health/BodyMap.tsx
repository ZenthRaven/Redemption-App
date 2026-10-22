import { useRef, useState, type PointerEvent } from 'react';
import { TAP_BAD, TAP_GOOD, ZONES, levelColor, zoneSpan, type Zone } from './zones';

const HOLD_MS = 300; // press this long to start the liquid fill
const DOUBLE_MS = 300; // second tap within this window marks the zone unwell
const MOVE_CANCEL = 8; // px of movement before the hold kicks in cancels the press

function Shape({ zone: z, ...rest }: { zone: Zone } & React.SVGProps<SVGRectElement & SVGEllipseElement>) {
  return z.shape === 'ellipse'
    ? <ellipse cx={z.x} cy={z.y} rx={z.w} ry={z.h} {...rest} />
    : <rect x={z.x} y={z.y} width={z.w} height={z.h} rx={z.r} {...rest} />;
}

/**
 * X-ray body map. Tap = feels fine (green). Double-tap = unwell (red).
 * Hold, then drag up or down = exact level, shown as liquid filling the part (red â†’ blue â†’ green).
 */
export function BodyMap({ values, onSet }: { values: Record<string, number>; onSet: (zone: string, pct: number) => void }) {
  const svg = useRef<SVGSVGElement>(null);
  const press = useRef<{ zone: Zone; x: number; y: number; timer: number; filling: boolean } | null>(null);
  const lastTap = useRef<{ zone: string; t: number } | null>(null);
  const [drag, setDrag] = useState<{ zone: string; pct: number } | null>(null);

  const pctAt = (z: Zone, clientY: number) => {
    const ctm = svg.current!.getScreenCTM()!;
    const y = (clientY - ctm.f) / ctm.d;
    const { top, bottom } = zoneSpan(z);
    return Math.max(0, Math.min(100, ((bottom - y) / (bottom - top)) * 100));
  };

  const down = (z: Zone) => (e: PointerEvent) => {
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
    p.y = e.clientY;
    if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > MOVE_CANCEL) { clearTimeout(p.timer); press.current = null; }
  };

  const up = (e: PointerEvent) => {
    const p = press.current;
    press.current = null;
    if (!p) return;
    clearTimeout(p.timer);
    if (p.filling) {
      onSet(p.zone.id, pctAt(p.zone, e.clientY));
      setDrag(null);
      return;
    }
    const t = performance.now();
    const double = lastTap.current?.zone === p.zone.id && t - lastTap.current.t < DOUBLE_MS;
    onSet(p.zone.id, double ? TAP_BAD : TAP_GOOD);
    lastTap.current = double ? null : { zone: p.zone.id, t };
  };

  return (
    <svg
      ref={svg}
      className="body-map"
      viewBox="0 0 200 420"
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => { if (press.current) clearTimeout(press.current.timer); press.current = null; setDrag(null); }}
    >
      <defs>
        <radialGradient id="xray-glow" cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor="rgba(77,141,255,0.2)" />
          <stop offset="85%" stopColor="rgba(77,141,255,0)" />
        </radialGradient>
        {ZONES.map((z) => <clipPath key={z.id} id={`clip-${z.id}`}><Shape zone={z} /></clipPath>)}
      </defs>
      <rect x="0" y="0" width="200" height="420" fill="url(#xray-glow)" />
      <line x1="100" y1="62" x2="100" y2="210" className="spine" />
      <text x="12" y="16" className="side">R</text>
      <text x="182" y="16" className="side">L</text>

      {ZONES.map((z) => {
        const live = drag?.zone === z.id ? drag.pct : values[z.id];
        const set = live !== undefined;
        const { top, bottom } = zoneSpan(z);
        const h = bottom - top;
        const level = !set ? 0 : live <= TAP_BAD ? 1 : live / 100; // a red tap fills the whole part
        return (
          <g key={z.id} className={`zone ${set ? 'set' : ''} ${drag?.zone === z.id ? 'dragging' : ''}`}>
            <Shape zone={z} className="zone-base" onPointerDown={down(z)} />
            {set && (
              <rect
                className="liquid"
                clipPath={`url(#clip-${z.id})`}
                x={z.shape === 'ellipse' ? z.x - z.w : z.x}
                y={top}
                width={z.shape === 'ellipse' ? z.w * 2 : z.w}
                height={h}
                style={{ transform: `scaleY(${level})`, fill: levelColor(live) }}
              />
            )}
            <Shape zone={z} className="zone-line" />
          </g>
        );
      })}

      {drag && (() => {
        const z = ZONES.find((x) => x.id === drag.zone)!;
        const { top } = zoneSpan(z);
        return <text className="drag-pct" x={z.shape === 'ellipse' ? z.x : z.x + z.w / 2} y={Math.max(14, top - 6)}>{Math.round(drag.pct)}%</text>;
      })()}
    </svg>
  );
}
