import { prisma } from '../../db/client';
import { AppError } from '../../middleware/error-handler';
import { createNotification } from '../notifications/notification.service';
import { sendTaskAssignmentEmail } from '../emails/email.service';
import {
  CreateTaskInput,
  UpdateTaskInput,
  CompleteTaskInput,
  DeclineTaskInput,
  ListTasksInput,
  TaskStatus,
} from './task.schemas';
import { logger } from '../../config/logger';

const isSelfAssigned = (assignedToId: string, assignedById: string) =>
  assignedToId === assignedById;

const enrichWithIsOverdue = (task: any) => ({
  ...task,
  isOverdue:
    (task.status === TaskStatus.ACCEPTED || task.status === TaskStatus.IN_PROGRESS) &&
    new Date(task.dueDate) < new Date(),
});

const requireMember = async (userId: string, workspaceId: string) => {
  const member = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId },
  });
  if (!member) throw new AppError(403, 'You must be a workspace member');
  return member;
};

const getTaskInWorkspace = async (taskId: string, workspaceId: string) => {
  const task = await prisma.task.findFirst({
    where: { id: taskId, workspaceId },
  });
  if (!task) throw new AppError(404, 'Task not found');
  return task;
};

const checkVisibility = (task: any, memberId: string, role: string) => {
  if (role === 'ADMIN') return;
  if (task.assignedToId !== memberId && task.assignedById !== memberId) {
    throw new AppError(403, 'Access denied');
  }
};

/** Get userId from WorkspaceMember id */
const getUserIdFromMemberId = async (memberId: string): Promise<string | null> => {
  const m = await prisma.workspaceMember.findFirst({ where: { id: memberId }, select: { userId: true } });
  return m?.userId ?? null;
};

const notify = async (params: {
  workspaceId: string;
  memberId: string;
  type: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}) => {
  try {
    const userId = await getUserIdFromMemberId(params.memberId);
    if (!userId) return;
    await createNotification({
      workspaceId: params.workspaceId,
      userId,
      type: params.type,
      title: params.title,
      body: params.body,
      meta: params.metadata,
    });
  } catch (err) {
    logger.error({ err, params }, 'Task notification failed (non-fatal)');
  }
};

export const createTask = async (
  workspaceId: string,
  userId: string,
  data: CreateTaskInput
) => {
  const assignerMember = await requireMember(userId, workspaceId);

  const assigneeMember = await prisma.workspaceMember.findFirst({
    where: { id: data.assignedToId, workspaceId },
  });
  if (!assigneeMember) throw new AppError(400, 'Assignee is not a member of this workspace');

  const selfAssigned = isSelfAssigned(data.assignedToId, assignerMember.id);

  const referredByMemberId = selfAssigned ? (data.referredByMemberId ?? null) : null;
  // If referredByMemberId is set it takes priority; referredByName is only used when no member ID given
  const referredByName = selfAssigned
    ? referredByMemberId
      ? null
      : (data.referredByName ?? null)
    : null;

  const initialStatus = selfAssigned ? TaskStatus.IN_PROGRESS : TaskStatus.AWAITING_ACCEPTANCE;

  const task = await prisma.task.create({
    data: {
      workspaceId,
      title: data.title,
      description: data.description ?? null,
      assignedToId: data.assignedToId,
      assignedById: assignerMember.id,
      referredByMemberId,
      referredByName,
      dueDate: new Date(data.dueDate),
      priority: data.priority,
      status: initialStatus,
      taskTypeId: data.taskTypeId ?? null,
      linkedEntityType: data.linkedEntityType ?? null,
      linkedEntityId: data.linkedEntityId ?? null,
    },
  });

  void sendTaskAssignmentEmail(task.id).catch((error) => {
    logger.error(
      {
        error,
        taskId: task.id,
        assignedToId: task.assignedToId,
      },
      'Task assignment email failed (non-fatal)'
    );
  });

  if (!selfAssigned) {
    void notify({
      workspaceId,
      memberId: data.assignedToId,
      type: 'TASK_ASSIGNED',
      title: 'New task assigned',
      body: `You have been assigned a new task: "${data.title}"`,
      metadata: { taskId: task.id },
    });
  }

  return enrichWithIsOverdue(task);
};

