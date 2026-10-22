import {
  Wallet, Landmark, Sprout, Swords, CalendarDays, GraduationCap,
  Hourglass, FolderKanban, HeartPulse, Sparkles, type LucideIcon,
} from 'lucide-react';

export type ModuleId =
  | 'finance' | 'liabilities' | 'habits' | 'commissions' | 'calendar'
  | 'learning' | 'time' | 'projects' | 'health' | 'life';

export interface ModuleDef {
  id: ModuleId;
  code: string; // two-digit index shown in the editorial style
  name: string;
  tagline: string;
  icon: LucideIcon;
}

// The 10 core modules, in blueprint order.
export const MODULES: ModuleDef[] = [
  { id: 'finance', code: '01', name: 'Wallet', tagline: 'Monthly salary & daily spend', icon: Wallet },
  { id: 'liabilities', code: '02', name: 'Liabilities', tagline: 'Loans, mortgages, subscriptions', icon: Landmark },
  { id: 'habits', code: '03', name: 'Habits', tagline: 'Build the good, starve the bad', icon: Sprout },
  { id: 'commissions', code: '04', name: 'Commissions', tagline: 'Daily, weekly & monthly quests', icon: Swords },
  { id: 'calendar', code: '05', name: 'Calendar', tagline: 'Meetings, events, deadlines', icon: CalendarDays },
  { id: 'learning', code: '06', name: 'Learning', tagline: 'Ironclad learning commits', icon: GraduationCap },
  { id: 'time', code: '07', name: 'Time Bank', tagline: 'Where your 24 hours go', icon: Hourglass },
  { id: 'projects', code: '08', name: 'Projects', tagline: 'Personal projects & milestones', icon: FolderKanban },
  { id: 'health', code: '09', name: 'Vitality', tagline: 'Body map, mood & BMI', icon: HeartPulse },
  { id: 'life', code: '10', name: 'Life Canvas', tagline: 'Everything you want from life', icon: Sparkles },
];

export const moduleById = (id: string) => MODULES.find((m) => m.id === id);
