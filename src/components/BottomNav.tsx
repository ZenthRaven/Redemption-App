import { LayoutGrid, Plus, Swords, Wallet, Crosshair } from 'lucide-react';
import { go } from '../router';
import './bottom-nav.css';

const TABS = [
  { path: '/', label: 'HUD', icon: Crosshair },
  { path: '/m/commissions', label: 'Quests', icon: Swords },
  { path: '/m/finance', label: 'Wallet', icon: Wallet },
  { path: '/modules', label: 'Modules', icon: LayoutGrid },
];

export function BottomNav({ route }: { route: string }) {
  const tab = (t: (typeof TABS)[number]) => (
    <button key={t.path} className={`nav-tab ${route === t.path ? 'on' : ''}`} onClick={() => go(t.path)}>
      <t.icon size={20} strokeWidth={1.5} />
      <span>{t.label}</span>
    </button>
  );

  return (
    <nav className="nav">
      {TABS.slice(0, 2).map(tab)}
      {/* Quick Spend — wired to the category picker in Step 4 */}
      <button className="nav-fab" aria-label="Quick spend" onClick={() => go('/m/finance')}>
        <Plus size={24} strokeWidth={1.75} />
      </button>
      {TABS.slice(2).map(tab)}
    </nav>
  );
}
