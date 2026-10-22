import { BottomNav } from './components/BottomNav';
import { ModuleGrid } from './components/ModuleGrid';
import { moduleById } from './modules';
import { useRoute } from './router';
import { Dashboard } from './screens/Dashboard';
import { ModuleScreen } from './screens/ModuleScreen';

export function App() {
  const route = useRoute();
  const mod = route.startsWith('/m/') ? moduleById(route.slice(3)) : undefined;

  let screen;
  if (mod) screen = <ModuleScreen key={mod.id} mod={mod} />;
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
      <BottomNav route={route} />
    </div>
  );
}
