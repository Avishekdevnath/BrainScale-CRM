import { prisma } from '../../db/client';
import { AppError } from '../../middleware/error-handler';
import type { CreateTaskTypeInput, UpdateTaskTypeInput } from './task-type.schemas';

export const listTaskTypes = async (workspaceId: string) => {
  return prisma.taskType.findMany({
    where: { workspaceId },
    orderBy: { name: 'asc' },
  });
};

export const createTaskType = async (workspaceId: string, data: CreateTaskTypeInput) => {
  const existing = await prisma.taskType.findFirst({
    where: { workspaceId, name: { equals: data.name, mode: 'insensitive' } },
  });
  if (existing) throw new AppError(409, `Task type "${data.name}" already exists`);

  return prisma.taskType.create({
    data: {
      workspaceId,
      name: data.name,
      color: data.color,
      description: data.description ?? null,
    },
  });
};

export const updateTaskType = async (
  taskTypeId: string,
  workspaceId: string,
  data: UpdateTaskTypeInput
) => {
  const type = await prisma.taskType.findFirst({ where: { id: taskTypeId, workspaceId } });
  if (!type) throw new AppError(404, 'Task type not found');

  if (data.name && data.name !== type.name) {
    const conflict = await prisma.taskType.findFirst({
      where: { workspaceId, name: { equals: data.name, mode: 'insensitive' }, id: { not: taskTypeId } },
    });
    if (conflict) throw new AppError(409, `Task type "${data.name}" already exists`);
  }

  return prisma.taskType.update({
    where: { id: taskTypeId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.description !== undefined && { description: data.description }),
    },
  });
};

export const deleteTaskType = async (taskTypeId: string, workspaceId: string) => {
  const type = await prisma.taskType.findFirst({ where: { id: taskTypeId, workspaceId } });
  if (!type) throw new AppError(404, 'Task type not found');

  // Unlink tasks before deleting (SetNull handles this via Prisma relation)
  await prisma.taskType.delete({ where: { id: taskTypeId } });
  return { message: 'Task type deleted' };
};
