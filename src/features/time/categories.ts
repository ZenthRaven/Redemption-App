import {
  Bed, Briefcase, Bus, Dumbbell, FolderKanban, Gamepad2, GraduationCap, Heart, MoreHorizontal,
  Sparkles, Swords, Utensils, type LucideIcon,
} from 'lucide-react';
import type { Allocation } from '../../engine/store';

export interface TimeCat { id: string; name: string; color: string; icon: LucideIcon; productive?: boolean; }

export const TIME_CATS: TimeCat[] = [
  { id: 'sleep', name: 'Sleep', color: '#3b4a7a', icon: Bed },
  { id: 'office', name: 'Office work', color: '#ede3d3', icon: Briefcase, productive: true },
  { id: 'projects', name: 'Personal projects', color: '#b38cff', icon: FolderKanban, productive: true },
  { id: 'learning', name: 'Learning', color: '#4d8dff', icon: GraduationCap, productive: true },
  { id: 'quests', name: 'Quests', color: '#ff4a2b', icon: Swords, productive: true },
  { id: 'family', name: 'Family', color: '#ff8fa3', icon: Heart },
  { id: 'care', name: 'Personal care', color: '#5fe3a1', icon: Sparkles },
  { id: 'eating', name: 'Eating', color: '#e0a96d', icon: Utensils },
  { id: 'exercise', name: 'Exercise', color: '#2ec4b6', icon: Dumbbell, productive: true },
  { id: 'commute', name: 'Commute', color: '#8a8f98', icon: Bus },
  { id: 'leisure', name: 'Entertainment', color: '#ffb547', icon: Gamepad2 },
  { id: 'other', name: 'Other', color: '#5a5f68', icon: MoreHorizontal },
];

export const catById = (id: string) => TIME_CATS.find((c) => c.id === id) ?? TIME_CATS[TIME_CATS.length - 1];

// Entries synced from other modules map onto a category by their source.
const SOURCE_CAT: Record<string, string> = { projects: 'projects', learning: 'learning', commissions: 'quests', leisure: 'leisure' };
export const catOf = (a: Allocation) => a.cat ?? SOURCE_CAT[a.source] ?? (a.source === 'template' ? labelCat(a.label) : 'other');
/** Synced entries are owned by their module and can't be edited here. */
export const isSynced = (a: Allocation) => a.source in SOURCE_CAT;

// Older entries (before categories existed) only had a label.
const labelCat = (label: string) => TIME_CATS.find((c) => c.name.toLowerCase().startsWith(label.toLowerCase().slice(0, 4)))?.id ?? 'other';
