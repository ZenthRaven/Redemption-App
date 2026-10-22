import { useState } from 'react';
import { PiggyBank, Sparkles } from 'lucide-react';
import { fmtMoney, useData } from '../../data/store';
import { monthName } from '../../engine/time';
import { resolveBuffer } from './wallet';
import './finance.css';

// End-of-month decision: leftover salary is saved or funds a Life Canvas wish. Never silently rolled over.
export function BufferPrompt() {
  const rec = useData((s) => s.pendingBuffer);
  const currency = useData((s) => s.currency);
  const [wish, setWish] = useState<string | null>(null);
  if (!rec) return null;

  return (
    <div className="modal-wrap">
      <div className="modal frame fade-in">
        <i className="tick tl" /><i className="tick tr" /><i className="tick bl" /><i className="tick br" />
        <span className="label">{monthName(rec.month)} closed · buffer money</span>
        <div className="display modal-amount">{fmtMoney(rec.leftover, currency)}</div>
        <p className="modal-copy">You kept this much from last month's salary. What should it become?</p>

        {wish === null ? (
          <div className="modal-choices">
            <button onClick={() => resolveBuffer('save')}>
              <PiggyBank size={22} strokeWidth={1.4} />
              <b>Save it</b>
              <small>Adds to savings · +F-Coins</small>
            </button>
            <button onClick={() => setWish('')}>
              <Sparkles size={22} strokeWidth={1.4} />
              <b>Fund a wish</b>
              <small>Goes to your Life Canvas wishlist</small>
            </button>
          </div>
        ) : (
          <>
            <input className="field" autoFocus placeholder="What are you buying?" value={wish} onChange={(e) => setWish(e.target.value)} maxLength={60} />
            <button className="btn primary" style={{ marginTop: 10 }} disabled={!wish.trim()} onClick={() => resolveBuffer('wish', wish)}>Fund this wish</button>
            <button className="btn" style={{ marginTop: 8 }} onClick={() => setWish(null)}>Back</button>
          </>
        )}
      </div>
    </div>
  );
}