export const listTasks = async (
  workspaceId: string,
  userId: string,
  role: string,
  options: ListTasksInput
) => {
  const member = await requireMember(userId, workspaceId);

  const where: any = { workspaceId };

  if (role !== 'ADMIN') {
    where.OR = [{ assignedToId: member.id }, { assignedById: member.id }];
  }

  if (options.status) where.status = options.status;
  if (options.priority) where.priority = options.priority;
  if (options.assignedToId) where.assignedToId = options.assignedToId;
  if (options.assignedById) where.assignedById = options.assignedById;
  if (options.taskTypeId) where.taskTypeId = options.taskTypeId;
  if (options.search) where.title = { contains: options.search, mode: 'insensitive' };
  if (options.dueDateFrom || options.dueDateTo) {
    where.dueDate = {};
    if (options.dueDateFrom) where.dueDate.gte = new Date(options.dueDateFrom);
    if (options.dueDateTo) where.dueDate.lte = new Date(options.dueDateTo);
  }

  const skip = (options.page - 1) * options.size;

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: { [options.sortBy]: options.sortOrder },
      skip,
      take: options.size,
      include: {
        assignedTo: { include: { user: { select: { name: true } } } },
        assignedBy: { include: { user: { select: { name: true } } } },
        taskType: { select: { id: true, name: true, color: true } },
      },
    }),
    prisma.task.count({ where }),
  ]);

  return {
    data: tasks.map(enrichWithIsOverdue),
    total,
    page: options.page,
    size: options.size,
    totalPages: Math.ceil(total / options.size),
  };
};

export const getTask = async (
  taskId: string,
  workspaceId: string,
  userId: string,
  role: string
) => {
  const member = await requireMember(userId, workspaceId);

  const task = await prisma.task.findFirst({
    where: { id: taskId, workspaceId },
    include: {
      assignedTo: { include: { user: { select: { name: true } } } },
      assignedBy: { include: { user: { select: { name: true } } } },
      taskType: { select: { id: true, name: true, color: true } },
    },
  });
  if (!task) throw new AppError(404, 'Task not found');

  checkVisibility(task, member.id, role);

  let linkedEntityDeleted = false;
  if (task.linkedEntityType && task.linkedEntityId) {
    let found = false;
    if (task.linkedEntityType === 'call_list') {
      found = !!(await prisma.callList.findFirst({ where: { id: task.linkedEntityId, workspaceId } }));
    } else if (task.linkedEntityType === 'group') {
      found = !!(await prisma.group.findFirst({ where: { id: task.linkedEntityId, workspaceId } }));
    } else if (task.linkedEntityType === 'student') {
      found = !!(await prisma.student.findFirst({ where: { id: task.linkedEntityId, workspaceId } }));
    } else if (task.linkedEntityType === 'form') {
      found = !!(await prisma.form.findFirst({ where: { id: task.linkedEntityId, workspaceId } }));
    }
    linkedEntityDeleted = !found;
  }

  return { ...enrichWithIsOverdue(task), linkedEntityDeleted };
};

export const updateTask = async (
  taskId: string,
  workspaceId: string,
  userId: string,
  role: string,
  data: UpdateTaskInput
) => {
  const member = await requireMember(userId, workspaceId);
  const task = await getTaskInWorkspace(taskId, workspaceId);

  if (role !== 'ADMIN' && task.assignedById !== member.id) {
    throw new AppError(403, 'Only the task creator or admin can edit this task');
  }
  if (task.status === TaskStatus.DONE) {
    throw new AppError(400, 'Cannot edit a completed task');
  }

  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.linkedEntityType !== undefined) updateData.linkedEntityType = data.linkedEntityType;
  if (data.linkedEntityId !== undefined) updateData.linkedEntityId = data.linkedEntityId;
  if (data.dueDate !== undefined) {
    updateData.dueDate = new Date(data.dueDate);
    updateData.dueSoonNotifiedAt = null;
  }

  const updated = await prisma.task.update({ where: { id: taskId }, data: updateData });
  return enrichWithIsOverdue(updated);
};

export const acceptTask = async (
  taskId: string,
  workspaceId: string,
  userId: string,
  role: string
) => {
  const member = await requireMember(userId, workspaceId);
  const task = await getTaskInWorkspace(taskId, workspaceId);

  if (role !== 'ADMIN' && task.assignedToId !== member.id) {
    throw new AppError(403, 'Only the assignee can accept this task');
  }
  if (task.status !== TaskStatus.AWAITING_ACCEPTANCE) {
    throw new AppError(400, `Cannot accept task in status: ${task.status}`);
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { status: TaskStatus.ACCEPTED },
  });

  void notify({
    workspaceId,
    memberId: task.assignedById,
    type: 'TASK_ACCEPTED',
    title: 'Task accepted',
    body: `Your task "${task.title}" has been accepted`,
    metadata: { taskId },
  });

  return enrichWithIsOverdue(updated);
};

