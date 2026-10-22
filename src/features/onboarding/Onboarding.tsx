import { useState } from 'react';
import { ArrowLeft, ArrowRight, Compass, Crosshair, Rocket, Sparkles } from 'lucide-react';
import { useData } from '../../data/store';
import { useGame } from '../../engine/store';
import { MODULES } from '../../modules';
import { go } from '../../router';
import { TOUR } from './tourSteps';
import './onboarding.css';

const TOUR_EXP = 50;

const RULE_LINES: Record<string, string> = {
  finance: 'Two taps per spend. Stay within your daily allowance for F-Coins.',
  liabilities: 'Reminders at 10, 5, 2 days and the night before. Paying on time earns L-Coins.',
  habits: 'Build good habits, starve bad ones. Streaks earn H-Coins.',
  commissions: 'Quests earn EXP. Miss one and it goes to the Redemption Vault: win it back at 1.5×.',
  calendar: 'Meetings and deadlines with location and alarm tone.',
  learning: 'Lock in a skill. No delete button until you finish.',
  time: 'Every hour has a home. Your routine pre-fills each day.',
  projects: 'Daily time budget, milestones, deadlines.',
  health: 'Tap your body map, check your mood. Rough days unlock Recovery Mode.',
  life: 'Everything you want from life, with photos and steps to get there.',
};

// Quick Intro: one slide for the HUD, one per module.
const SLIDES = [
  { icon: Crosshair, name: 'The Life HUD', line: 'Your cockpit. Level, coins, money left this month, today\'s 24 hours and quests, your body and your dreams, at a glance.', rule: 'Everything you do feeds one game: EXP, levels and badges.' },
  ...MODULES.map((m) => ({ icon: m.icon, name: m.name, line: m.tagline, rule: RULE_LINES[m.id] })),
];

export function Onboarding() {
  const finish = (mode: 'intro' | 'tour') => {
    useData.setState({ onboarded: true });
    if (mode === 'tour') useGame.getState().gainExp(TOUR_EXP, 'Full Tour complete');
    go('/');
  };
  const [mode, setMode] = useState<'welcome' | 'intro' | 'tour'>('welcome');

  return (
    <div className="onboard">
      {mode === 'welcome' && <Welcome onPick={setMode} />}
      {mode === 'intro' && <QuickIntro onDone={() => finish('intro')} onBack={() => setMode('welcome')} />}
      {mode === 'tour' && <FullTour onDone={() => finish('tour')} onBack={() => setMode('welcome')} />}
    </div>
  );
}

function Welcome({ onPick }: { onPick: (m: 'intro' | 'tour') => void }) {
  return (
    <div className="welcome fade-in">
      <div className="wordmark big" aria-label="Redemption"><span>Redemption</span><span>Redemption</span><span>Redemption</span></div>
      <p className="welcome-line">Your life is the game.<br />Play it to win.</p>
      <div className="welcome-choices">
        <button onClick={() => onPick('intro')}>
          <Compass size={22} strokeWidth={1.4} />
          <b>Quick introduction</b>
          <small>One minute. See what each part does, then explore on your own.</small>
        </button>
        <button className="primary" onClick={() => onPick('tour')}>
          <Rocket size={22} strokeWidth={1.4} />
          <b>Full tour · 5 min</b>
          <small>Set up 2–3 real items in every part so your HUD is alive today. +{TOUR_EXP} EXP.</small>
        </button>
      </div>
    </div>
  );
}

function QuickIntro({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const [i, setI] = useState(0);
  const s = SLIDES[i];
  const last = i === SLIDES.length - 1;
  return (
    <div className="intro">
      <div className="intro-top">
        <button className="label" onClick={i ? () => setI(i - 1) : onBack}><ArrowLeft size={14} /> Back</button>
        <button className="label" onClick={onDone}>Skip</button>
      </div>
      <div key={i} className="slide fade-in">
        <span className="label">{String(i + 1).padStart(2, '0')} / {SLIDES.length}</span>
        <s.icon size={44} strokeWidth={1.1} className="slide-icon" />
        <h1 className="display">{s.name}</h1>
        <p className="slide-line">{s.line}</p>
        <p className="slide-rule">{s.rule}</p>
      </div>
      <div className="dots-row">{SLIDES.map((_, j) => <i key={j} className={j === i ? 'on' : ''} onClick={() => setI(j)} />)}</div>
      <button className="btn primary" onClick={last ? onDone : () => setI(i + 1)}>{last ? 'Start playing' : <>Next <ArrowRight size={14} /></>}</button>
    </div>
  );
}

function FullTour({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const d = useData();
  const [i, setI] = useState(0);
  const step = TOUR[i];
  if (!step) return <TourDone onDone={onDone} />;
  const have = step.count(d);
  const ready = have >= step.min;

  return (
    <div className="tour">
      <div className="intro-top">
        <button className="label" onClick={i ? () => setI(i - 1) : onBack}><ArrowLeft size={14} /> Back</button>
        <span className="label">{i + 1} / {TOUR.length}</span>
      </div>
      <div className="bar"><div className="bar-fill" style={{ width: `${((i + (ready ? 1 : 0.5)) / TOUR.length) * 100}%` }} /></div>
      <div key={step.id} className="tour-body fade-in">
        <h1 className="display">{step.title}</h1>
        <p className="plan">{step.why}</p>
        <div className="form">{step.body(d)}</div>
      </div>
      <div className="tour-foot">
        <span className={`hint ${ready ? 'ok' : ''}`}>{ready ? 'Done. Nice.' : `${have} of ${step.min} added`}</span>
        <button className="btn primary" disabled={!ready} onClick={() => setI(i + 1)}>{i === TOUR.length - 1 ? 'Finish' : 'Next'}</button>
        {step.skip && !ready && <button className="link" onClick={() => setI(i + 1)}>{step.skip}</button>}
      </div>
    </div>
  );
}

function TourDone({ onDone }: { onDone: () => void }) {
  return (
    <div className="welcome fade-in">
      <Sparkles size={40} strokeWidth={1.2} className="slide-icon" />
      <h1 className="display">Your game is set.</h1>
      <p className="welcome-line">Every part of your life now has a place. Check in each night and watch it add up.</p>
      <button className="btn primary" onClick={onDone}>Open my HUD · +{TOUR_EXP} EXP</button>
    </div>
  );
}
