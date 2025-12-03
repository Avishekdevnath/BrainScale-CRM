import { create } from "zustand";

type Group = {
  id: string;
  name: string;
};

const defaultGroup: Group = {
  id: "1",
  name: "Batch A",
};

// Load from localStorage (client-side only)
const loadFromStorage = (): Group | null => {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("selectedGroup");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore errors
  }
  return null;
};

type GroupState = {
  current: Group | null;
  _hasHydrated: boolean;
  setCurrent: (group: Group | null) => void;
  getCurrentId: () => string | null;
  clear: () => void;
  hydrate: () => void;
};

export const useGroupStore = create<GroupState>((set, get) => ({
  current: defaultGroup, // Always start with default to avoid hydration mismatch
  _hasHydrated: false,
  setCurrent: (group) => {
    if (group) {
      try {
        localStorage.setItem("selectedGroup", JSON.stringify(group));
      } catch {
        // Ignore errors
      }
    } else {
      try {
        localStorage.removeItem("selectedGroup");
      } catch {
        // Ignore errors
      }
    }
    set({ current: group });
  },
  getCurrentId: () => {
    const state = get();
    return state.current?.id || null;
  },
  clear: () => {
    try {
      localStorage.removeItem("selectedGroup");
    } catch {
      // Ignore errors
    }
    set({ current: null });
  },
  hydrate: () => {
    if (get()._hasHydrated) return; // Only hydrate once
    const stored = loadFromStorage();
    if (stored) {
      set({ current: stored, _hasHydrated: true });
    } else {
      set({ _hasHydrated: true });
    }
  },
}));

