import { ModuleGrid } from '../components/ModuleGrid';
import './dashboard.css';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function stamp(d = new Date()) {
  return `${String(d.getDate()).padStart(2, '0')}/${MONTHS[d.getMonth()]}. ${String(d.getFullYear()).slice(2)}`;
}

// Step 1: layout shell for the Life HUD. Values are static until the game engine lands in Step 2.
export function Dashboard() {
  return (
    <div className="screen">
      <header className="dash-head fade-in">
        <div className="wordmark" aria-label="Redemption">
          <span>Redemption</span>
          <span>Redemption</span>
          <span>Redemption</span>
        </div>
        <span className="label">{stamp()}</span>
      </header>

      <section className="frame player fade-in">
        <i className="tick tl" /><i className="tick tr" /><i className="tick bl" /><i className="tick br" />
        <div className="player-row">
          <div>
            <span className="label">Level</span>
            <div className="display player-level">01</div>
          </div>
          <div className="player-exp">
            <div className="label">EXP · 0 / 100</div>
            <div className="bar"><div className="bar-fill" style={{ width: '0%' }} /></div>
          </div>
        </div>
        <div className="coins">
          {[
            ['Leisure', 'var(--leisure)'],
            ['F', 'var(--f-coin)'],
            ['H', 'var(--h-coin)'],
            ['L', 'var(--l-coin)'],
          ].map(([k, c]) => (
            <div key={k} className="coin">
              <i style={{ background: c }} />
              <span className="label">{k}</span>
              <b>0</b>
            </div>
          ))}
        </div>
      </section>

      <div className="section-head">
        <span className="label">Modules</span>
        <span className="label">10</span>
      </div>
      <ModuleGrid />
    </div>
  );
}
