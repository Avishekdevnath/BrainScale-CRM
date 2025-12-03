import type { SWRConfiguration } from "swr";

// Custom fetcher that works with both string keys and function keys
// For function keys (which return promises), we execute them directly
// For string keys, we use the default fetch behavior
export const apiFetcher = async <T>(key: string | (() => Promise<T>)): Promise<T> => {
  if (typeof key === "function") {
    return key();
  }
  // For string keys, use default fetch (this won't be used in our dashboard hooks)
  const res = await fetch(key);
  if (!res.ok) {
    let message = "Request failed";
    try {
      const err = await res.json();
      message = err?.error?.message || err?.message || message;
    } catch {}
    throw new Error(message);
  }
  return res.json();
};

export const defaultSWRConfig: SWRConfiguration = {
  fetcher: apiFetcher,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  shouldRetryOnError: true,
  dedupingInterval: 2000, // Prevent duplicate requests within 2 seconds
};


