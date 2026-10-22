import { useState } from 'react';
import { ArrowLeft, Check, Home, Landmark, Plus, Repeat, Trash2 } from 'lucide-react';
import { Sheet } from '../../components/Sheet';
import { fmtMoney, useData, type Liability } from '../../data/store';
import { daysUntil, fmtDay, now } from '../../engine/time';
import { go } from '../../router';
import { AddLiability } from './AddLiability';
import { L_RULES, payLiability, reminderTimes, removeLiability, stageOf } from './liabilities';
import './liabilities.css';

const KIND = {
  loan: { icon: Landmark, name: 'Loan' },
  mortgage: { icon: Home, name: 'Mortgage' },
  subscription: { icon: Repeat, name: 'Subscription' },
};

function countdown(l: Liability) {
  const d = daysUntil(l.dueDate);
  if (d < 0) return `${-d}d overdue`;
  if (d === 0) return 'Due today';
  if (d === 1) return 'Tomorrow';
  return `${d} days`;
}

export function LiabilitiesScreen() {
  const d = useData();
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const money = (n: number) => fmtMoney(n, d.currency);

  const active = d.liabilities.filter((l) => !l.closed).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const cleared = d.liabilities.filter((l) => l.closed);
  const debt = active.reduce((a, l) => a + (l.balance ?? 0), 0);
  const due30 = active.filter((l) => daysUntil(l.dueDate) <= 30).reduce((a, l) => a + l.amount, 0);
  const monthly = active.reduce((a, l) => a + (l.repeat === 'yearly' ? l.amount / 12 : l.repeat === 'monthly' ? l.amount : 0), 0);
  const pays = d.liabilities.flatMap((l) => l.payments);
  const onTimePct = pays.length ? Math.round((pays.filter((p) => p.onTime).length / pays.length) * 100) : null;

  const groups: [string, Liability[]][] = [
    ['Overdue', active.filter((l) => stageOf(l) === 'overdue')],
    ['Next 10 days', active.filter((l) => !['overdue', 'later'].includes(stageOf(l)))],
    ['Later', active.filter((l) => stageOf(l) === 'later')],
  ];

  return (
    <div className="screen fade-in">
      <div className="mod-top">
        <button className="label" onClick={() => go('/')}><ArrowLeft size={14} /> HUD</button>
      </div>
      <span className="label">Module 02 · Debt & dues</span>
      <h1 className="display mod-title">Liabilities</h1>

      <span className="label">{debt ? 'Outstanding debt' : 'Due in 30 days'}</span>
      <div className="display big-number">{money(debt || due30)}</div>
      <div className="stat-row">
        <div><span className="label">Due · 30 days</span><b>{money(due30)}</b><small>{active.filter((l) => daysUntil(l.dueDate) <= 30).length} payments</small></div>
        <div><span className="label">Monthly load</span><b>{money(Math.round(monthly))}</b><small>{active.length} active</small></div>
        <div><span className="label">On time</span><b>{onTimePct === null ? '—' : `${onTimePct}%`}</b><small>{pays.length} paid</small></div>
      </div>

      <button className="btn primary add-btn" onClick={() => setAdding(true)}><Plus size={14} /> Add liability</button>

      {active.length === 0 && (
        <p className="quiet">No loans, mortgages or subscriptions yet. Add them to get reminders 10, 5 and 2 days ahead and the night before.</p>
      )}

      {groups.map(([title, list]) => list.length > 0 && (
        <section key={title}>
          <h2 className={`label sub-h ${title === 'Overdue' ? 'warn' : ''}`}>{title} · {list.length}</h2>
          <ul className="liabs">
            {list.map((l) => {
              const K = KIND[l.kind];
              const stage = stageOf(l);
              const isOpen = open === l.id;
              const payNow = l.balance !== undefined ? Math.min(l.amount, l.balance) : l.amount;
              return (
                <li key={l.id} className={`liab ${isOpen ? 'open' : ''}`}>
                  <button className="liab-row" onClick={() => setOpen(isOpen ? null : l.id)}>
                    <K.icon size={18} strokeWidth={1.4} />
                    <span className="liab-name">
                      {l.name}
                      <small>{K.name} · {l.repeat === 'once' ? 'one-off' : l.repeat} · {fmtDay(l.dueDate)}</small>
                    </span>
                    <span className="liab-right">
                      <b>{money(l.amount)}</b>
                      <span className={`pill s-${stage}`}>{countdown(l)}</span>
                    </span>
                  </button>
                  {l.principal !== undefined && l.balance !== undefined && (
                    <div className="liab-progress" title="Paid off">
                      <i style={{ width: `${(1 - l.balance / l.principal) * 100}%` }} />
                    </div>
                  )}

                  {isOpen && (
                    <div className="liab-detail fade-in">
                      {l.balance !== undefined && (
                        <p className="liab-line">Balance {money(l.balance)} of {money(l.principal ?? l.balance)} · {Math.ceil(l.balance / l.amount)} payments left</p>
                      )}
                      {l.vaultId && l.vaultId !== 'waived' && (
                        <p className="liab-line warn">{L_RULES.overdueExp} EXP is in the Redemption Vault. Pay within the grace window to win it back at 1.5×.</p>
                      )}
                      <span className="label">Reminders</span>
                      <div className="reminders">
                        {reminderTimes(l).map((r) => (
                          <span key={r.label} className={r.at < now() ? 'past' : ''}>{r.label}</span>
                        ))}
                      </div>
                      {l.payments.length > 0 && (
                        <>
                          <span className="label">History · streak {l.streak}</span>
                          <ul className="entries">
                            {l.payments.slice(0, 4).map((p, i) => (
                              <li key={i}><span>{fmtDay(p.date)}</span><span className="entry-note">{p.onTime ? 'On time' : 'Late'} · due {fmtDay(p.due)}</span><b>{money(p.amount)}</b><span /></li>
                            ))}
                          </ul>
                        </>
                      )}
                      <div className="liab-actions">
                        <button className="btn primary" onClick={() => payLiability(l.id)}><Check size={14} /> Mark paid · {money(payNow)}</button>
                        <button className="icon-btn" aria-label="Delete liability" onClick={() => confirm(`Delete ${l.name}?`) && removeLiability(l.id)}><Trash2 size={16} /></button>
                      </div>
                      <p className="quiet">Paying adds this to your Wallet under {l.kind === 'subscription' ? 'Subscriptions' : 'Loans'}.</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {cleared.length > 0 && (
        <>
          <h2 className="label sub-h">Cleared · {cleared.length}</h2>
          <ul className="entries">
            {cleared.map((l) => (
              <li key={l.id}><span>{fmtDay(l.payments[0]?.date ?? l.dueDate)}</span><span className="entry-note"><Check size={13} /> {l.name}</span><b>{money(l.principal ?? l.amount)}</b>
                <button aria-label="Delete" onClick={() => removeLiability(l.id)}><Trash2 size={14} /></button></li>
            ))}
          </ul>
        </>
      )}

      <div className="rules">
        <span className="label">Earning L-Coins</span>
        <p>+{L_RULES.onTime} paid on or before the due date · +{L_RULES.earlyBonus} extra when 2+ days early · +{L_RULES.streakBonus} every {L_RULES.streakEvery} on-time payments in a row · +{L_RULES.debtCleared} when a loan or mortgage is fully cleared · +{L_RULES.late} for a late payment. A missed due date puts {L_RULES.overdueExp} EXP in the Redemption Vault.</p>
      </div>

      <Sheet open={adding} onClose={() => setAdding(false)}>
        <AddLiability onDone={() => setAdding(false)} />
      </Sheet>
    </div>
  );
}
