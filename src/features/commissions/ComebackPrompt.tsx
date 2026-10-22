import { RotateCcw } from 'lucide-react';
import { useData } from '../../data/store';
import { RULES } from '../../engine/rules';
import { letGo, missPenalty, pendingComebacks, reschedule } from './commissions';
import './commissions.css';

const WHEN: [0 | 1 | 2, string][] = [[0, 'Tonight'], [1, 'Tomorrow'], [2, 'Day after']];

// "Reset the clock": a missed quest asks for a new timeline instead of piling up in red.
export function ComebackPrompt() {
  const list = useData((s) => s.commissions);
  const q = pendingComebacks(list)[0];
  if (!q) return null;
  const lost = missPenalty(q);

  return (
    <div className="modal-wrap">
      <div className="modal frame fade-in">
        <i className="tick tl" /><i className="tick tr" /><i className="tick bl" /><i className="tick br" />
        <span className="label">Consistency beats perfection</span>
        <h2 className="comeback-title">{q.title}</h2>
        <p className="modal-copy">
          This slipped past its deadline, so {lost} EXP went into the Redemption Vault. Let's reset the clock. When are we tackling it?
          Finish it in time and you get {Math.round(lost * RULES.vaultMultiplier)} EXP back.
        </p>
        <div className="when">
          {WHEN.map(([d, label]) => (
            <button key={d} onClick={() => reschedule(q.id, d)}><RotateCcw size={14} /> {label}</button>
          ))}
        </div>
        <button className="link letgo" onClick={() => letGo(q.id)}>Let it go</button>
      </div>
    </div>
  );
}
