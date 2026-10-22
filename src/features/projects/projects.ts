import { uid, useData, type Milestone, type Project } from '../../data/store';
import { hoursLeft, useGame } from '../../engine/store';
import { dayKey, daysUntil } from '../../engine/time';

// Projects: daily time budget, milestones with due dates, a deadline. Work hours sync into the Time Bank.
export const P_RULES = { workExp: 10, milestoneExp: 25, completeExp: 100, onTimeBonus: 50, overdueMilestoneExp: 30 };

const get = useData.getState;
const game = useGame.getState;
const update = (id: string, fn: (p: Project) => Partial<Project>) =>
  useData.setState((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, ...fn(p) } : p)) }));

export type NewProject = Pick<Project, 'name' | 'description' | 'hoursPerDay' | 'deadline'> & { milestones: { title: string; due?: string }[] };

export function addProject(x: NewProject) {
  const p: Project = {
    ...x, id: uid(), progress: 0, worked: {}, status: 'active', createdDay: dayKey(),
    milestones: x.milestones.map((m) => ({ ...m, id: uid(), done: false })),
  };
  useData.setState((s) => ({ projects: [p, ...s.projects] }));
}

export const removeProject = (id: string) => useData.setState((s) => ({ projects: s.projects.filter((p) => p.id !== id) }));

/** Progress: milestones done / total, or the manual % when a project has no milestones. */
export const progressOf = (p: Project) =>
  p.milestones.length ? Math.round((p.milestones.filter((m) => m.done).length / p.milestones.length) * 100) : p.progress;

export const hoursTotal = (p: Project) => Object.values(p.worked).reduce((a, b) => a + b, 0);
export const nextMilestone = (p: Project) =>
  p.milestones.filter((m) => !m.done).sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999'))[0];

/** Log work today. First log of the day pays EXP; hours go into today's Time Bank. */
export function logWork(id: string, hours: number) {
  const p = get().projects.find((x) => x.id === id);
  const h = Math.min(hours, hoursLeft(game()));
  if (!p || p.status !== 'active' || h <= 0) return false;
  const today = dayKey();
  const first = !p.worked[today];
  game().allocate(h, 'projects', p.name);
  update(id, (x) => ({ worked: { ...x.worked, [today]: (x.worked[today] ?? 0) + h } }));
  if (first) game().gainExp(P_RULES.workExp, `Worked on ${p.name}`);
  return true;
}

export function setProgress(id: string, progress: number) {
  update(id, () => ({ progress: Math.max(0, Math.min(100, progress)) }));
}

export function addMilestone(id: string, title: string, due?: string) {
  update(id, (p) => ({ milestones: [...p.milestones, { id: uid(), title: title.trim(), due: due || undefined, done: false }] }));
}

export function removeMilestone(id: string, mid: string) {
  update(id, (p) => ({ milestones: p.milestones.filter((m) => m.id !== mid) }));
}

/** Tick a milestone: EXP, or wins back an overdue escrow at 1.5×. Unticking reverses the plain reward. */
export function toggleMilestone(id: string, mid: string) {
  const p = get().projects.find((x) => x.id === id);
  const m = p?.milestones.find((x) => x.id === mid);
  if (!p || !m) return;
  if (m.done) {
    game().revokeExp(P_RULES.milestoneExp, `Reopened milestone · ${m.title}`);
  } else if (m.vaultId && m.vaultId !== 'waived') {
    if (!game().redeem(m.vaultId)) game().gainExp(P_RULES.milestoneExp, `Milestone · ${m.title}`);
  } else {
    game().gainExp(P_RULES.milestoneExp, `Milestone · ${m.title}`);
  }
  update(id, (x) => ({ milestones: x.milestones.map((y) => (y.id === mid ? { ...y, done: !y.done, vaultId: undefined } : y)) }));
}

/** Finish the project: bonus, plus extra when it's on or before the deadline. */
export function completeProject(id: string) {
  const p = get().projects.find((x) => x.id === id);
  if (!p || p.status !== 'active') return;
  const onTime = daysUntil(p.deadline) >= 0;
  game().gainExp(P_RULES.completeExp + (onTime ? P_RULES.onTimeBonus : 0), `Project complete · ${p.name}${onTime ? ' (on time)' : ''}`);
  update(id, (x) => ({ status: 'done', doneAt: dayKey(), progress: 100, milestones: x.milestones.map((m) => ({ ...m, done: true })) }));
}

/** Clock housekeeping: a milestone past its due date escrows EXP once. */
export function projectsTick() {
  for (const p of get().projects) {
    if (p.status !== 'active') continue;
    const late = p.milestones.filter((m: Milestone) => !m.done && !m.vaultId && m.due && daysUntil(m.due) < 0);
    if (!late.length) continue;
    const ids = Object.fromEntries(late.map((m) => [m.id, game().penalize(P_RULES.overdueMilestoneExp, `Overdue milestone · ${m.title}`) ?? 'waived']));
    update(p.id, (x) => ({ milestones: x.milestones.map((m) => (ids[m.id] ? { ...m, vaultId: ids[m.id] } : m)) }));
  }
}
