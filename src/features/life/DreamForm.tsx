import { useState } from 'react';
import { DREAM_CATS, addDream } from './life';

export function DreamForm({ onDone }: { onDone: (id?: string) => void }) {
  const [title, setTitle] = useState('');
  const [feel, setFeel] = useState('');
  const [cat, setCat] = useState('experience');

  return (
    <div className="form">
      <span className="label">A new dream</span>
      <input className="field" placeholder="What do you want? (e.g. See Kyoto in spring)" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} autoFocus />
      <textarea className="field" rows={3} placeholder="How will it feel when it happens?" value={feel} onChange={(e) => setFeel(e.target.value)} maxLength={200} />
      <div className="cat-chips">
        {DREAM_CATS.map((c) => (
          <button key={c.id} className={cat === c.id ? 'on' : ''} onClick={() => setCat(c.id)}><c.icon size={13} /> {c.name}</button>
        ))}
      </div>
      <button className="btn primary" disabled={!title.trim()} onClick={() => onDone(addDream(title, feel, cat))}>Add to my canvas</button>
      <p className="plan dim">Next you can add photos, notes and the steps that get you there.</p>
    </div>
  );
}
