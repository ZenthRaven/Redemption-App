import { useEffect, useState } from 'react';
import { ChevronRight, HeartPulse, Lock, Plus, Sparkles } from 'lucide-react';
import { levelInfo, RULES } from '../../engine/rules';
import { hoursUsed, lockedVault, recoveryActive, useGame } from '../../engine/store';
import { dayKey, fmtLeft } from '../../engine/time';
import { duesSoon, fmtMoney, learningActive, questline, undone, useData, walletInfo } from '../../data/store';
import { go } from '../../router';
import { useUI } from '../../ui';

const Ticks = () => (<><i className="tick tl" /><i className="tick tr" /><i className="tick bl" /><i className="tick br" /></>);

// 1 · Player status & Redemption bar
export function PlayerCard({ t }: { t: number }) {
  const g = useGame();
  const lv = levelInfo(g.exp);
  const vault = lockedVault(g);
  const vaultSum = vault.reduce((a, v) => a + v.amount, 0);
  const soonest = vault.length ? Math.min(...vault.map((v) => v.expiresAt)) - t : 0;

  return (
    <section className="frame player fade-in">
      <Ticks />
      <div className="player-row">
        <div>
          <span className="label">Level</span>
          <div className="display player-level">{String(lv.level).padStart(2, '0')}</div>
        </div>
        <div className="player-exp">
          <div className="label">EXP · {lv.into} / {lv.need}</div>
          <div className="bar"><div className="bar-fill" style={{ width: `${lv.pct * 100}%` }} /></div>
        </div>
      </div>

      {(vault.length > 0 || recoveryActive(g)) && (
        <div className="chips">
          {vault.length > 0 && (
            <span className="chip loss"><Lock size={12} /> Vault {vaultSum} EXP · {fmtLeft(soonest)} to redeem</span>
          )}
          {recoveryActive(g) && <span className="chip info"><HeartPulse size={12} /> Recovery Mode</span>}
        </div>
      )}

      <div className="coins">
        {([
          ['Leisure', 'var(--leisure)', g.leisure],
          ['F', 'var(--f-coin)', g.lifetime.f],
          ['H', 'var(--h-coin)', g.lifetime.h],
          ['L', 'var(--l-coin)', g.lifetime.l],
        ] as const).map(([k, c, v]) => (
          <div key={k} className="coin">
            <i style={{ background: c }} />
            <span className="label">{k}</span>
            <b>{v}</b>
          </div>
        ))}
      </div>
    </section>
  );
}

// 2 · Tactical quick-count strip
export function QuickStrip() {
  const d = useData();
  const u = undone(d);
  const pills: [string, string, string][] = [
    ['Quests D/W/M', `${u.daily}/${u.weekly}/${u.monthly}`, '/m/commissions'],
    ['Learning', String(learningActive(d).length), '/m/learning'],
    ['Projects', String(d.projects.filter((p) => p.progress < 100).length), '/m/projects'],
    ['Dues 10d', String(duesSoon(d).length), '/m/liabilities'],
  ];
  return (
    <div className="strip fade-in">
      {pills.map(([k, v, to]) => (
        <button key={k} onClick={() => go(to)}>
          <b>{v}</b>
          <span className="label">{k}</span>
        </button>
      ))}
    </div>
  );
}

// 3 · Bold monthly wallet
export function WalletCard() {
  const d = useData();
  const w = walletInfo(d);
  const pct = w.salary ? Math.min(1, w.spent / w.salary) : 0;

  return (
    <section className="wallet fade-in" onClick={() => go('/m/finance')}>
      <div className="wallet-top">
        <span className="label">Wallet · remaining</span>
        <button className="quick-spend" onClick={(e) => { e.stopPropagation(); useUI.getState().open('spend'); }}>
          <Plus size={14} strokeWidth={2} /> Quick spend
        </button>
      </div>
      {w.salary ? (
        <>
          <div className={`display wallet-amount ${w.remaining < 0 ? 'neg' : ''}`}>{fmtMoney(w.remaining, d.currency)}</div>
          <div className="bar wallet-bar"><div className="bar-fill" style={{ width: `${pct * 100}%` }} /></div>
          <div className="wallet-meta">
            <span>Spent {fmtMoney(w.spent, d.currency)} of {fmtMoney(w.salary, d.currency)}</span>
            <span>{fmtMoney(w.perDay, d.currency)}/day · {w.daysLeft}d left</span>
          </div>
        </>
      ) : (
        <div className="empty-cta">Set this month's salary <ChevronRight size={14} /></div>
      )}
    </section>
  );
}