export const startTask = async (
  taskId: string,
  workspaceId: string,
  userId: string,
  role: string
) => {
  const member = await requireMember(userId, workspaceId);
  const task = await getTaskInWorkspace(taskId, workspaceId);

  if (role !== 'ADMIN' && task.assignedToId !== member.id) {
    throw new AppError(403, 'Only the assignee can start this task');
  }
  if (task.status !== TaskStatus.ACCEPTED) {
    throw new AppError(400, `Cannot start task in status: ${task.status}`);
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { status: TaskStatus.IN_PROGRESS },
  });

  void notify({
    workspaceId,
    memberId: task.assignedById,
    type: 'TASK_STARTED',
    title: 'Task started',
    body: `Task "${task.title}" has been started`,
    metadata: { taskId },
  });

  return enrichWithIsOverdue(updated);
};

export const declineTask = async (
  taskId: string,
  workspaceId: string,
  userId: string,
  data: DeclineTaskInput
) => {
  const member = await requireMember(userId, workspaceId);
  const task = await getTaskInWorkspace(taskId, workspaceId);

  // Only assignee can decline (admin cannot)
  if (task.assignedToId !== member.id) {
    throw new AppError(403, 'Only the assignee can decline this task');
  }
  if (task.status !== TaskStatus.AWAITING_ACCEPTANCE && task.status !== TaskStatus.ACCEPTED) {
    throw new AppError(400, `Cannot decline task in status: ${task.status}`);
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { status: TaskStatus.DECLINED, declineNote: data.declineNote ?? null },
  });

  void notify({
    workspaceId,
    memberId: task.assignedById,
    type: 'TASK_DECLINED',
    title: 'Task declined',
    body: `Your task "${task.title}" has been declined`,
    metadata: { taskId },
  });

  return enrichWithIsOverdue(updated);
};

export const completeTask = async (
  taskId: string,
  workspaceId: string,
  userId: string,
  role: string,
  data: CompleteTaskInput
) => {
  const member = await requireMember(userId, workspaceId);
  const task = await getTaskInWorkspace(taskId, workspaceId);

  if (role !== 'ADMIN' && task.assignedToId !== member.id) {
    throw new AppError(403, 'Only the assignee or admin can complete this task');
  }
  if (task.status !== TaskStatus.IN_PROGRESS) {
    throw new AppError(400, `Cannot complete task in status: ${task.status}`);
  }

  const selfAssigned = isSelfAssigned(task.assignedToId, task.assignedById);

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: TaskStatus.DONE,
      completionNote: data.completionNote ?? null,
      completedAt: new Date(),
    },
  });

  if (!selfAssigned) {
    void notify({
      workspaceId,
      memberId: task.assignedById,
      type: 'TASK_COMPLETED',
      title: 'Task completed',
      body: `Task "${task.title}" has been marked as done`,
      metadata: { taskId },
    });
  }

  return enrichWithIsOverdue(updated);
};

export const deleteTask = async (
  taskId: string,
  workspaceId: string,
  userId: string,
  role: string
) => {
  const member = await requireMember(userId, workspaceId);
  const task = await getTaskInWorkspace(taskId, workspaceId);

  if (role !== 'ADMIN' && task.assignedById !== member.id) {
    throw new AppError(403, 'Only the task creator or admin can delete this task');
  }
  if (task.status === TaskStatus.DONE) {
    throw new AppError(400, 'Cannot delete a completed task — it is a permanent record');
  }

  const selfAssigned = isSelfAssigned(task.assignedToId, task.assignedById);

  await prisma.task.delete({ where: { id: taskId } });

  if (!selfAssigned) {
    void notify({
      workspaceId,
      memberId: task.assignedToId,
      type: 'TASK_CANCELLED',
      title: 'Task cancelled',
      body: `Task "${task.title}" has been cancelled`,
      metadata: { taskId },
    });
  }

  return { message: 'Task deleted successfully' };
};

export const getTaskKpi = async (
  workspaceId: string,
  userId: string,
  role: string
) => {
  const member = await requireMember(userId, workspaceId);

  const baseWhere: any = { workspaceId };
  if (role !== 'ADMIN') {
    baseWhere.OR = [{ assignedToId: member.id }, { assignedById: member.id }];
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const [totalActive, completed, overdue, dueToday] = await Promise.all([
    prisma.task.count({
      where: { ...baseWhere, status: { in: [TaskStatus.ACCEPTED, TaskStatus.IN_PROGRESS] } },
    }),
    prisma.task.count({ where: { ...baseWhere, status: TaskStatus.DONE } }),
    prisma.task.count({
      where: {
        ...baseWhere,
        status: { in: [TaskStatus.ACCEPTED, TaskStatus.IN_PROGRESS] },
        dueDate: { lt: now },
      },
    }),
    prisma.task.count({
      where: {
        ...baseWhere,
        status: { in: [TaskStatus.ACCEPTED, TaskStatus.IN_PROGRESS] },
        dueDate: { gte: todayStart, lt: tomorrowStart },
      },
    }),
  ]);

  return { totalActive, completed, overdue, dueToday };
};
