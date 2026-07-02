import { http, buildQueryString } from "./http";
import type {
  QuestionPreset,
  CreateQuestionPresetPayload,
  UpdateQuestionPresetPayload,
  QuestionPresetsListResponse,
} from "@/types/call-lists.types";
import type {
  AuditLogsResponse,
  GetAuditLogsParams,
} from "@/types/audit-logs.types";

export const miscApi = {
  submitFeedback(body: { title?: string; message: string; type?: string }) {
    return http.request<{ id: string }>(`/feedback`, {
      method: "POST", body: JSON.stringify(body),
    });
  },
  getMyFeedback() {
    return http.request<Array<{
      id: string; title: string | null; type: string; status: string; message: string;
      reply: string | null; repliedAt: string | null; createdAt: string;
    }>>(`/feedback/mine`, { method: "GET" });
  },

  sendTestEmail(body: { to: string; subject?: string; message?: string }) {
    return http.request<{
      message: string;
      sent: boolean;
      to: string;
      subject: string;
      sentAt: string;
    }>("/emails/test", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  getAuditLogs(params?: GetAuditLogsParams): Promise<AuditLogsResponse> {
    const queryString = buildQueryString({
      page: params?.page,
      size: params?.size,
      userId: params?.userId,
      action: params?.action,
      entity: params?.entity,
      dateFrom: params?.dateFrom,
      dateTo: params?.dateTo,
    });
    return http.request<AuditLogsResponse>(`/audit-logs${queryString}`, {
      method: "GET",
    });
  },

  // Question Presets
  getQuestionPresets(): Promise<QuestionPresetsListResponse> {
    return http.request<QuestionPresetsListResponse>("/question-presets");
  },

  createQuestionPreset(payload: CreateQuestionPresetPayload): Promise<QuestionPreset> {
    return http.request<QuestionPreset>("/question-presets", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateQuestionPreset(id: string, payload: UpdateQuestionPresetPayload): Promise<QuestionPreset> {
    return http.request<QuestionPreset>(`/question-presets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deleteQuestionPreset(id: string): Promise<{ success: boolean }> {
    return http.request<{ success: boolean }>(`/question-presets/${id}`, {
      method: "DELETE",
    });
  },
};
