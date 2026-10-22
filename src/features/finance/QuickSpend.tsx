import { useEffect, useState } from 'react';
import { ArrowLeft, Delete } from 'lucide-react';
import { Sheet } from '../../components/Sheet';
import { fmtMoney, useData } from '../../data/store';
import { useToasts } from '../../engine/store';
import { useUI } from '../../ui';
import { CATEGORIES, categoryById } from './categories';
import { addSpend } from './wallet';
import './finance.css';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];

// Two taps to log a spend: punch the amount, tap a category. Opened from the + button anywhere.
export function QuickSpend() {
  const { sheet, close } = useUI();
  const currency = useData((s) => s.currency);
  const toast = useToasts((s) => s.push);
  const [raw, setRaw] = useState('');
  const [step, setStep] = useState<'amount' | 'category'>('amount');
  const [note, setNote] = useState('');

  useEffect(() => { if (sheet === 'spend') { setRaw(''); setNote(''); setStep('amount'); } }, [sheet]);

  const amount = parseFloat(raw) || 0;
  const press = (k: string) => {
    if (k === '⌫') return setRaw((r) => r.slice(0, -1));
    if (k === '.' && raw.includes('.')) return;
    if (raw.includes('.') && raw.split('.')[1].length >= 2) return;
    if (raw.replace('.', '').length >= 9) return;
    setRaw((r) => (r === '0' && k !== '.' ? k : r + k));
  };

  const pick = (id: string) => {
    addSpend(amount, id, note);
    toast({ text: `Logged ${fmtMoney(amount, currency)} · ${categoryById(id).name}`, tone: 'info' });
    close();
  };

  return (
    <Sheet open={sheet === 'spend'} onClose={close}>
      {step === 'amount' ? (
        <>
          <span className="label">Quick spend</span>
          <div className={`qs-amount display ${raw ? '' : 'empty'}`}>{currency}{raw || '0'}</div>
          <div className="keypad">
            {KEYS.map((k) => (
              <button key={k} onClick={() => press(k)} aria-label={k === '⌫' ? 'Delete' : k}>
                {k === '⌫' ? <Delete size={20} strokeWidth={1.5} /> : k}
              </button>
            ))}
          </div>
          <button className="btn primary" disabled={!amount} onClick={() => setStep('category')}>Choose category</button>
        </>
      ) : (
        <>
          <div className="qs-head">
            <button className="label" onClick={() => setStep('amount')}><ArrowLeft size={14} /> {fmtMoney(amount, currency)}</button>
            <span className="label">Tap a category</span>
          </div>
          <input className="field" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={60} />
          <div className="cat-grid">
            {CATEGORIES.map((c) => (
              <button key={c.id} onClick={() => pick(c.id)}>
                <c.icon size={22} strokeWidth={1.4} />
                <span>{c.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </Sheet>
  );
}
