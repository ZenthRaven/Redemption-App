import { MODULES } from '../modules';
import { go } from '../router';
import './module-grid.css';

export function ModuleGrid() {
  return (
    <div className="mgrid">
      {MODULES.map((m, i) => (
        <button
          key={m.id}
          className="mtile fade-in"
          style={{ animationDelay: `${i * 30}ms` }}
          onClick={() => go(`/m/${m.id}`)}
        >
          <span className="mtile-code">{m.code}</span>
          <m.icon size={22} strokeWidth={1.4} className="mtile-icon" />
          <span className="mtile-name">{m.name}</span>
          <span className="mtile-tag">{m.tagline}</span>
        </button>
      ))}
    </div>
  );
}
