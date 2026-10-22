import { HeartPulse } from 'lucide-react';
import type { LearningCommit } from '../../data/store';
import { useGame } from '../../engine/store';
import { fmtDay } from '../../engine/time';
import { LEARN_RULES, breakContract, endDate, medicalPause, medicalReason } from './learning';

/** Trying to remove a locked commit: the Medical Pause shows up only when health data supports it. */
export function EndCommitment({ l, onDone }: { l: LearningCommit; onDone: () => void }) {
  const leisure = useGame((s) => s.leisure);
  const reason = medicalReason();
  const end = endDate(l);
  const fee = Math.min(LEARN_RULES.breakLeisure, leisure);

  return (
    <div className="form">
      <span className="label">End “{l.skill}” early?</span>
      <p className="plan">You committed {end ? <>until <b>{fmtDay(end)}</b></> : <>with <b>no end date</b></>}. There's no delete button on a locked commitment.</p>

      {reason && (
        <div className="medical frame">
          <HeartPulse size={18} />
          <div>
            <b>Medical pause available</b>
            <p>{reason} Pause for {LEARN_RULES.pauseDays} days at no cost. The quota moves back by the same amount.</p>
            <button className="btn" onClick={() => { medicalPause(l.id); onDone(); }}>Pause {LEARN_RULES.pauseDays} days</button>
          </div>
        </div>
      )}

      <button className="btn danger" onClick={() => { breakContract(l.id); onDone(); }}>
        Break the contract · −{fee} Leisure Coins
      </button>
      <button className="btn primary" onClick={onDone}>Keep my commitment</button>
    </div>
  );
}
