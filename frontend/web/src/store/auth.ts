import { create } from "zustand";

type User = {
  id: string;
  name: string | null;
  email: string;
};

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  setTokens: (tokens: { accessToken: string; refreshToken: string; user?: User }) => void;
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
  let initialRefreshToken: string | null = null;
  
  if (typeof window !== "undefined") {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        initialUser = JSON.parse(storedUser);
      }
      initialAccessToken = localStorage.getItem("accessToken");
      initialRefreshToken = localStorage.getItem("refreshToken");
    } catch {}
  }

  return {
    accessToken: initialAccessToken,
    refreshToken: initialRefreshToken,
    user: initialUser,
    setTokens: ({ accessToken, refreshToken, user }) => {
      try {
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);
        if (user) {
          localStorage.setItem("user", JSON.stringify(user));
        }
      } catch {}
      set({ accessToken, refreshToken, user: user || null });
    },
    setUser: (user) => {
      try {
        localStorage.setItem("user", JSON.stringify(user));
      } catch {}
      set({ user });
    },
    clear: () => {
      try {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
      } catch {}
      set({ accessToken: null, refreshToken: null, user: null });
    },
  };
});


