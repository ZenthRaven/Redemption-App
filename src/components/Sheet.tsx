import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './sheet.css';

/** Bottom sheet over the whole app surface (portaled, so it ignores the screen's scroll position). */
export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const host = document.querySelector('.app');
  if (!open || !host) return null;
  return createPortal(
    <div className="sheet-wrap">
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog">
        <div className="sheet-grip" />
        {children}
      </div>
    </div>,
    host,
  );
}
