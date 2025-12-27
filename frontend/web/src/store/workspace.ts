import { create } from "zustand";

type Workspace = {
  id: string;
  name: string;
  plan?: "FREE" | "PRO" | "BUSINESS";
  logo?: string | null;
  timezone?: string;
};

type WorkspaceState = {
  current: Workspace | null;
  setCurrent: (ws: Workspace) => void;
  setCurrentFromApi: (ws: {
    id: string;
    name: string;
    plan?: "FREE" | "PRO" | "BUSINESS";
    logo?: string | null;
    timezone?: string;
  }) => void;
  getCurrentName: () => string;
  getCurrentPlan: () => "FREE" | "PRO" | "BUSINESS" | null;
  getCurrentId: () => string | null;
};

export const useWorkspaceStore = create<WorkspaceState>((set, get) => {
  // Initialize from localStorage if available
  let initialWorkspace: Workspace | null = null;
  
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("currentWorkspace");
      if (stored) {
        initialWorkspace = JSON.parse(stored);
      }
    } catch {}
  }

  return {
    current: initialWorkspace,
    setCurrent: (ws) => {
      try {
        localStorage.setItem("currentWorkspace", JSON.stringify(ws));
      } catch {}
      set({ current: ws });
    },
    setCurrentFromApi: (ws) => {
      const workspace = {
        id: ws.id,
        name: ws.name,
        plan: ws.plan,
        logo: ws.logo,
        timezone: ws.timezone,
      };
      try {
        localStorage.setItem("currentWorkspace", JSON.stringify(workspace));
      } catch {}
      set({ current: workspace });
    },
    getCurrentName: () => {
      const state = get();
      return state.current?.name || "";
    },
    getCurrentPlan: () => {
      const state = get();
      return state.current?.plan || null;
    },
    getCurrentId: () => {
      const state = get();
      return state.current?.id || null;
    },
  };
});


