import { useState } from 'react';
import { ArrowLeft, ChevronDown, Plus, Settings2, Trash2 } from 'lucide-react';
import { fmtMoney, useData, walletInfo } from '../../data/store';
import { monthName } from '../../engine/time';
import { go } from '../../router';
import { useUI } from '../../ui';
import { CATEGORIES, categoryById } from './categories';
import { F_RULES, removeSpend, setCurrency, setSalary, setSavingsPct } from './wallet';
import './finance.css';

const when = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

export function WalletScreen() {
  const d = useData();
  const w = walletInfo(d);
  const open = useUI((s) => s.open);
  const [tab, setTab] = useState<'cat' | 'recent'>('cat');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [settings, setSettings] = useState(false);
  const [editing, setEditing] = useState(false);
  const [salaryInput, setSalaryInput] = useState(() => (d.wallet.lastSalary ? String(d.wallet.lastSalary) : ''));
  const money = (n: number) => fmtMoney(n, d.currency);

  const startEdit = () => { setSalaryInput(String(d.wallet.salary || d.wallet.lastSalary || '')); setEditing(true); };
  const saveSalary = () => { const n = parseFloat(salaryInput); if (n > 0) { setSalary(n); setEditing(false); } };

  const groups = CATEGORIES.map((c) => {
    const items = d.wallet.spends.filter((s) => s.category === c.id);
    return { c, items, total: items.reduce((a, x) => a + x.amount, 0) };
  }).filter((g) => g.items.length).sort((a, b) => b.total - a.total);
  const maxGroup = groups[0]?.total ?? 1;

  const needsSalary = !w.salary || editing;
  const overToday = w.todayFlex > w.allowance;

  return (
    <div className="screen fade-in wallet-screen">
      <div className="mod-top">
        <button className="label" onClick={() => go('/')}><ArrowLeft size={14} /> HUD</button>
        <button className="icon-btn" aria-label="Wallet settings" onClick={() => setSettings((v) => !v)}><Settings2 size={18} strokeWidth={1.5} /></button>
      </div>
      <span className="label">Module 01 · {monthName(d.wallet.month)}</span>
      <h1 className="display mod-title">Wallet</h1>

      {settings && (
        <div className="frame settings fade-in">
          <label><span className="label">Currency symbol</span>
            <input className="field" value={d.currency} onChange={(e) => setCurrency(e.target.value)} maxLength={4} />
          </label>
          <label><span className="label">Savings goal · {Math.round(d.wallet.savingsPct * 100)}% of salary</span>
            <input type="range" min={0} max={60} step={5} value={d.wallet.savingsPct * 100} onChange={(e) => setSavingsPct(+e.target.value / 100)} />
          </label>
        </div>
      )}

      {needsSalary ? (
        <div className="frame salary-setup">
          <i className="tick tl" /><i className="tick tr" /><i className="tick bl" /><i className="tick br" />
          <span className="label">Salary for {monthName(d.wallet.month)}</span>
          <div className="salary-input">
            <span>{d.currency}</span>
            <input inputMode="decimal" autoFocus placeholder="0" value={salaryInput}
              onChange={(e) => setSalaryInput(e.target.value.replace(/[^\d.]/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && saveSalary()} />
          </div>
          <button className="btn primary" disabled={!(parseFloat(salaryInput) > 0)} onClick={saveSalary}>
            {editing ? 'Update salary' : 'Start the month'}
          </button>
          {editing && <button className="btn" style={{ marginTop: 8 }} onClick={() => setEditing(false)}>Cancel</button>}
        </div>
      ) : (
        <>
          <span className="label">Remaining</span>
          <div className={`display big-balance ${w.remaining < 0 ? 'neg' : ''}`}>{money(w.remaining)}</div>
          <div className="bar"><div className="bar-fill" style={{ width: `${Math.min(100, (w.spent / w.salary) * 100)}%` }} /></div>
          <div className="wallet-meta" style={{ marginTop: 8 }}>
            <span>Spent {money(w.spent)}</span>
            <button className="link" onClick={startEdit}>Salary {money(w.salary)}</button>
          </div>

          <div className="stat-row">
            <div className={overToday ? 'over' : ''}>
              <span className="label">Today · flexible</span>
              <b>{money(w.todayFlex)}</b>
              <small>of {money(w.allowance)} allowance</small>
            </div>
            <div>
              <span className="label">Safe / day</span>
              <b>{money(w.perDay)}</b>
              <small>{w.daysLeft} days left</small>
            </div>
            <div>
              <span className="label">Saved</span>
              <b>{money(d.savings)}</b>
              <small>goal {money(w.goal)}/mo</small>
            </div>
          </div>
        </>
      )}

      <button className="btn primary add-spend" onClick={() => open('spend')}><Plus size={14} /> Add spending</button>

      <div className="tabs">
        <button className={tab === 'cat' ? 'on' : ''} onClick={() => setTab('cat')}>By category</button>
        <button className={tab === 'recent' ? 'on' : ''} onClick={() => setTab('recent')}>Recent</button>
      </div>

      {d.wallet.spends.length === 0 && <p className="quiet">No spending logged this month. Tap + to add your first one.</p>}

      {tab === 'cat' ? (
        <ul className="cat-list">
          {groups.map(({ c, items, total }) => (
            <li key={c.id} className={expanded === c.id ? 'open' : ''}>
              <button className="cat-row" onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
                <c.icon size={18} strokeWidth={1.4} />
                <span className="cat-name">{c.name}<small>{items.length} · {c.fixed ? 'bill' : 'flexible'}</small></span>
                <b>{money(total)}</b>
                <ChevronDown size={14} className="chev" />
                <i className="cat-bar" style={{ width: `${(total / maxGroup) * 100}%` }} />
              </button>
              {expanded === c.id && (
                <ul className="entries">
                  {items.map((x) => (
                    <li key={x.id}>
                      <span>{when(x.t)}</span><span className="entry-note">{x.note ?? '—'}</span><b>{money(x.amount)}</b>
                      <button aria-label="Delete" onClick={() => removeSpend(x.id)}><Trash2 size={14} /></button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <ul className="entries recent">
          {d.wallet.spends.slice(0, 40).map((x) => {
            const c = categoryById(x.category);
            return (
              <li key={x.id}>
                <span>{when(x.t)}</span>
                <span className="entry-note"><c.icon size={13} strokeWidth={1.5} /> {x.note ?? c.name}</span>
                <b>{money(x.amount)}</b>
                <button aria-label="Delete" onClick={() => removeSpend(x.id)}><Trash2 size={14} /></button>
              </li>
            );
          })}
        </ul>
      )}

      {d.wishes.length > 0 && (
        <>
          <h2 className="label sub-h">Funded wishes</h2>
          <ul className="entries">
            {d.wishes.map((x) => <li key={x.id}><span>{when(x.t)}</span><span className="entry-note">{x.title}</span><b>{money(x.amount)}</b><span /></li>)}
          </ul>
        </>
      )}

      {d.history.length > 0 && (
        <>
          <h2 className="label sub-h">Past months</h2>
          <ul className="entries">
            {d.history.map((h) => (
              <li key={h.month}><span>{monthName(h.month).slice(0, 3)} {h.month.slice(2, 4)}</span><span className="entry-note">spent {money(h.spent)} · {h.choice ?? (h.leftover > 0 ? 'pending' : 'no buffer')}</span><b>{money(h.leftover)}</b><span /></li>
            ))}
          </ul>
        </>
      )}

      <div className="rules">
        <span className="label">Earning F-Coins</span>
        <p>+{F_RULES.firstLogOfDay} first spend you log each day · +{F_RULES.underAllowance} each day flexible spending stays within allowance · +{F_RULES.hitSavingsGoal} when a month ends at or above your savings goal · +{F_RULES.savedLeftover} for saving leftover money.</p>
      </div>
    </div>
  );
}
