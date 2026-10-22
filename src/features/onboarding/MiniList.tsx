import { useState } from 'react';
import { Check, Plus } from 'lucide-react';

export interface Field {
  key: string;
  placeholder: string;
  type?: 'text' | 'number' | 'date' | 'time' | 'select';
  options?: [string, string][];
  initial?: string;
  required?: boolean;
}

/** Tiny inline "add a few items" form used by the Full Tour steps. */
export function MiniList({ fields, items, onAdd, addLabel = 'Add' }: {
  fields: Field[];
  items: string[];
  onAdd: (v: Record<string, string>) => void;
  addLabel?: string;
}) {
  const blank = () => Object.fromEntries(fields.map((f) => [f.key, f.initial ?? (f.options?.[0][0] ?? '')]));
  const [v, setV] = useState<Record<string, string>>(blank);
  const ok = fields.every((f) => f.required === false || v[f.key]?.trim());

  return (
    <div className="mini">
      <ul className="mini-items">
        {items.map((t, i) => <li key={i}><Check size={13} /> {t}</li>)}
      </ul>
      <div className="mini-form">
        {fields.map((f) => f.type === 'select' ? (
          <select key={f.key} className="field" value={v[f.key]} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} aria-label={f.placeholder}>
            {f.options!.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
          </select>
        ) : (
          <input
            key={f.key}
            className="field"
            type={f.type === 'number' ? 'text' : f.type ?? 'text'}
            inputMode={f.type === 'number' ? 'decimal' : undefined}
            placeholder={f.placeholder}
            aria-label={f.placeholder}
            value={v[f.key]}
            onChange={(e) => setV({ ...v, [f.key]: f.type === 'number' ? e.target.value.replace(/[^\d.]/g, '') : e.target.value })}
          />
        ))}
        <button className="btn" disabled={!ok} onClick={() => { onAdd(v); setV(blank()); }}><Plus size={13} /> {addLabel}</button>
      </div>
    </div>
  );
}
