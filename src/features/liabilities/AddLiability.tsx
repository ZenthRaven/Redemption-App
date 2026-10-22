import { useState } from 'react';
import { inDays, type Liability } from '../../data/store';
import { addLiability } from './liabilities';

const KINDS: [Liability['kind'], string][] = [['loan', 'Loan'], ['mortgage', 'Mortgage'], ['subscription', 'Subscription']];
const REPEATS: [Liability['repeat'], string][] = [['monthly', 'Monthly'], ['yearly', 'Yearly'], ['once', 'One-off']];

export function AddLiability({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<Liability['kind']>('loan');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(inDays(10));
  const [repeat, setRepeat] = useState<Liability['repeat']>('monthly');
  const [balance, setBalance] = useState('');
  const num = (v: string) => v.replace(/[^\d.]/g, '');
  const valid = name.trim() && parseFloat(amount) > 0 && dueDate;

  const save = () => {
    if (!valid) return;
    addLiability({
      name: name.trim(), kind, amount: parseFloat(amount), dueDate, repeat,
      balance: kind !== 'subscription' && parseFloat(balance) > 0 ? parseFloat(balance) : undefined,
    });
    onDone();
  };

  return (
    <div className="form">
      <span className="label">New liability</span>
      <input className="field" placeholder="Name (e.g. Car loan, Spotify)" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus />
      <div className="seg">
        {KINDS.map(([k, label]) => (
          <button key={k} className={kind === k ? 'on' : ''} onClick={() => { setKind(k); if (k === 'subscription') setBalance(''); }}>{label}</button>
        ))}
      </div>
      <label><span className="label">Amount per payment</span>
        <input className="field" inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(num(e.target.value))} />
      </label>
      <label><span className="label">Next due date</span>
        <input className="field" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </label>
      <div className="seg">
        {REPEATS.map(([r, label]) => (
          <button key={r} className={repeat === r ? 'on' : ''} onClick={() => setRepeat(r)}>{label}</button>
        ))}
      </div>
      {kind !== 'subscription' && (
        <label><span className="label">Outstanding balance (optional)</span>
          <input className="field" inputMode="decimal" placeholder="Total still owed" value={balance} onChange={(e) => setBalance(num(e.target.value))} />
        </label>
      )}
      <button className="btn primary" disabled={!valid} onClick={save}>Add liability</button>
    </div>
  );
}
