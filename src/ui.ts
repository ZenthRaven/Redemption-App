import { create } from 'zustand';

// Transient UI state shared across screens (not persisted).
type Sheet = 'spend' | null;

export const useUI = create<{ sheet: Sheet; open: (s: Sheet) => void; close: () => void }>((set) => ({
  sheet: null,
  open: (sheet) => set({ sheet }),
  close: () => set({ sheet: null }),
}));
