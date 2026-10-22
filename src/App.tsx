import { BottomNav } from './components/BottomNav';
import { ModuleGrid } from './components/ModuleGrid';
import { Toasts } from './components/Toasts';
import { useClock } from './engine/useClock';
import { BufferPrompt } from './features/finance/BufferPrompt';
import { QuickSpend } from './features/finance/QuickSpend';
import { WalletScreen } from './features/finance/WalletScreen';
import { LiabilitiesScreen } from './features/liabilities/LiabilitiesScreen';
import { CommissionsScreen } from './features/commissions/CommissionsScreen';
import { ComebackPrompt } from './features/commissions/ComebackPrompt';
import { HabitsScreen } from './features/habits/HabitsScreen';
import { CalendarScreen } from './features/calendar/CalendarScreen';
import { LearningScreen } from './features/learning/LearningScreen';
import { moduleById } from './modules';
import { useRoute } from './router';
import { Dashboard } from './screens/Dashboard';
import { DevPanel } from './screens/DevPanel';
import { ModuleScreen } from './screens/ModuleScreen';

// Built modules replace their placeholder here as each roadmap step lands.
const BUILT: Record<string, () => JSX.Element> = {
  finance: WalletScreen,
  liabilities: LiabilitiesScreen,
  commissions: CommissionsScreen,
  habits: HabitsScreen,
  calendar: CalendarScreen,
  learning: LearningScreen,
};

export function App() {
  useClock(); // app-wide housekeeping (vault expiry, day scoring, month rollover)
  const route = useRoute();
  const mod = route.startsWith('/m/') ? moduleById(route.slice(3)) : undefined;

  let screen;
  if (mod) {
    const Built = BUILT[mod.id];
    screen = Built ? <Built key={mod.id} /> : <ModuleScreen key={mod.id} mod={mod} />;
  } else if (route === '/dev') screen = <DevPanel />;
  else if (route === '/modules')
    screen = (
      <div className="screen fade-in">
        <span className="label">All modules</span>
        <h1 className="display" style={{ fontSize: 44, margin: '10px 0 24px' }}>Your life,<br />ten fronts.</h1>
        <ModuleGrid />
      </div>
    );
  else screen = <Dashboard />;

  return (
    <div className="app">
      {screen}
      <Toasts />
      <BottomNav route={route} />
      <QuickSpend />
      <BufferPrompt />
      <ComebackPrompt />
    </div>
  );
}
