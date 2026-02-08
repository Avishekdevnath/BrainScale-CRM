import { create } from "zustand";

export type AddStudentsTab = "select" | "paste" | "import";

export type CallListImportSession = {
  step: "upload" | "map" | "importing" | "done";
  preview: {
    importId: string;
    headers: string[];
    previewRows: Array<Record<string, unknown>>;
    totalRows: number;
    suggestions?: { name?: string; email?: string; phone?: string };
    matchingStats: { willMatch: number; willCreate: number; willSkip: number };
  } | null;
  mapping: { name: string; email?: string; phone?: string };
  options: { matchBy: "email" | "phone" | "name" | "email_or_phone"; createNewStudents: boolean; skipDuplicates: boolean };
  progress: {
    phase: string;
    totalRows: number;
    processedRows: number;
    matched: number;
    created: number;
    added: number;
    duplicates: number;
    errors: number;
    updatedAt: string;
  } | null;
  commitResult: {
    message: string;
    stats: { matched: number; created: number; added: number; duplicates: number; errors: number };
    errors?: string[];
  } | null;
  error: string | null;
};

type State = {
  byCallListId: Record<
    string,
    {
      activeTab: AddStudentsTab;
      importSession?: CallListImportSession;
    }
  >;

  getActiveTab: (callListId: string) => AddStudentsTab;
  setActiveTab: (callListId: string, tab: AddStudentsTab) => void;

  getImportSession: (callListId: string) => CallListImportSession | undefined;
  setImportSession: (callListId: string, session: CallListImportSession | undefined) => void;
  clear: (callListId: string) => void;
};

export const useAddStudentsDialogStore = create<State>((set, get) => ({
  byCallListId: {},

  getActiveTab: (callListId) => get().byCallListId[callListId]?.activeTab ?? "select",
  setActiveTab: (callListId, tab) =>
    set((state) => ({
      byCallListId: {
        ...state.byCallListId,
        [callListId]: {
          ...state.byCallListId[callListId],
          activeTab: tab,
        },
      },
    })),

  getImportSession: (callListId) => get().byCallListId[callListId]?.importSession,
  setImportSession: (callListId, session) =>
    set((state) => ({
      byCallListId: {
        ...state.byCallListId,
        [callListId]: {
          ...state.byCallListId[callListId],
          activeTab: state.byCallListId[callListId]?.activeTab ?? "select",
          importSession: session,
        },
      },
    })),

  clear: (callListId) =>
    set((state) => {
      const next = { ...state.byCallListId };
      delete next[callListId];
      return { byCallListId: next };
    }),
}));

