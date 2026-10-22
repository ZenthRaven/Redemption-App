import {
  Building2, Clapperboard, Droplets, Flame, GraduationCap, Home, Landmark, MoreHorizontal,
  Pill, Repeat, ShoppingBasket, ShoppingCart, User, Wifi, Zap, type LucideIcon,
} from 'lucide-react';

export interface Category { id: string; name: string; icon: LucideIcon; fixed?: boolean; }

// Fixed = monthly bills; they don't count against the daily flexible allowance.
export const CATEGORIES: Category[] = [
  { id: 'rent', name: 'House rent', icon: Home, fixed: true },
  { id: 'service', name: 'Service charge', icon: Building2, fixed: true },
  { id: 'electricity', name: 'Electricity', icon: Zap, fixed: true },
  { id: 'gas', name: 'Gas', icon: Flame, fixed: true },
  { id: 'internet', name: 'Internet', icon: Wifi, fixed: true },
  { id: 'water', name: 'Water filter', icon: Droplets, fixed: true },
  { id: 'grocery-monthly', name: 'Monthly grocery', icon: ShoppingBasket, fixed: true },
  { id: 'grocery-weekly', name: 'Weekly grocery', icon: ShoppingCart },
  { id: 'entertainment', name: 'Entertainment', icon: Clapperboard },
  { id: 'personal', name: 'Personal', icon: User },
  { id: 'medicine', name: 'Medicines', icon: Pill },
  { id: 'education', name: 'Education', icon: GraduationCap, fixed: true },
  { id: 'loans', name: 'Loans', icon: Landmark, fixed: true },
  { id: 'subscriptions', name: 'Subscriptions', icon: Repeat, fixed: true },
  { id: 'other', name: 'Other', icon: MoreHorizontal },
];

export const FIXED_CATEGORIES = CATEGORIES.filter((c) => c.fixed).map((c) => c.id);
export const categoryById = (id: string) => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
