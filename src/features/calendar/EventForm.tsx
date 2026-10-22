import { useState } from 'react';
import { Volume2 } from 'lucide-react';
import type { CalEvent } from '../../data/store';
import { REMIND_OPTIONS, addEvent, removeEvent, updateEvent, type EventDraft } from './calendar';
import { TONES, playTone } from './tones';

const KINDS: [CalEvent['kind'], string][] = [['meeting', 'Meeting'], ['event', 'Event'], ['deadline', 'Deadline']];

export function EventForm({ date, edit, onDone }: { date: string; edit?: CalEvent; onDone: () => void }) {
  const [e, setE] = useState<EventDraft>(() => edit ?? { title: '', kind: 'event', date, time: '09:00', location: '', remind: 30, tone: 'chime', note: '' });
  const set = <K extends keyof EventDraft>(k: K, v: EventDraft[K]) => setE((x) => ({ ...x, [k]: v }));
  const valid = e.title.trim() && e.date && e.time;

  const save = () => {
    if (!valid) return;
    const clean = { ...e, title: e.title.trim(), location: e.location?.trim() || undefined, note: e.note?.trim() || undefined };
    if (edit) updateEvent(edit.id, clean); else addEvent(clean);
    onDone();
  };

  return (
    <div className="form">
      <span className="label">{edit ? 'Edit' : 'New'} {e.kind}</span>
      <input className="field" placeholder="Title" value={e.title} onChange={(x) => set('title', x.target.value)} maxLength={60} autoFocus={!edit} />
      <div className="seg">
        {KINDS.map(([k, label]) => <button key={k} className={e.kind === k ? 'on' : ''} onClick={() => set('kind', k)}>{label}</button>)}
      </div>
      <div className="two">
        <label><span className="label">Date</span><input className="field" type="date" value={e.date} onChange={(x) => set('date', x.target.value)} /></label>
        <label><span className="label">Time</span><input className="field" type="time" value={e.time} onChange={(x) => set('time', x.target.value)} /></label>
      </div>
      <label><span className="label">Location (optional)</span>
        <input className="field" placeholder="Address or place" value={e.location ?? ''} onChange={(x) => set('location', x.target.value)} maxLength={80} />
      </label>
      <label><span className="label">Remind me</span>
        <div className="seg">
          {REMIND_OPTIONS.map(([v, label]) => <button key={v} className={e.remind === v ? 'on' : ''} onClick={() => set('remind', v)}>{label}</button>)}
        </div>
      </label>
      <label><span className="label">Alarm tone · tap to preview</span>
        <div className="tone-row">
          {TONES.map((t) => (
            <button key={t.id} className={e.tone === t.id ? 'on' : ''} onClick={() => { set('tone', t.id); playTone(t.id); }}>
              <Volume2 size={12} /> {t.name}
            </button>
          ))}
        </div>
      </label>
      <input className="field" placeholder="Note (optional)" value={e.note ?? ''} onChange={(x) => set('note', x.target.value)} maxLength={120} />
      <button className="btn primary" disabled={!valid} onClick={save}>{edit ? 'Save changes' : 'Add to calendar'}</button>
      {edit && <button className="btn" onClick={() => { if (confirm(`Delete "${edit.title}"?`)) { removeEvent(edit.id); onDone(); } }}>Delete</button>}
    </div>
  );
}
