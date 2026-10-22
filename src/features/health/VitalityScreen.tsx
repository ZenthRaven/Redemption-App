import { useState } from 'react';
import { ArrowLeft, CalendarPlus, HeartPulse, Stethoscope } from 'lucide-react';
import { useData } from '../../data/store';
import { useGame } from '../../engine/store';
import { go } from '../../router';
import { BodyMap } from './BodyMap';
import { bookCheckup, checkupAlerts, clearBodyToday, recoveryReason, recoveryState, setZone, snoozeCheckup, todayBody } from './health';
import { MoodCheck } from './MoodCheck';
import { WeightPanel } from './WeightPanel';
import { ZONES, levelColor } from './zones';
import './health.css';

export function VitalityScreen() {
  useData((s) => s.health); // re-render on any health change
  useGame((s) => s.recovery);
  const [tab, setTab] = useState<'body' | 'mind' | 'weight'>('body');

  const body = todayBody();
  const values = body?.zones ?? {};
  const alerts = checkupAlerts();
  const reason = recoveryReason();
  const rec = recoveryState();
  const marked = ZONES.filter((z) => values[z.id] !== undefined);

  return (
    <div className="screen fade-in">
      <div className="mod-top"><button className="label" onClick={() => go('/')}><ArrowLeft size={14} /> HUD</button></div>
      <span className="label">Module 09 · Body & mind</span>
      <h1 className="display mod-title">Vitality</h1>

      {rec.active ? (
        <div className="notice info"><HeartPulse size={16} /><p><b>Recovery Mode is on today.</b> Penalties are paused. Rest is part of the game.</p></div>
      ) : reason && (
        <div className="notice recover">
          <HeartPulse size={16} />
          <div>
            <p><b>You seem run down.</b> {reason} Recovery Mode pauses today's penalties.</p>
            {rec.left > 0
              ? <button className="btn" onClick={() => useGame.getState().activateRecovery()}>Activate Recovery Mode · {rec.left} left this month</button>
              : <p className="plan dim">No Recovery charges left this month.</p>}
          </div>
        </div>
      )}

      {alerts.map((a) => (
        <div key={a.zone} className="notice warn">
          <Stethoscope size={16} />
          <div>
            <p><b>{a.name}</b> has felt bad on {a.days} of your last 7 reports. Consider getting it checked.</p>
            <div className="notice-actions">
              <button className="btn" onClick={() => bookCheckup(a.zone)}><CalendarPlus size={13} /> Add checkup tomorrow</button>
              <button className="link" onClick={() => snoozeCheckup(a.zone)}>Not now</button>
            </div>
          </div>
        </div>
      ))}

      <div className="tabs">
        <button className={tab === 'body' ? 'on' : ''} onClick={() => setTab('body')}>Body</button>
        <button className={tab === 'mind' ? 'on' : ''} onClick={() => setTab('mind')}>Mind</button>
        <button className={tab === 'weight' ? 'on' : ''} onClick={() => setTab('weight')}>Weight & BMI</button>
      </div>

      {tab === 'body' && (
        <>
          <div className="board-head">
            <div><span className="label">Today's body</span><div className="display board-count">{body ? `${body.score}%` : '—'}</div></div>
            <div className="board-meta"><span>{marked.length} of {ZONES.length} parts checked</span>{body && <button className="link" onClick={clearBodyToday}>Clear today</button>}</div>
          </div>
          <p className="howto"><b>Tap</b> = fine · <b>double-tap</b> = unwell · <b>hold, then drag up</b> = how good it feels</p>
          <BodyMap values={values} onSet={setZone} />
          {marked.length > 0 && (
            <div className="zone-chips">
              {marked.map((z) => (
                <span key={z.id}><i style={{ background: levelColor(values[z.id]) }} />{z.name} {values[z.id]}%</span>
              ))}
            </div>
          )}
        </>
      )}
      {tab === 'mind' && <MoodCheck />}
      {tab === 'weight' && <WeightPanel />}
    </div>
  );
}
