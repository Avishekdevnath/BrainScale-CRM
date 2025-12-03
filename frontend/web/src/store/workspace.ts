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

const defaultWorkspace: Workspace = {
  id: "1",
  name: "DreamEd Academy",
};

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  current: defaultWorkspace,
  setCurrent: (ws) => set({ current: ws }),
  setCurrentFromApi: (ws) => {
    set({
      current: {
        id: ws.id,
        name: ws.name,
        plan: ws.plan,
        logo: ws.logo,
        timezone: ws.timezone,
      },
    });
  },
  getCurrentName: () => {
    const state = get();
    return state.current?.name || defaultWorkspace.name;
  },
  getCurrentPlan: () => {
    const state = get();
    return state.current?.plan || null;
  },
  getCurrentId: () => {
    const state = get();
    return state.current?.id || null;
  },
}));


