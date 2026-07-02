import { http } from "./http";
import type {
  Task,
  TaskType,
  TaskKpi,
  ListTasksResponse,
  ListTasksParams,
  CreateTaskPayload,
  UpdateTaskPayload,
  CompleteTaskPayload,
  DeclineTaskPayload,
  CreateTaskTypePayload,
  UpdateTaskTypePayload,
} from "@/types/tasks.types";

export const tasksApi = {
  getTaskKpi() {
    return http.request<TaskKpi>("/tasks/kpi");
  },

  listTasks(params?: ListTasksParams) {
    const query = params ? "?" + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString() : "";
    return http.request<ListTasksResponse>(`/tasks${query}`);
  },

  getTask(taskId: string) {
    return http.request<Task>(`/tasks/${taskId}`);
  },

  createTask(data: CreateTaskPayload) {
    return http.request<Task>("/tasks", { method: "POST", body: JSON.stringify(data) });
  },

  updateTask(taskId: string, data: UpdateTaskPayload) {
    return http.request<Task>(`/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify(data) });
  },

  acceptTask(taskId: string) {
    return http.request<Task>(`/tasks/${taskId}/accept`, { method: "PATCH" });
  },

  startTask(taskId: string) {
    return http.request<Task>(`/tasks/${taskId}/start`, { method: "PATCH" });
  },

  declineTask(taskId: string, data: DeclineTaskPayload) {
    return http.request<Task>(`/tasks/${taskId}/decline`, { method: "PATCH", body: JSON.stringify(data) });
  },

  completeTask(taskId: string, data: CompleteTaskPayload) {
    return http.request<Task>(`/tasks/${taskId}/complete`, { method: "PATCH", body: JSON.stringify(data) });
  },

  deleteTask(taskId: string) {
    return http.request<{ message: string }>(`/tasks/${taskId}`, { method: "DELETE" });
  },

  listTaskTypes() {
    return http.request<TaskType[]>("/tasks/types");
  },

  createTaskType(data: CreateTaskTypePayload) {
    return http.request<TaskType>("/tasks/types", { method: "POST", body: JSON.stringify(data) });
  },

  updateTaskType(typeId: string, data: UpdateTaskTypePayload) {
    return http.request<TaskType>(`/tasks/types/${typeId}`, { method: "PATCH", body: JSON.stringify(data) });
  },

  deleteTaskType(typeId: string) {
    return http.request<{ message: string }>(`/tasks/types/${typeId}`, { method: "DELETE" });
  },
};
