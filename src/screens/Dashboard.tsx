import { ModuleGrid } from '../components/ModuleGrid';
import { useClock } from '../engine/useClock';
import { NightCard, PlayerCard, PulseCard, QuickStrip, TodayCard, WalletCard } from './hud/widgets';
import './dashboard.css';
import './hud/hud.css';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function stamp(t: number) {
  const d = new Date(t);
  return `${String(d.getDate()).padStart(2, '0')}/${MONTHS[d.getMonth()]}. ${String(d.getFullYear()).slice(2)}`;
}

// The Life HUD cockpit: status first, then today, then the way into every module.
export function Dashboard() {
  const t = useClock();

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

      <PlayerCard t={t} />
      <QuickStrip />
      <WalletCard />
      <NightCard t={t} />
      <TodayCard />
      <PulseCard />

      <div className="section-head">
        <span className="label">Modules</span>
        <span className="label">10</span>
      </div>
      <ModuleGrid />
    </div>
  );
}
