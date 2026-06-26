"use client";

import useSWR from "swr";
import { apiClient } from "@/lib/api-client";

export function useMyFeedback() {
  // Revalidate on focus so a super-admin's reply shows up when the user returns.
  return useSWR("feedback:mine", () => apiClient.getMyFeedback(), { revalidateOnFocus: true });
}
