import { useToasts } from '../engine/store';
import './toasts.css';

export function Toasts() {
  const list = useToasts((s) => s.list);
  return (
    <div className="toasts" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className={`toast ${t.tone}`}>{t.text}</div>
      ))}
    </div>
  );
}
