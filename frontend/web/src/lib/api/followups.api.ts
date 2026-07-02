import { http, buildQueryString } from "./http";
import type {
  Followup,
  ListFollowupsParams,
  FollowupsListResponse,
  FollowupCallContext,
  CreateFollowupCallLogRequest,
  CreateFollowupPayload,
} from "@/types/followups.types";
import type { CallLog } from "@/types/call-lists.types";

export const followupsApi = {
  createFollowup(data: CreateFollowupPayload): Promise<Followup> {
    return http.request<Followup>("/followups", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  listFollowups(params?: ListFollowupsParams): Promise<FollowupsListResponse> {
    const queryString = buildQueryString({
      callListId: params?.callListId,
      status: params?.status,
      assignedTo: params?.assignedTo,
      groupId: params?.groupId,
      startDate: params?.startDate,
      endDate: params?.endDate,
      page: params?.page,
      size: params?.size,
    });
    return http.request<FollowupsListResponse>(`/followups${queryString}`, {
      method: "GET",
    });
  },

  getFollowupCallContext(followupId: string): Promise<FollowupCallContext> {
    return http.request<FollowupCallContext>(`/followups/${followupId}/call-context`, {
      method: "GET",
    });
  },

  createFollowupCallLog(data: CreateFollowupCallLogRequest): Promise<CallLog> {
    return http.request<CallLog>("/call-logs/followup", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};