const SOURCE_COLOR: Record<string, string> = {
  template: 'rgba(237,227,211,0.35)',
  projects: 'var(--h-coin)',
  learning: 'var(--l-coin)',
  leisure: 'var(--leisure)',
  commissions: 'var(--signal)',
};
const SOURCE_NAME: Record<string, string> = {
  template: 'Routine', projects: 'Projects', learning: 'Learning', leisure: 'Leisure', commissions: 'Quests',
};

// 4 · Today's 24h Time Bank & active questline
export function TodayCard() {
  const g = useGame();
  const d = useData();
  const allocs = g.time[dayKey()] ?? [];
  const bySource = allocs.reduce<Record<string, number>>((a, x) => ({ ...a, [x.source]: (a[x.source] ?? 0) + x.hours }), {});
  const free = RULES.dailyHours - hoursUsed(g);
  const items = questline(d);

  return (
    <section className="today-card fade-in">
      <div className="section-head">
        <span className="label">Time bank · today</span>
        <span className="label"><b className="free">{free}h</b> free of {RULES.dailyHours}h</span>
      </div>
      <div className="timebar">
        {Object.entries(bySource).map(([src, h]) => (
          <i key={src} style={{ flex: h, background: SOURCE_COLOR[src] ?? 'var(--muted)' }} />
        ))}
        {free > 0 && <i className="timebar-free" style={{ flex: free }} />}
      </div>
      {Object.keys(bySource).length > 0 && (
        <div className="legend">
          {Object.entries(bySource).map(([src, h]) => (
            <span key={src}><i style={{ background: SOURCE_COLOR[src] ?? 'var(--muted)' }} />{SOURCE_NAME[src] ?? src} {h}h</span>
          ))}
        </div>
      )}

      <div className="section-head" style={{ marginTop: 22 }}>
        <span className="label">Questline</span>
        <span className="label">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="quiet">Nothing scheduled today. Add commissions, habits or events to build your questline.</p>
      ) : (
        <ul className="quests">
          {items.slice(0, 6).map((q) => (
            <li key={q.id} className={q.done ? 'done' : ''} onClick={() => go(q.to)}>
              <span className="q-time">{q.time ?? '—'}</span>
              <span className="q-title">{q.title}</span>
              <span className="q-kind">{q.kind}</span>
            </li>
          ))}
          {items.length > 6 && <li className="q-more">+{items.length - 6} more</li>}
        </ul>
      )}
    </section>
  );
}

// 5 · Vitality & Ambition pulse
export function PulseCard() {
  const d = useData();
  const body = d.health.body.at(-1);
  const mood = d.health.mood.at(-1);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (d.life.length < 2) return;
    const id = setInterval(() => setI((x) => (x + 1) % d.life.length), 8000);
    return () => clearInterval(id);
  }, [d.life.length]);

  const dream = d.life[i % Math.max(1, d.life.length)];
  const score = body?.score ?? 0;
  const ring = score >= 67 ? 'var(--good)' : score >= 34 ? 'var(--mid)' : 'var(--bad)';

  return (
    <section className="pulse fade-in">
      <button className="vital frame" onClick={() => go('/m/health')}>
        <span className="label">Vitality</span>
        {body ? (
          <>
            <svg viewBox="0 0 64 64" className="ring">
              <circle cx="32" cy="32" r="27" stroke="var(--line)" />
              <circle cx="32" cy="32" r="27" stroke={ring} strokeDasharray={`${(score / 100) * 169.6} 169.6`} transform="rotate(-90 32 32)" />
              <text x="32" y="37" textAnchor="middle">{score}</text>
            </svg>
            <span className="vital-mood">{mood?.label ?? 'No mood logged'}</span>
          </>
        ) : (
          <span className="empty-cta">Check in <ChevronRight size={14} /></span>
        )}
      </button>

      <button className="dream" onClick={() => go('/m/life')}>
        <Sparkles size={14} className="dream-icon" />
        {dream ? (
          <div key={dream.id} className="fade-in">
            <span className="label">Someday</span>
            <h3>{dream.title}</h3>
            <p>{dream.description}</p>
          </div>
        ) : (
          <div>
            <span className="label">Life canvas</span>
            <h3>What do you want from life?</h3>
            <p>Add your first dream.</p>
          </div>
        )}
      </button>
    </section>
  );
}
