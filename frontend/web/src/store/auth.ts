import { create } from "zustand";

type User = {
  id: string;
  name: string | null;
  email: string;
};

type AuthState = {
  accessToken: string | null;
  user: User | null;
  setTokens: (tokens: { accessToken: string; user?: User }) => void;
  setUser: (user: User) => void;
  clear: () => void;
};

// Helper to get user initials
export function getUserInitials(user: User | null): string {
  if (!user) return "U";
  if (user.name) {
    const parts = user.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return user.name.substring(0, 2).toUpperCase();
  }
  if (user.email) {
    return user.email.substring(0, 2).toUpperCase();
  }
  return "U";
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Initialize from localStorage if available
  let initialUser: User | null = null;
  let initialAccessToken: string | null = null;

  if (typeof window !== "undefined") {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        initialUser = JSON.parse(storedUser);
      }
      // accessToken is now kept in memory only (lost on refresh, will be re-fetched silently)
      // refreshToken is now in httpOnly cookie (not accessible from JS)
    } catch {}
  }

  return {
    accessToken: initialAccessToken,
    user: initialUser,
    setTokens: ({ accessToken, user }) => {
      try {
        if (user) {
          localStorage.setItem("user", JSON.stringify(user));
        }
      } catch {}
      // If no user provided, keep the existing user in state (don't overwrite with null)
      set((state) => ({ accessToken, user: user ?? state.user }));
    },
    setUser: (user) => {
      try {
        localStorage.setItem("user", JSON.stringify(user));
      } catch {}
      set({ user });
    },
    clear: () => {
      try {
        localStorage.removeItem("user");
        // accessToken and refreshToken don't exist in localStorage anymore
      } catch {}
      set({ accessToken: null, user: null });
    },
  };
});


