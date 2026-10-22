import { ArrowLeft } from 'lucide-react';
import type { ModuleDef } from '../modules';
import { go } from '../router';

// Placeholder for each module until its own build step replaces it.
export function ModuleScreen({ mod }: { mod: ModuleDef }) {
  return (
    <div className="screen fade-in">
      <button className="label" onClick={() => go('/')} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 28 }}>
        <ArrowLeft size={14} /> HUD
      </button>
      <span className="label">Module {mod.code}</span>
      <h1 className="display" style={{ fontSize: 'clamp(40px, 13cqi, 56px)', margin: '10px 0 8px' }}>{mod.name}</h1>
      <p style={{ color: 'var(--muted)', margin: '0 0 32px' }}>{mod.tagline}</p>

      <div className="frame" style={{ padding: 20 }}>
        <i className="tick tl" /><i className="tick tr" /><i className="tick bl" /><i className="tick br" />
        <mod.icon size={28} strokeWidth={1.3} color="var(--signal)" />
        <p className="label" style={{ marginTop: 14 }}>Under construction</p>
        <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.5, margin: '6px 0 0' }}>
          This module's dashboard is built in its own roadmap step.
        </p>
      </div>
    </div>
  );
}
