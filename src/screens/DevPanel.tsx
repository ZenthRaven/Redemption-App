import { RULES, badgeById, levelInfo } from '../engine/rules';
import { hoursLeft, lockedVault, recoveryActive, useGame, useToasts } from '../engine/store';
import { HOUR, fmtLeft } from '../engine/time';
import { useClock } from '../engine/useClock';
import { DEFAULT_ROUTINE, useData } from '../data/store';
import { dayKey, now } from '../engine/time';
import { setRoutine } from '../features/time/timebank';
import { go } from '../router';
import './dev-panel.css';

// Test bench for the game engine. Fires the same actions the real modules will call.
export function DevPanel() {
  const t = useClock(1000);
  const g = useGame();
  const toast = useToasts((s) => s.push);
  const lv = levelInfo(g.exp);
  const fail = (msg: string) => toast({ text: msg, tone: 'loss' });
  const data = useData();

  // Fills every module's data plus a typical day in the Time Bank, so the HUD has something to show.
  const seed = () => {
    data.seedSample();
    setRoutine(DEFAULT_ROUTINE);
    g.allocate(2, 'projects', 'Redemption app');
    g.allocate(1, 'manual', 'Family', undefined, 'family');
    // a week of history so the Time Bank reports have something to show
    for (let i = 1; i <= 6; i++) {
      const d = dayKey(now() - i * 86_400_000);
      DEFAULT_ROUTINE.forEach((r) => g.allocate(r.hours, 'template', r.cat, d, r.cat));
      g.allocate([2, 1, 0, 3, 1.5, 2][i - 1] || 0.5, 'projects', 'Redemption app', d);
      g.allocate([0.75, 0.75, 1, 0, 0.75, 0.75][i - 1] || 0.5, 'learning', 'Japanese N5', d);
      g.allocate([1, 2, 0.5, 1, 3, 2][i - 1], 'manual', 'Entertainment', d, 'leisure');
    }
    toast({ text: 'Sample life loaded', tone: 'info' });
  };

  const actions: [string, () => void][][] = [
    [
      ['+5 F-Coins', () => g.earn('f', 5, 'Stayed under budget')],
      ['+5 H-Coins', () => g.earn('h', 5, 'Habit streak')],
      ['+5 L-Coins', () => g.earn('l', 5, 'Paid a bill on time')],
    ],
    [
      ['Complete daily (+20)', () => g.gainExp(RULES.commissionExp.daily, 'Daily commission')],
      ['Complete weekly (+60)', () => g.gainExp(RULES.commissionExp.weekly, 'Weekly commission')],
      ['Miss daily (-40 → Vault)', () => g.penalize(RULES.commissionExp.daily * RULES.missPenaltyFactor, 'Missed daily commission')],
    ],
    [
      ['Allocate 2h project', () => g.allocate(2, 'projects', 'Project work') || fail('Not enough Time Credits')],
      ['Allocate 8h sleep', () => g.allocate(8, 'template', 'Sleep') || fail('Not enough Time Credits')],
      ['Buy 1h leisure (10 LC)', () => g.buyLeisureHours(1) || fail('Need 10 Leisure + 1h free')],
    ],
    [
      ['Recovery Mode', () => g.activateRecovery() || fail('No charges left or already on')],
      ['Break contract (-15 LC)', () => g.spendLeisure(RULES.contractBreakLeisure, 'Contract break') || fail('Not enough Leisure')],
      ['+24h time', () => g.devAdvance(24)],
      ['+30 days', () => g.devAdvance(24 * 30)],
    ],
  ];

  const stats: [string, string | number][] = [
    ['Level', lv.level],
    ['Total EXP', g.exp],
    ['Leisure', g.leisure],
    ['Time left today', `${hoursLeft(g)}h / ${RULES.dailyHours}h`],
    ['Recovery', `${RULES.recoveryPerMonth - g.recovery.used} left${recoveryActive(g) ? ' · ON' : ''}`],
    ['Clock offset', `+${Math.round(g.devOffset / HOUR)}h`],
  ];

  return (
    <div className="screen dev fade-in">
      <span className="label">Dev · Test bench</span>
      <h1 className="display" style={{ fontSize: 40, margin: '8px 0 20px' }}>Game engine</h1>

      <div className="dev-stats">
        {stats.map(([k, v]) => (
          <div key={k}><span className="label">{k}</span><b>{v}</b></div>
        ))}
      </div>

      <div className="dev-row">
        <button onClick={seed}>Load sample life</button>
        <button onClick={() => data.clear()}>Clear module data</button>
        <button onClick={() => go('/')}>View HUD →</button>
      </div>

      {actions.map((row, i) => (
        <div key={i} className="dev-row">
          {row.map(([label, fn]) => <button key={label} onClick={fn}>{label}</button>)}
        </div>
      ))}

      <h2 className="label dev-h">Redemption Vault</h2>
      {g.vault.length === 0 && <p className="dev-empty">Empty. Miss a commission to fill it.</p>}
      {g.vault.slice(0, 6).map((v) => (
        <div key={v.id} className={`dev-vault ${v.status}`}>
          <div>
            <b>{v.amount} EXP</b> <span>{v.reason}</span>
            <small>{v.status === 'locked' ? `${fmtLeft(v.expiresAt - t)} left · redeem for ${Math.round(v.amount * RULES.vaultMultiplier)}` : v.status}</small>
          </div>
          {v.status === 'locked' && <button onClick={() => g.redeem(v.id)}>Redeem</button>}
        </div>
      ))}
      {lockedVault(g).length > 0 && <p className="dev-empty">Grace window: {RULES.vaultGraceHours}h. Use “+24h time” to watch it expire.</p>}

      <h2 className="label dev-h">Badges · {g.badges.length}</h2>
      <div className="dev-badges">
        {g.badges.length === 0 && <p className="dev-empty">None yet. First tier at 10 coins.</p>}
        {g.badges.map((b) => <span key={b}>{badgeById(b)?.name}</span>)}
      </div>

      <h2 className="label dev-h">Event log</h2>
      <ul className="dev-log">
        {g.log.slice(0, 15).map((e) => <li key={e.id}>{e.text}</li>)}
      </ul>

      <button className="dev-reset" onClick={() => confirm('Reset all game data?') && g.reset()}>Reset all data</button>
    </div>
  );
}
