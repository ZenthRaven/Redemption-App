import type { ReactNode } from 'react';
import './sheet.css';

/** Bottom sheet inside the app surface. */
export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="sheet-wrap">
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog">
        <div className="sheet-grip" />
        {children}
      </div>
    </div>
  );
}
