import { http, buildQueryString } from "./http";
import type {
  CreateScheduleExceptionPayload,
  SaveScheduleTemplatePayload,
  ScheduleException,
  ScheduleTemplateResponse,
} from "@/types/schedule.types";

export const scheduleApi = {
  getScheduleTemplate() {
    return http.request<ScheduleTemplateResponse>("/schedule/template");
  },

  saveScheduleTemplate(payload: SaveScheduleTemplatePayload) {
    return http.request<ScheduleTemplateResponse>("/schedule/template", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  listScheduleExceptions(date: string) {
    const query = buildQueryString({ date });
    return http.request<ScheduleException[]>(`/schedule/exceptions${query}`);
  },

  createScheduleException(payload: CreateScheduleExceptionPayload) {
    return http.request<ScheduleException>("/schedule/exceptions", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  deleteScheduleException(id: string) {
    return http.request<{ message: string }>(`/schedule/exceptions/${id}`, { method: "DELETE" });
  },

  broadcastSchedule(recipientEmails: string[], formats: string[], scheduleName: string) {
    return http.request<{ message: string; recipientCount: number; formats: string[] }>("/schedule/broadcast", {
      method: "POST",
      body: JSON.stringify({
        recipientEmails,
        formats,
        scheduleName,
      }),
    });
  },
};
