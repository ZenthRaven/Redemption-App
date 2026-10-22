import { useEffect, useState, type ReactNode } from 'react';
import './phone-frame.css';

// Dev-only harness: on a desktop browser the app renders inside a portrait phone,
// with presets to check scaling across Android screen sizes. On a real phone it is bypassed.
const DEVICES = [
  { id: 'pixel8', name: 'Pixel 8', w: 412, h: 915 },
  { id: 's24', name: 'Galaxy S24', w: 360, h: 780 },
  { id: 'pixel8pro', name: 'Pixel 8 Pro', w: 448, h: 998 },
  { id: 'compact', name: 'Compact', w: 360, h: 640 },
];

const isPhone = () => window.matchMedia('(max-width: 520px)').matches;

export function PhoneFrame({ children }: { children: ReactNode }) {
  const [phone, setPhone] = useState(isPhone);
  const [deviceId, setDeviceId] = useState(() => localStorage.getItem('preview.device') ?? 'pixel8');
  const [scale, setScale] = useState(1);
  const device = DEVICES.find((d) => d.id === deviceId) ?? DEVICES[0];

  useEffect(() => {
    const fit = () => {
      setPhone(isPhone());
      const bezel = 24;
      const s = Math.min(1, (window.innerHeight - 96) / (device.h + bezel), (window.innerWidth - 32) / (device.w + bezel));
      setScale(Math.max(0.3, s));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [device]);

  if (phone) return <>{children}</>;

  const pick = (id: string) => {
    setDeviceId(id);
    try { localStorage.setItem('preview.device', id); } catch { /* storage unavailable */ }
  };

  return (
    <div className="stage">
      <div className="stage-bar">
        <span className="stage-title">REDEMPTION · LIVE PREVIEW</span>
        <div className="stage-devices">
          {DEVICES.map((d) => (
            <button key={d.id} className={d.id === device.id ? 'on' : ''} onClick={() => pick(d.id)}>
              {d.name} <small>{d.w}×{d.h}</small>
            </button>
          ))}
        </div>
      </div>
      <div className="device" style={{ width: device.w, height: device.h, transform: `scale(${scale})` }}>
        <div className="device-screen">{children}</div>
        <div className="device-punch" />
      </div>
    </div>
  );
}
