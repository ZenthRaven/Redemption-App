import { useEffect, useState } from 'react';
import { AlarmClock, ArrowLeft, Bell, BellRing, Moon } from 'lucide-react';
import { useData, type NotifySettings } from '../data/store';
import { dayKey, now, parseDay } from '../engine/time';
import { TONES } from '../features/calendar/tones';
import { buildPlan, type Tier } from '../notify/plan';
import { exactAlarms, native, notifyPermission, openExactAlarmSettings, requestNotifyPermission, syncNotifications, testAlarm } from '../notify/sync';
import { go } from '../router';
import './settings.css';

const TIERS: { id: Tier; icon: typeof Bell; name: string; desc: string }[] = [
  { id: 'alarms', icon: AlarmClock, name: 'Hard alarms', desc: 'Loud, with the event\'s own tone. Meetings and events, payment countdowns (10, 5, 2 days and the night before), locked learning sessions.' },
  { id: 'nudges', icon: BellRing, name: 'Nudges', desc: 'Normal notifications. Good habits at their time, project milestones on the day, the nightly check-out.' },
  { id: 'briefings', icon: Moon, name: 'Briefings', desc: 'Silent. A morning summary, and an evening card with one of your dreams or a reality check.' },
];

const when = (t: number) => {
  const d = dayKey(t);
  const label = d === dayKey() ? 'Today' : d === dayKey(now() + 86_400_000) ? 'Tomorrow' : new Date(parseDay(d)).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
  return { label, time: new Date(t).toTimeString().slice(0, 5) };
};

export function Settings() {
  const n = useData((s) => s.notify);
  useData(); // the upcoming list follows every change
  const set = (patch: Partial<NotifySettings>) => useData.setState((s) => ({ notify: { ...s.notify, ...patch } }));
  const [perm, setPerm] = useState<string>('…');
  const [exact, setExact] = useState<string>('…');
  const [tone, setTone] = useState('chime');

  const refresh = () => { notifyPermission().then(setPerm); exactAlarms().then(setExact); };
  useEffect(refresh, []);

  const plan = buildPlan();
  const counts = { alarms: 0, nudges: 0, briefings: 0 } as Record<Tier, number>;
  plan.forEach((p) => counts[p.tier]++);
  let lastDay = '';

  return (
    <div className="screen fade-in settings-screen">
      <div className="mod-top"><button className="label" onClick={() => go('/modules')}><ArrowLeft size={14} /> Modules</button></div>
      <span className="label">Settings</span>
      <h1 className="display mod-title">Notifications</h1>

      {native() ? (
        <div className={`notice ${perm === 'granted' ? 'info' : 'warn'}`}>
          <Bell size={16} />
          <div>
            <p>{perm === 'granted' ? <><b>Notifications are on.</b> {plan.length} scheduled for the next 7 days.</> : <><b>Notifications are off.</b> Allow them so alarms and nudges can reach you.</>}</p>
            {perm !== 'granted' && <button className="btn" onClick={() => requestNotifyPermission().then(refresh)}>Allow notifications</button>}
            {perm === 'granted' && exact === 'denied' && (
              <>
                <p>Exact timing is off, so alarms may arrive a few minutes late.</p>
                <button className="btn" onClick={() => openExactAlarmSettings().then(refresh)}>Allow exact alarms</button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="notice info"><Bell size={16} /><p><b>Preview mode.</b> On the phone these are real Android notifications. Below is exactly what would be scheduled.</p></div>
      )}

      <div className="tier-list">
        {TIERS.map((t) => (
          <label key={t.id} className={`tier ${n[t.id] ? 'on' : ''}`}>
            <t.icon size={18} strokeWidth={1.5} />
            <span><b>{t.name} <small>{counts[t.id]} upcoming</small></b><small>{t.desc}</small></span>
            <input type="checkbox" className="switch" checked={n[t.id]} onChange={(e) => set({ [t.id]: e.target.checked })} />
          </label>
        ))}
      </div>

      <div className="time-grid">
        <label><span className="label">Morning briefing</span><input className="field" type="time" value={n.morning} onChange={(e) => e.target.value && set({ morning: e.target.value })} /></label>
        <label><span className="label">Evening briefing</span><input className="field" type="time" value={n.evening} onChange={(e) => e.target.value && set({ evening: e.target.value })} /></label>
        <label><span className="label">Nightly check-out</span><input className="field" type="time" value={n.checkout} onChange={(e) => e.target.value && set({ checkout: e.target.value })} /></label>
      </div>

      {native() && (
        <div className="test-row">
          <select className="field" value={tone} onChange={(e) => setTone(e.target.value)} aria-label="Alarm tone">
            {TONES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button className="btn" onClick={() => testAlarm(tone)}>Test alarm in 5s</button>
          <button className="btn" onClick={() => syncNotifications()}>Re-sync</button>
        </div>
      )}

      <h2 className="label sub-h">Coming up · next 7 days</h2>
      {plan.length === 0 && <p className="quiet">Nothing scheduled. Add events, payments, habits or learning commitments.</p>}
      <ul className="upcoming">
        {plan.map((p) => {
          const w = when(p.at);
          const head = w.label !== lastDay ? (lastDay = w.label) : null;
          return (
            <li key={p.key} className={p.tier}>
              {head && <span className="day-head">{head}</span>}
              <span className="up-time">{w.time}</span>
              <span className="up-body"><b>{p.title}</b><small>{p.body}</small></span>
              <i className={`tier-dot ${p.tier}`} title={p.tier} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
