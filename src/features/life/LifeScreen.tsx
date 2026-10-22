import { useState } from 'react';
import { ArrowLeft, Check, Eye, Plus, Sparkles, Trophy } from 'lucide-react';
import { Sheet } from '../../components/Sheet';
import { fmtMoney, useData, type LifeItem } from '../../data/store';
import { usePhoto } from '../../data/photos';
import { dayKey, fmtDay } from '../../engine/time';
import { go } from '../../router';
import { DreamForm } from './DreamForm';
import { DreamView } from './DreamView';
import { LIFE_RULES, dreamCat, progressOf, reflect, todaysDream, toggleWishBought } from './life';
import './life.css';

export function LifeScreen() {
  const { life, wishes, currency } = useData();
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const current = life.find((d) => d.id === open);
  if (current) return <DreamView d={current} onBack={() => setOpen(null)} />;

  const dreams = life.filter((d) => !d.achieved);
  const achieved = life.filter((d) => d.achieved);
  const today = todaysDream(life);

  return (
    <div className="screen fade-in">
      <div className="mod-top"><button className="label" onClick={() => go('/')}><ArrowLeft size={14} /> HUD</button></div>
      <span className="label">Module 10 · Everything you want from life</span>
      <h1 className="display mod-title">Life Canvas</h1>

      {today && <Reflection d={today.dream} prompt={today.prompt} onOpen={() => setOpen(today.dream.id)} />}

      <button className="btn add-btn" onClick={() => setAdding(true)}><Plus size={14} /> Add a dream</button>
      {life.length === 0 && <p className="quiet">Write down the things you want to do, see, own and become. Give each one a picture and a feeling.</p>}

      <div className="canvas">
        {dreams.map((d, i) => <DreamCard key={d.id} d={d} tall={i % 3 === 0} onOpen={() => setOpen(d.id)} />)}
      </div>

      {achieved.length > 0 && (
        <>
          <h2 className="label sub-h">Came true · {achieved.length}</h2>
          <ul className="entries">
            {achieved.map((d) => (
              <li key={d.id} onClick={() => setOpen(d.id)}>
                <span>{fmtDay(d.achieved!)}</span>
                <span className="entry-note"><Trophy size={13} className="gold" /> {d.title}</span>
                <b />
                <span />
              </li>
            ))}
          </ul>
        </>
      )}

      {wishes.length > 0 && (
        <>
          <h2 className="label sub-h">Wishlist · funded by buffer money</h2>
          <ul className="entries">
            {wishes.map((w) => (
              <li key={w.id} className={w.bought ? 'bought' : ''}>
                <span>{fmtDay(dayKey(w.t))}</span>
                <span className="entry-note">{w.title}</span>
                <b>{fmtMoney(w.amount, currency)}</b>
                <button aria-label={w.bought ? 'Mark not bought' : 'Mark bought'} onClick={() => toggleWishBought(w.id)}>{w.bought ? <Check size={14} className="good" /> : <Check size={14} />}</button>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="rules">
        <span className="label">Living the canvas</span>
        <p>Each day one dream comes up for a moment of reflection (+{LIFE_RULES.reflectExp} EXP). Steps toward a dream +{LIFE_RULES.milestoneExp} EXP. When one comes true, +{LIFE_RULES.achievedExp} EXP. Leftover salary you choose to spend at month end lands in the wishlist.</p>
      </div>

      <Sheet open={adding} onClose={() => setAdding(false)}>
        <DreamForm onDone={(id) => { setAdding(false); if (id) setOpen(id); }} />
      </Sheet>
    </div>
  );
}

export function Cover({ d, className }: { d: LifeItem; className?: string }) {
  const url = usePhoto(d.photos[0]);
  const c = dreamCat(d.category);
  return (
    <div className={`cover ${className ?? ''}`} style={{ ['--h1' as string]: c.hue[0], ['--h2' as string]: c.hue[1] }}>
      {url ? <img src={url} alt="" /> : <c.icon size={28} strokeWidth={1.2} className="cover-icon" />}
    </div>
  );
}

function DreamCard({ d, tall, onOpen }: { d: LifeItem; tall: boolean; onOpen: () => void }) {
  const p = progressOf(d);
  return (
    <button className={`dream-card ${tall ? 'tall' : ''}`} onClick={onOpen}>
      <Cover d={d} />
      <div className="dream-meta">
        <span className="label">{dreamCat(d.category).name}</span>
        <h3>{d.title}</h3>
        {p !== null && <div className="bar"><div className="bar-fill" style={{ width: `${p}%` }} /></div>}
      </div>
    </button>
  );
}

function Reflection({ d, prompt, onOpen }: { d: LifeItem; prompt: string; onOpen: () => void }) {
  const done = d.reflections.includes(dayKey());
  return (
    <section className="reflection">
      <Cover d={d} className="reflection-bg" />
      <div className="reflection-body">
        <span className="label"><Sparkles size={11} /> Today's dream</span>
        <h3 onClick={onOpen}>{d.title}</h3>
        <p className="reflection-feel">{d.description}</p>
        <p className="reflection-prompt">{prompt}</p>
        <button className={`btn ${done ? 'done' : ''}`} disabled={done} onClick={() => reflect(d.id)}>
          {done ? <><Check size={13} /> You pictured it today</> : <><Eye size={13} /> I pictured it</>}
        </button>
      </div>
    </section>
  );
}
