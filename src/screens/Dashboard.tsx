import { HeartPulse, Lock } from 'lucide-react';
import { ModuleGrid } from '../components/ModuleGrid';
import { levelInfo } from '../engine/rules';
import { lockedVault, recoveryActive, useGame } from '../engine/store';
import { fmtLeft } from '../engine/time';
import { useClock } from '../engine/useClock';
import './dashboard.css';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function stamp(t: number) {
  const d = new Date(t);
  return `${String(d.getDate()).padStart(2, '0')}/${MONTHS[d.getMonth()]}. ${String(d.getFullYear()).slice(2)}`;
}

// Step 2: player status is live from the engine. The full Life HUD lands in Step 3.
export function Dashboard() {
  const t = useClock();
  const g = useGame();
  const lv = levelInfo(g.exp);
  const vault = lockedVault(g);
  const vaultSum = vault.reduce((a, v) => a + v.amount, 0);
  const soonest = vault.length ? Math.min(...vault.map((v) => v.expiresAt)) - t : 0;

  return (
    <div className="screen">
      <header className="dash-head fade-in">
        <div className="wordmark" aria-label="Redemption">
          <span>Redemption</span>
          <span>Redemption</span>
          <span>Redemption</span>
        </div>
        <span className="label">{stamp(t)}</span>
      </header>

      <section className="frame player fade-in">
        <i className="tick tl" /><i className="tick tr" /><i className="tick bl" /><i className="tick br" />
        <div className="player-row">
          <div>
            <span className="label">Level</span>
            <div className="display player-level">{String(lv.level).padStart(2, '0')}</div>
          </div>
          <div className="player-exp">
            <div className="label">EXP · {lv.into} / {lv.need}</div>
            <div className="bar"><div className="bar-fill" style={{ width: `${lv.pct * 100}%` }} /></div>
          </div>
        </div>

        {(vault.length > 0 || recoveryActive(g)) && (
          <div className="chips">
            {vault.length > 0 && (
              <span className="chip loss"><Lock size={12} /> Vault {vaultSum} EXP · {fmtLeft(soonest)} to redeem</span>
            )}
            {recoveryActive(g) && <span className="chip info"><HeartPulse size={12} /> Recovery Mode</span>}
          </div>
        )}

        <div className="coins">
          {([
            ['Leisure', 'var(--leisure)', g.leisure],
            ['F', 'var(--f-coin)', g.lifetime.f],
            ['H', 'var(--h-coin)', g.lifetime.h],
            ['L', 'var(--l-coin)', g.lifetime.l],
          ] as const).map(([k, c, v]) => (
            <div key={k} className="coin">
              <i style={{ background: c }} />
              <span className="label">{k}</span>
              <b>{v}</b>
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
