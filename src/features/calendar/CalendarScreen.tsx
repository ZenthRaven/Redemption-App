import { useState } from 'react';
import { ArrowLeft, Bell, ChevronLeft, ChevronRight, Flag, Landmark, MapPin, Plus, Users, CalendarDays } from 'lucide-react';
import { Sheet } from '../../components/Sheet';
import { fmtMoney, useData, type CalEvent } from '../../data/store';
import { dayKey, now, parseDay } from '../../engine/time';
import { go } from '../../router';
import { byTime, monthGrid, remindLabel } from './calendar';
import { EventForm } from './EventForm';
import { toneName } from './tones';
import './calendar.css';

const KIND_ICON = { meeting: Users, event: CalendarDays, deadline: Flag };
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const longDay = (d: string) => new Date(parseDay(d)).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });

export function CalendarScreen() {
  const { events, liabilities, currency } = useData();
  const today = dayKey();
  const [cursor, setCursor] = useState(() => { const d = new Date(now()); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [selected, setSelected] = useState(today);
  const [form, setForm] = useState<{ edit?: CalEvent } | null>(null);

  const grid = monthGrid(cursor.y, cursor.m);
  const monthLabel = new Date(cursor.y, cursor.m, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const shiftMonth = (n: number) => setCursor(({ y, m }) => ({ y: y + Math.floor((m + n) / 12), m: (m + n + 12) % 12 }));
  const goToday = () => { const d = new Date(now()); setCursor({ y: d.getFullYear(), m: d.getMonth() }); setSelected(today); };

  const dues = liabilities.filter((l) => !l.closed);
  const dayEvents = events.filter((e) => e.date === selected).sort(byTime);
  const dayDues = dues.filter((l) => l.dueDate === selected);
  const upcoming = events.filter((e) => e.date > selected && e.date >= today).sort(byTime).slice(0, 5);

  return (
    <div className="screen fade-in">
      <div className="mod-top"><button className="label" onClick={() => go('/')}><ArrowLeft size={14} /> HUD</button></div>
      <span className="label">Module 05 · Events & deadlines</span>
      <h1 className="display mod-title">Calendar</h1>

      <div className="cal-head">
        <button aria-label="Previous month" onClick={() => shiftMonth(-1)}><ChevronLeft size={18} /></button>
        <span className="display cal-month">{monthLabel}</span>
        <button aria-label="Next month" onClick={() => shiftMonth(1)}><ChevronRight size={18} /></button>
      </div>
      {selected !== today && <button className="link cal-today" onClick={goToday}>Back to today</button>}

      <div className="cal-grid">
        {WEEKDAYS.map((w, i) => <span key={i} className="cal-wd">{w}</span>)}
        {grid.map((d) => {
          const inMonth = +d.slice(5, 7) - 1 === cursor.m;
          const evs = events.filter((e) => e.date === d);
          const due = dues.some((l) => l.dueDate === d);
          return (
            <button
              key={d}
              className={`cal-day ${inMonth ? '' : 'out'} ${d === today ? 'is-today' : ''} ${d === selected ? 'sel' : ''} ${d < today ? 'past' : ''}`}
              onClick={() => setSelected(d)}
            >
              <span>{+d.slice(8)}</span>
              <span className="cal-dots">
                {evs.some((e) => e.kind !== 'deadline') && <i className="d-event" />}
                {evs.some((e) => e.kind === 'deadline') && <i className="d-deadline" />}
                {due && <i className="d-due" />}
              </span>
            </button>
          );
        })}
      </div>
      <div className="cal-legend"><span><i className="d-event" />Event</span><span><i className="d-deadline" />Deadline</span><span><i className="d-due" />Payment due</span></div>

      <div className="section-head agenda-head">
        <span className="label">{selected === today ? 'Today' : longDay(selected)}</span>
        <span className="label">{dayEvents.length + dayDues.length}</span>
      </div>
      <button className="btn add-btn" onClick={() => setForm({})}><Plus size={14} /> Add to {selected === today ? 'today' : longDay(selected)}</button>

      {dayEvents.length + dayDues.length === 0 && <p className="quiet">Nothing scheduled.</p>}
      <ul className="agenda">
        {dayEvents.map((e) => <EventRow key={e.id} e={e} onOpen={() => setForm({ edit: e })} />)}
        {dayDues.map((l) => (
          <li key={l.id} className="ag-item due" onClick={() => go('/m/liabilities')}>
            <span className="ag-time">Due</span>
            <span className="ag-body"><b>{l.name}</b><small><Landmark size={11} /> {fmtMoney(l.amount, currency)} payment</small></span>
          </li>
        ))}
      </ul>

      {upcoming.length > 0 && (
        <>
          <h2 className="label sub-h">Coming up</h2>
          <ul className="agenda compact">
            {upcoming.map((e) => <EventRow key={e.id} e={e} showDate onOpen={() => { setSelected(e.date); setForm({ edit: e }); }} />)}
          </ul>
        </>
      )}

      <Sheet open={!!form} onClose={() => setForm(null)}>
        {form && <EventForm date={selected} edit={form.edit} onDone={() => setForm(null)} />}
      </Sheet>
    </div>
  );
}

function EventRow({ e, onOpen, showDate }: { e: CalEvent; onOpen: () => void; showDate?: boolean }) {
  const Icon = KIND_ICON[e.kind];
  const past = e.date + e.time < dayKey() + new Date(now()).toTimeString().slice(0, 5);
  return (
    <li className={`ag-item ${e.kind} ${past ? 'past' : ''}`} onClick={onOpen}>
      <span className="ag-time">{showDate ? <>{e.date.slice(8)}/{e.date.slice(5, 7)}<br /></> : null}{e.time}</span>
      <span className="ag-body">
        <b><Icon size={13} /> {e.title}</b>
        {e.location && (
          <a href={`https://maps.google.com/?q=${encodeURIComponent(e.location)}`} target="_blank" rel="noreferrer" onClick={(ev) => ev.stopPropagation()}>
            <MapPin size={11} /> {e.location}
          </a>
        )}
        <small><Bell size={11} /> {remindLabel(e.remind)} · {toneName(e.tone)}</small>
      </span>
    </li>
  );
}
