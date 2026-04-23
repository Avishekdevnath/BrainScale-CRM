"use client";

import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import { useWorkspaceStore } from "@/store/workspace";
import type {
  Task,
  TaskType,
  TaskKpi,
  ListTasksResponse,
  ListTasksParams,
} from "@/types/tasks.types";

export function useTasks(params?: ListTasksParams) {
  const workspaceId = useWorkspaceStore((state) => state.current?.id);
  const key = workspaceId
    ? params
      ? `${workspaceId}:tasks-${JSON.stringify(params)}`
      : `${workspaceId}:tasks`
    : null;

  return useSWR<ListTasksResponse>(
    key,
    () => apiClient.listTasks(params),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );
}

export function useTask(taskId: string | null) {
  return useSWR<Task | null>(
    taskId ? `task-${taskId}` : null,
    () => (taskId ? apiClient.getTask(taskId) : null),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );
}

export function useTaskKpi() {
  const workspaceId = useWorkspaceStore((state) => state.current?.id);

  return useSWR<TaskKpi>(
    workspaceId ? `${workspaceId}:task-kpi` : null,
    () => apiClient.getTaskKpi(),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    }
  );
}

export function useTaskTypes() {
  const workspaceId = useWorkspaceStore((state) => state.current?.id);

  return useSWR<TaskType[]>(
    workspaceId ? `${workspaceId}:task-types` : null,
    () => apiClient.listTaskTypes(),
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  );
}
