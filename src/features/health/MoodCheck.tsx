import { useState } from 'react';
import { useData } from '../../data/store';
import { DAY, dayKey, now } from '../../engine/time';
import { MOOD_QUESTIONS, saveMood, todayMood } from './health';

const moodHue = (score: number) => (score >= 62 ? 'var(--good)' : score >= 45 ? 'var(--mid)' : score >= 28 ? 'var(--leisure)' : 'var(--bad)');

/** Five quick questions → a 0–100 mood score shown as a glowing orb, plus a 14-day trail. */
export function MoodCheck() {
  const mood = useData((s) => s.health.mood);
  const today = todayMood();
  const [answers, setAnswers] = useState<number[]>(() => today?.answers ?? []);
  const [retake, setRetake] = useState(false);
  const asking = !today || retake;
  const days = Array.from({ length: 14 }, (_, i) => dayKey(now() - (13 - i) * DAY));

  return (
    <div className="mood">
      {asking ? (
        <div className="form">
          {MOOD_QUESTIONS.map((q, i) => (
            <label key={q.q}>
              <span className="mood-q">{q.q}</span>
              <div className="scale">
                {[1, 2, 3, 4, 5].map((v) => (
                  <button key={v} className={answers[i] === v ? 'on' : ''} onClick={() => setAnswers((prev) => { const a = [...prev]; a[i] = v; return a; })}>{v}</button>
                ))}
              </div>
              <span className="scale-ends"><small>{q.low}</small><small>{q.high}</small></span>
            </label>
          ))}
          <button
            className="btn primary"
            disabled={answers.filter(Boolean).length < MOOD_QUESTIONS.length}
            onClick={() => { saveMood(answers); setRetake(false); }}
          >Save check-in</button>
        </div>
      ) : (
        <div className="mood-result fade-in">
          <div className="orb" style={{ ['--hue' as string]: moodHue(today!.score) }}>
            <b>{today!.score}</b>
            <span>{today!.label}</span>
          </div>
          <button className="link" onClick={() => setRetake(true)}>Retake today's check-in</button>
        </div>
      )}

      <span className="label">Last 14 days</span>
      <div className="mood-trail">
        {days.map((d) => {
          const m = mood.find((x) => x.date === d);
          return (
            <div key={d} className="trail-col" title={m ? `${d}: ${m.score} ${m.label}` : d}>
              {m ? <i style={{ bottom: `${m.score}%`, background: moodHue(m.score) }} /> : <i className="empty" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
