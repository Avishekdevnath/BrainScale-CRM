import { mutate as swrMutate } from "swr";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL!;

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export class AuthExpiredError extends Error {
  status = 401;
  constructor(message = "Session expired. Please log in again.") {
    super(message);
    this.name = "AuthExpiredError";
  }
}

// Get workspace ID from store (lazy loaded to avoid circular dependencies)
export function getWorkspaceId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const { useWorkspaceStore } = require("@/store/workspace");
    return useWorkspaceStore.getState().getCurrentId();
  } catch {
    return null;
  }
}

export function clearAuthStores() {
  if (typeof window === "undefined") return;
  try {
    const { useAuthStore } = require("@/store/auth");
    useAuthStore.getState().clear();
  } catch {}
  try {
    const { useWorkspaceStore } = require("@/store/workspace");
    useWorkspaceStore.getState().clear();
  } catch {}
}

export function isJwtExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload?.exp) return false;
    return Date.now() >= payload.exp * 1000 - 5_000;
  } catch {
    return true;
  }
}

// Helper function to build query string from filters
export function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, String(value));
    }
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

class HttpCore {
  refreshPromise: Promise<void> | null = null;

  get accessToken(): string | null {
    // Read from Zustand store (in-memory only, not localStorage)
    try {
      const { useAuthStore } = require("@/store/auth");
      return useAuthStore.getState().accessToken;
    } catch {
      return null;
    }
  }

  /**
   * Ensures a usable access token is present before dispatching an authed request.
   * - If the in-memory token is expired (decoded exp < now), proactively refresh once.
   * - If refresh fails, clears auth and throws AuthExpiredError so callers stop polling.
   *
   * Returns null for endpoints that don't require auth (login, refresh, etc).
   */
  async ensureAuthToken(endpoint: string): Promise<string | null> {
    // Public endpoints: never attempt refresh.
    if (endpoint.startsWith("/auth/login") || endpoint.startsWith("/auth/refresh") || endpoint.startsWith("/auth/signup")) {
      return null;
    }

    const current = this.accessToken;
    if (!current) return null; // Let server respond 401; AuthGuard handles redirect.
    if (!isJwtExpired(current)) return current;

    // Token is expired — refresh proactively (deduped) before sending the request.
    try {
      await this.refreshAccessToken();
    } catch {
      throw new AuthExpiredError();
    }
    return this.accessToken;
  }

  buildHeaders(init: RequestInit, token: string | null, isFormData: boolean): Headers {
    const headers = new Headers(init.headers);
    if (!isFormData && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const workspaceId = getWorkspaceId();
    if (workspaceId && !headers.has("X-Workspace-Id")) {
      headers.set("X-Workspace-Id", workspaceId);
    }
    return headers;
  }

  /**
   * On 401 from server, refresh once and retry. If refresh itself fails, clear auth
   * and throw AuthExpiredError — this is the ONLY place that handles auth loss,
   * so every caller gets consistent behavior.
   */
  async handle401AndRetry(
    endpoint: string,
    init: RequestInit,
    isFormData: boolean,
  ): Promise<Response> {
    try {
      await this.refreshAccessToken();
    } catch {
      throw new AuthExpiredError();
    }
    const retryHeaders = this.buildHeaders(init, this.accessToken, isFormData);
    return fetch(`${API_BASE_URL}${endpoint}`, {
      ...init,
      headers: retryHeaders,
      credentials: "include",
    });
  }

  async request<T>(endpoint: string, init: RequestInit = {}): Promise<T> {
    const method = (init.method || "GET").toUpperCase();
    const isFormData = init.body instanceof FormData;

    const token = await this.ensureAuthToken(endpoint);
    const headers = this.buildHeaders(init, token, isFormData);

    let res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...init,
      headers,
      credentials: "include",
    });

    // Server-side rejection (e.g., token revoked mid-session) — one refresh attempt then give up.
    if (res.status === 401 && token) {
      res = await this.handle401AndRetry(endpoint, init, isFormData);
    }

    if (!res.ok) throw await this.parseError(res);
    const data = (await res.json()) as T;

    if (typeof window !== "undefined" && method !== "GET") {
      void swrMutate(() => true, undefined, { revalidate: true });
    }
    return data;
  }

  async requestBlob(endpoint: string, init: RequestInit = {}): Promise<Blob> {
    const method = (init.method || "GET").toUpperCase();
    const isFormData = init.body instanceof FormData;

    const token = await this.ensureAuthToken(endpoint);
    const headers = this.buildHeaders(init, token, isFormData);

    let res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...init,
      headers,
      credentials: "include",
    });

    if (res.status === 401 && token) {
      res = await this.handle401AndRetry(endpoint, init, isFormData);
    }

    if (!res.ok) throw await this.parseError(res);
    const blob = await res.blob();

    if (typeof window !== "undefined" && method !== "GET") {
      void swrMutate(() => true, undefined, { revalidate: true });
    }
    return blob;
  }

  async parseError(res: Response): Promise<Error & { status?: number; retryAfter?: number; canRetryAt?: string }> {
    try {
      const data = await res.json();
      const message = data?.error?.message || data?.message || res.statusText;
      const error = new Error(message) as Error & { status?: number; retryAfter?: number; canRetryAt?: string };
      error.status = res.status;

      // Extract retry metadata from 429 errors
      if (res.status === 429 && data?.error) {
        error.retryAfter = data.error.retryAfter;
        error.canRetryAt = data.error.canRetryAt;
      }

      return error;
    } catch {
      const error = new Error(res.statusText) as Error & { status?: number };
      error.status = res.status;
      return error;
    }
  }

  /**
   * Single-flight refresh:
   *  - Concurrent callers share the same in-flight promise (prevents refresh-token rotation races).
   *  - On failure: clears the auth + workspace stores so the infinite 401 loop is broken
   *    and AuthGuard can redirect to /login reactively.
   */
  async refreshAccessToken(): Promise<void> {
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST" satisfies HttpMethod,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await this.parseError(res);
          throw err;
        }
        const data = (await res.json()) as { accessToken: string };
        const { useAuthStore } = require("@/store/auth");
        useAuthStore.getState().setTokens({ accessToken: data.accessToken });
      })
      .catch((err) => {
        clearAuthStores();
        throw err;
      })
      .finally(() => {
        this.refreshPromise = null;
      });

    return this.refreshPromise;
  }
}

export const http = new HttpCore();
