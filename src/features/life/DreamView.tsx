import { useRef, useState } from 'react';
import { ArrowLeft, Check, ImagePlus, Trash2, Trophy, X } from 'lucide-react';
import { usePhoto } from '../../data/photos';
import type { LifeItem } from '../../data/store';
import { fmtDay } from '../../engine/time';
import { Cover } from './LifeScreen';
import {
  LIFE_RULES, addDreamMilestone, addPhotos, dreamCat, editDream, progressOf, removeDream,
  removeDreamMilestone, removePhoto, toggleAchieved, toggleDreamMilestone,
} from './life';

/** One dream, full screen: cover, feeling, mood board, steps and notes. */
export function DreamView({ d, onBack }: { d: LifeItem; onBack: () => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState('');
  const [notes, setNotes] = useState(d.notes);
  const [busy, setBusy] = useState(false);
  const p = progressOf(d);
  const c = dreamCat(d.category);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try { await addPhotos(d.id, files); } finally { setBusy(false); if (file.current) file.current.value = ''; }
  };

  return (
    <div className="screen fade-in dream-view">
      <div className="mod-top"><button className="label" onClick={onBack}><ArrowLeft size={14} /> Life Canvas</button></div>

      <div className="hero">
        <Cover d={d} />
        <div className="hero-text">
          <span className="label"><c.icon size={11} /> {c.name}{d.achieved ? ` · came true ${fmtDay(d.achieved)}` : ''}</span>
          <h1 className="display">{d.title}</h1>
        </div>
      </div>
      {d.description && <p className="feel">“{d.description}”</p>}

      <button className={`btn achieve ${d.achieved ? 'on' : ''}`} onClick={() => toggleAchieved(d.id)}>
        <Trophy size={14} /> {d.achieved ? 'It came true' : `Mark it as come true · +${LIFE_RULES.achievedExp} EXP`}
      </button>

      <h2 className="label sub-h">Mood board · {d.photos.length}</h2>
      <div className="board">
        {d.photos.map((ph) => <Photo key={ph} id={ph} onRemove={() => removePhoto(d.id, ph)} />)}
        <button className="add-photo" onClick={() => file.current?.click()} disabled={busy}>
          <ImagePlus size={20} strokeWidth={1.4} />
          <span>{busy ? 'Adding…' : 'Add photos'}</span>
        </button>
        <input ref={file} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
      </div>

      <h2 className="label sub-h">Steps to get there{p !== null ? ` · ${p}%` : ''}</h2>
      <ul className="ms-list">
        {d.milestones.map((m) => (
          <li key={m.id} className={m.done ? 'done' : ''}>
            <button className="step-box" aria-label={m.done ? 'Reopen' : 'Done'} onClick={() => toggleDreamMilestone(d.id, m.id)}>{m.done && <Check size={11} strokeWidth={3} />}</button>
            <span>{m.title}</span>
            <button className="icon-btn" aria-label="Remove step" onClick={() => removeDreamMilestone(d.id, m.id)}><X size={13} /></button>
          </li>
        ))}
      </ul>
      <div className="step-add">
        <input className="field" placeholder="Add a step" value={step} onChange={(e) => setStep(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && step.trim()) { addDreamMilestone(d.id, step); setStep(''); } }} maxLength={60} />
        <button className="btn" disabled={!step.trim()} onClick={() => { addDreamMilestone(d.id, step); setStep(''); }}>Add</button>
      </div>

      <h2 className="label sub-h">Notes</h2>
      <textarea className="field notes" rows={5} placeholder="Anything: ideas, costs, places, people…" value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => editDream(d.id, { notes })} />

      <button className="link delete-dream" onClick={() => { if (confirm(`Remove "${d.title}" from your canvas?`)) { removeDream(d.id); onBack(); } }}>
        <Trash2 size={12} /> Remove this dream
      </button>
    </div>
  );
}

function Photo({ id, onRemove }: { id: string; onRemove: () => void }) {
  const url = usePhoto(id);
  return (
    <div className="photo">
      {url && <img src={url} alt="" />}
      <button aria-label="Remove photo" onClick={onRemove}><X size={12} /></button>
    </div>
  );
}
