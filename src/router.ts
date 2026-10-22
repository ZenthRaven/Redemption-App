import { useEffect, useState } from 'react';

// Minimal hash router: '#/', '#/m/finance', '#/modules'. Works in the browser and inside Capacitor.
const read = () => window.location.hash.replace(/^#/, '') || '/';

export function useRoute() {
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const onChange = () => setRoute(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export const go = (path: string) => { window.location.hash = path; };
