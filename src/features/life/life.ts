import { Briefcase, Gem, Globe2, HandHeart, HeartPulse, Home, Sparkles, Star, Users, type LucideIcon } from 'lucide-react';
import { uid, useData, type LifeItem } from '../../data/store';
import { deletePhoto, savePhoto } from '../../data/photos';
import { useGame } from '../../engine/store';
import { dayKey, parseDay, DAY } from '../../engine/time';

// Life Canvas: the things you want from life, as mood-board cards with notes and milestones.
export const LIFE_RULES = { reflectExp: 3, milestoneExp: 10, achievedExp: 100 };

export interface DreamCat { id: string; name: string; icon: LucideIcon; hue: [string, string]; }
export const DREAM_CATS: DreamCat[] = [
  { id: 'travel', name: 'Travel', icon: Globe2, hue: ['#2b5fd9', '#5fe3a1'] },
  { id: 'experience', name: 'Experience', icon: Sparkles, hue: ['#ff4a2b', '#b38cff'] },
  { id: 'skill', name: 'Skill', icon: Star, hue: ['#b38cff', '#4d8dff'] },
  { id: 'possession', name: 'Possession', icon: Gem, hue: ['#ffb547', '#ff4a2b'] },
  { id: 'home', name: 'Home', icon: Home, hue: ['#e0a96d', '#3b4a7a'] },
  { id: 'health', name: 'Health', icon: HeartPulse, hue: ['#5fe3a1', '#2b5fd9'] },
  { id: 'career', name: 'Career', icon: Briefcase, hue: ['#ede3d3', '#4d8dff'] },
  { id: 'people', name: 'People', icon: Users, hue: ['#ff8fa3', '#ffb547'] },
  { id: 'giving', name: 'Giving', icon: HandHeart, hue: ['#2ec4b6', '#ff8fa3'] },
];
export const dreamCat = (id: string) => DREAM_CATS.find((c) => c.id === id) ?? DREAM_CATS[1];

const get = useData.getState;
const game = useGame.getState;
const update = (id: string, fn: (l: LifeItem) => Partial<LifeItem>) =>
  useData.setState((s) => ({ life: s.life.map((l) => (l.id === id ? { ...l, ...fn(l) } : l)) }));

export function addDream(title: string, description: string, category: string) {
  const d: LifeItem = {
    id: uid(), title: title.trim(), description: description.trim(), category,
    photos: [], notes: '', milestones: [], reflections: [], createdDay: dayKey(),
  };
  useData.setState((s) => ({ life: [d, ...s.life] }));
  return d.id;
}

export const editDream = (id: string, patch: Partial<Pick<LifeItem, 'title' | 'description' | 'category' | 'notes'>>) => update(id, () => patch);

export async function removeDream(id: string) {
  const d = get().life.find((x) => x.id === id);
  useData.setState((s) => ({ life: s.life.filter((x) => x.id !== id) }));
  await Promise.all((d?.photos ?? []).map(deletePhoto));
}

export async function addPhotos(id: string, files: FileList) {
  const ids = await Promise.all([...files].slice(0, 12).map(savePhoto));
  update(id, (d) => ({ photos: [...d.photos, ...ids] }));
}

export async function removePhoto(id: string, photo: string) {
  update(id, (d) => ({ photos: d.photos.filter((p) => p !== photo) }));
  await deletePhoto(photo);
}

export const addDreamMilestone = (id: string, title: string) =>
  update(id, (d) => ({ milestones: [...d.milestones, { id: uid(), title: title.trim(), done: false }] }));
export const removeDreamMilestone = (id: string, mid: string) =>
  update(id, (d) => ({ milestones: d.milestones.filter((m) => m.id !== mid) }));

export function toggleDreamMilestone(id: string, mid: string) {
  const m = get().life.find((x) => x.id === id)?.milestones.find((x) => x.id === mid);
  if (!m) return;
  if (m.done) game().revokeExp(LIFE_RULES.milestoneExp, `Reopened · ${m.title}`);
  else game().gainExp(LIFE_RULES.milestoneExp, `Step toward a dream · ${m.title}`);
  update(id, (d) => ({ milestones: d.milestones.map((x) => (x.id === mid ? { ...x, done: !x.done } : x)) }));
}

/** It came true. Big reward; undoing takes it back. */
export function toggleAchieved(id: string) {
  const d = get().life.find((x) => x.id === id);
  if (!d) return;
  if (d.achieved) game().revokeExp(LIFE_RULES.achievedExp, `Dream reopened · ${d.title}`);
  else game().gainExp(LIFE_RULES.achievedExp, `Dream came true · ${d.title}`);
  update(id, () => ({ achieved: d.achieved ? undefined : dayKey() }));
}

export const progressOf = (d: LifeItem) =>
  d.milestones.length ? Math.round((d.milestones.filter((m) => m.done).length / d.milestones.length) * 100) : null;

// ---------- daily reflection ----------

const PROMPTS = [
  'Close your eyes for ten seconds. You are already there. What do you see first?',
  'Who is with you the day this comes true? What do they say?',
  'What will you feel in your chest the moment it happens?',
  'Picture the morning after. What is different about you?',
  'What is one small thing you can do this week that moves you closer?',
  'Why does this matter to you, really? Say it in one sentence.',
];

/** One open dream per day, rotating through them; the prompt rotates too. */
export function todaysDream(list: LifeItem[]) {
  const open = list.filter((d) => !d.achieved);
  if (!open.length) return null;
  const n = Math.floor(parseDay(dayKey()) / DAY);
  return { dream: open[n % open.length], prompt: PROMPTS[n % PROMPTS.length] };
}

export function reflect(id: string) {
  const d = get().life.find((x) => x.id === id);
  if (!d || d.reflections.includes(dayKey())) return;
  update(id, (x) => ({ reflections: [...x.reflections, dayKey()] }));
  game().gainExp(LIFE_RULES.reflectExp, 'Reflected on a dream');
}

// ---------- wishlist (funded from the Wallet's buffer money) ----------

export const toggleWishBought = (id: string) =>
  useData.setState((s) => ({ wishes: s.wishes.map((w) => (w.id === id ? { ...w, bought: !w.bought } : w)) }));
