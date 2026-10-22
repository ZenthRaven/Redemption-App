import { useState } from 'react';
import { useData } from '../../data/store';
import { fmtDay } from '../../engine/time';
import { bmiOf, logWeight, setGoal, setHeight } from './health';

const BMI_MIN = 15;
const BMI_MAX = 35;

export function WeightPanel() {
  const { weights, heightCm, goalKg } = useData((s) => s.health);
  const latest = weights.at(-1);
  const [kg, setKg] = useState(latest ? String(latest.kg) : '');
  const [cm, setCm] = useState(heightCm ? String(heightCm) : '');
  const [goal, setGoalInput] = useState(goalKg ? String(goalKg) : '');
  const bmi = bmiOf(latest?.kg, heightCm);
  const num = (v: string) => v.replace(/[^\d.]/g, '');

  const pts = weights.slice(-12);
  const lo = Math.min(...pts.map((w) => w.kg), goalKg ?? Infinity) - 1;
  const hi = Math.max(...pts.map((w) => w.kg)) + 1;
  const path = pts.map((w, i) => `${i ? 'L' : 'M'}${(i / Math.max(1, pts.length - 1)) * 300},${100 - ((w.kg - lo) / (hi - lo)) * 100}`).join(' ');

  return (
    <div className="weight">
      <div className="weight-top">
        <div>
          <span className="label">BMI</span>
          <div className="display bmi" style={{ color: bmi?.color }}>{bmi ? bmi.v : '—'}</div>
          <span className="bmi-cat">{bmi ? bmi.cat : heightCm ? 'Log your weight' : 'Add your height'}</span>
        </div>
        <div className="weight-now">
          <span className="label">Weight</span>
          <b>{latest ? `${latest.kg} kg` : '—'}</b>
          {goalKg && latest && <small>{Math.abs(Math.round((latest.kg - goalKg) * 10) / 10)} kg to goal</small>}
        </div>
      </div>

      {bmi && (
        <div className="bmi-scale">
          <i style={{ left: `${((Math.min(BMI_MAX, Math.max(BMI_MIN, bmi.v)) - BMI_MIN) / (BMI_MAX - BMI_MIN)) * 100}%` }} />
          <span style={{ left: `${((18.5 - BMI_MIN) / (BMI_MAX - BMI_MIN)) * 100}%` }}>18.5</span>
          <span style={{ left: `${((25 - BMI_MIN) / (BMI_MAX - BMI_MIN)) * 100}%` }}>25</span>
          <span style={{ left: `${((30 - BMI_MIN) / (BMI_MAX - BMI_MIN)) * 100}%` }}>30</span>
        </div>
      )}

      {pts.length > 1 && (
        <svg className="weight-chart" viewBox="0 0 300 100" preserveAspectRatio="none">
          {goalKg && <line x1="0" x2="300" y1={100 - ((goalKg - lo) / (hi - lo)) * 100} y2={100 - ((goalKg - lo) / (hi - lo)) * 100} className="goal" />}
          <path d={path} />
        </svg>
      )}
      {pts.length > 1 && <div className="chart-ends"><small>{fmtDay(pts[0].date)}</small><small>{fmtDay(pts.at(-1)!.date)}</small></div>}

      <div className="form">
        <div className="step-add">
          <input className="field" inputMode="decimal" placeholder="Today's weight (kg)" value={kg} onChange={(e) => setKg(num(e.target.value))} />
          <button className="btn" disabled={!(parseFloat(kg) > 20)} onClick={() => logWeight(parseFloat(kg))}>Log</button>
        </div>
        <div className="two">
          <label><span className="label">Height (cm)</span>
            <input className="field" inputMode="decimal" value={cm} onChange={(e) => setCm(num(e.target.value))} onBlur={() => setHeight(parseFloat(cm))} />
          </label>
          <label><span className="label">Goal (kg)</span>
            <input className="field" inputMode="decimal" value={goal} onChange={(e) => setGoalInput(num(e.target.value))} onBlur={() => setGoal(parseFloat(goal))} />
          </label>
        </div>
      </div>
    </div>
  );
}
