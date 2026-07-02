import { http, buildQueryString, getWorkspaceId } from "./http";
import type {
  CreateFormPayload,
  FormItem,
  FormResponseItem,
  SubmitFormPayload,
  UpdateFormPayload,
} from "@/types/forms.types";

function requireWorkspaceIdForForms(): string {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID is required for forms operations.");
  }
  return workspaceId;
}

export const formsApi = {
  async createForm(payload: CreateFormPayload): Promise<FormItem> {
    const workspaceId = requireWorkspaceIdForForms();
    const res = await http.request<{ success: boolean; data: FormItem }>(
      `/workspaces/${workspaceId}/forms`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    return res.data;
  },

  async getForms(params?: { q?: string; page?: number; size?: number }): Promise<FormItem[]> {
    const workspaceId = requireWorkspaceIdForForms();
    const queryString = buildQueryString({
      q: params?.q,
      page: params?.page,
      size: params?.size,
    });
    const res = await http.request<{ success: boolean; data: FormItem[] }>(
      `/workspaces/${workspaceId}/forms${queryString}`,
      { method: "GET" }
    );
    return res.data;
  },

  async getFormById(formId: string): Promise<FormItem> {
    const workspaceId = requireWorkspaceIdForForms();
    const res = await http.request<{ success: boolean; data: FormItem }>(
      `/workspaces/${workspaceId}/forms/${formId}`,
      { method: "GET" }
    );
    return res.data;
  },

  async updateForm(formId: string, payload: UpdateFormPayload): Promise<FormItem> {
    const workspaceId = requireWorkspaceIdForForms();
    const res = await http.request<{ success: boolean; data: FormItem }>(
      `/workspaces/${workspaceId}/forms/${formId}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      }
    );
    return res.data;
  },

  async publishForm(formId: string): Promise<FormItem> {
    const workspaceId = requireWorkspaceIdForForms();
    const res = await http.request<{ success: boolean; data: FormItem }>(
      `/workspaces/${workspaceId}/forms/${formId}/publish`,
      { method: "POST" }
    );
    return res.data;
  },

  async archiveForm(formId: string): Promise<FormItem> {
    const workspaceId = requireWorkspaceIdForForms();
    const res = await http.request<{ success: boolean; data: FormItem }>(
      `/workspaces/${workspaceId}/forms/${formId}/archive`,
      { method: "POST" }
    );
    return res.data;
  },

  async getFormResponses(formId: string, params?: { page?: number; size?: number }): Promise<FormResponseItem[]> {
    const workspaceId = requireWorkspaceIdForForms();
    const queryString = buildQueryString({ page: params?.page, size: params?.size });
    const res = await http.request<{ success: boolean; data: FormResponseItem[] }>(
      `/workspaces/${workspaceId}/forms/${formId}/responses${queryString}`,
      { method: "GET" }
    );
    return res.data;
  },

  async exportFormResponses(formId: string, format: "json" | "csv" = "csv"): Promise<Blob> {
    const workspaceId = requireWorkspaceIdForForms();
    const queryString = buildQueryString({ format });
    return http.requestBlob(
      `/workspaces/${workspaceId}/forms/${formId}/responses/export${queryString}`,
      { method: "GET" }
    );
  },

  async checkFormSlugAvailability(slug: string, excludeFormId?: string): Promise<{ available: boolean }> {
    const workspaceId = requireWorkspaceIdForForms();
    const qs = buildQueryString({ slug, ...(excludeFormId ? { exclude: excludeFormId } : {}) });
    const res = await http.request<{ success: boolean; data: { available: boolean } }>(
      `/workspaces/${workspaceId}/forms/check-slug${qs}`,
      { method: "GET" }
    );
    return res.data;
  },

  async getPublicFormBySlug(slug: string): Promise<FormItem> {
    const res = await http.request<{ success: boolean; data: FormItem }>(`/forms/${slug}`, {
      method: "GET",
    });
    return res.data;
  },

  async submitPublicForm(slug: string, payload: SubmitFormPayload): Promise<FormResponseItem> {
    const res = await http.request<{ success: boolean; data: FormResponseItem }>(
      `/forms/${slug}/submit`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    return res.data;
  },
};
