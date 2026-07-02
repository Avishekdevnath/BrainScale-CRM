import crypto from 'crypto';
import { prisma } from '../../db/client';
import { AppError } from '../../middleware/error-handler';
import { createWorkspaceWithOwner } from '../workspaces/workspace.service';
import { writePlatformAudit } from './platform-audit';
import { hashPassword } from '../../auth/password';
import { sendTemporaryPasswordEmail } from '../../utils/email';
import {
  ListWorkspacesQueryInput,
  CreateWorkspaceBodyInput,
  UpdateWorkspaceBodyInput,
  AddMemberBodyInput,
  ListUsersQueryInput,
  ListAuditQueryInput,
  UpdateUserBodyInput,
  ListFeedbackQueryInput,
  CreateAnnouncementBodyInput,
  ListAnnouncementsQueryInput,
} from './platform.schemas';
import { createNotification } from '../notifications/notification.service';
import { sanitizeAnnouncementRich } from './announcement-rich';
import { tiptapToPlainText } from '../../utils/tiptap';

// "Not soft-deleted" — must match both an explicit null AND an unset field,
// because documents created before `deletedAt` existed (or created without it)
// have no such key, and Mongo's `{ deletedAt: null }` does not match unset fields.
const NOT_DELETED = { OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] };

export const getOverview = async () => {
  const [workspaces, members, students, callLists, callLogs] = await Promise.all([
    prisma.workspace.count({ where: NOT_DELETED }),
    prisma.workspaceMember.count(),
    prisma.student.count(),
    prisma.callList.count(),
    prisma.callLog.count(),
  ]);
  return { workspaces, members, students, callLists, callLogs };
};

export const listWorkspaces = async (q: ListWorkspacesQueryInput) => {
  const where: any = { ...NOT_DELETED };
  if (q.q) where.name = { contains: q.q, mode: 'insensitive' };

  const orderBy =
    q.sort === 'members' ? { members: { _count: q.order } } : { [q.sort]: q.order };

  const [rows, total] = await Promise.all([
    prisma.workspace.findMany({
      where,
      orderBy,
      skip: (q.page - 1) * q.size,
      take: q.size,
      select: {
        id: true,
        name: true,
        plan: true,
        callSystemV2: true,
        _count: { select: { members: true, students: true } },
      },
    }),
    prisma.workspace.count({ where }),
  ]);

  return {
    items: rows.map((w: any) => ({
      id: w.id,
      name: w.name,
      plan: w.plan,
      callSystemV2: w.callSystemV2,
      memberCount: w._count.members,
      studentCount: w._count.students,
    })),
    page: q.page,
    size: q.size,
    total,
  };
};

export const createWorkspace = async (
  actorUserId: string,
  body: CreateWorkspaceBodyInput,
): Promise<{ id: string; name: string; tempPassword?: string }> => {
  let ownerUserId: string;
  let tempPassword: string | undefined;

  if (body.owner.mode === 'existing') {
    const existing = await prisma.user.findUnique({ where: { email: body.owner.email } });
    if (!existing) throw new AppError(400, `No user with email ${body.owner.email}`);
    ownerUserId = existing.id;
  } else {
    const dupe = await prisma.user.findUnique({ where: { email: body.owner.email } });
    if (dupe) throw new AppError(409, `User already exists: ${body.owner.email}`);
    tempPassword = crypto.randomBytes(12).toString('base64url');
    const created = await prisma.user.create({
      data: {
        email: body.owner.email,
        name: body.owner.name,
        passwordHash: await hashPassword(tempPassword),
        temporaryPassword: true,
        mustChangePassword: true,
      } as any,
    });
    ownerUserId = created.id;
  }

  const ws = await createWorkspaceWithOwner({
    ownerUserId,
    data: { name: body.name, plan: body.plan },
    callSystemV2: body.callSystemV2,
  });

  await writePlatformAudit(prisma, {
    actorUserId,
    action: 'workspace.create',
    targetType: 'workspace',
    targetId: ws.id,
    metadata: { name: ws.name, ownerEmail: body.owner.email, ownerMode: body.owner.mode },
  });

  if (tempPassword && body.owner.mode === 'new') {
    await sendTemporaryPasswordEmail(body.owner.email, body.owner.name, ws.name, tempPassword).catch(() => {
      /* best-effort / queued */
    });
  }

  return { id: ws.id, name: ws.name, tempPassword };
};

export const getWorkspace = async (id: string) => {
  const ws = await prisma.workspace.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      plan: true,
      callSystemV2: true,
      aiFeaturesEnabled: true,
      tasksEnabled: true,
      revenueEnabled: true,
      timezone: true,
      deletedAt: true,
      createdAt: true,
      _count: { select: { members: true, students: true, callLists: true, callLogs: true, calls: true } },
      members: {
        select: {
          id: true,
          role: true,
          user: { select: { id: true, email: true, name: true } },
        },
      },
    },
  });
  if (!ws || ws.deletedAt) throw new AppError(404, 'Workspace not found');
  const { deletedAt, _count, ...rest } = ws as any;
  return {
    ...rest,
    memberCount: _count.members,
    studentCount: _count.students,
    callListCount: _count.callLists,
    callLogCount: _count.callLogs,
    callCount: _count.calls,
  };
};

export const updateWorkspace = async (
  actorUserId: string,
  id: string,
  body: UpdateWorkspaceBodyInput,
) => {
  const before = await prisma.workspace.findUnique({
    where: { id },
    select: { id: true, name: true, plan: true, callSystemV2: true, deletedAt: true },
  });
  if (!before || before.deletedAt) throw new AppError(404, 'Workspace not found');

  const data: any = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.plan !== undefined) data.plan = body.plan;
  if (body.callSystemV2 !== undefined) data.callSystemV2 = body.callSystemV2;
  if (body.aiFeaturesEnabled !== undefined) data.aiFeaturesEnabled = body.aiFeaturesEnabled;
  if (body.tasksEnabled !== undefined) data.tasksEnabled = body.tasksEnabled;
  if (body.revenueEnabled !== undefined) data.revenueEnabled = body.revenueEnabled;

  await prisma.workspace.update({ where: { id }, data });
  await writePlatformAudit(prisma, {
    actorUserId,
    action: 'workspace.update',
    targetType: 'workspace',
    targetId: id,
    metadata: {
      before: { name: before.name, plan: before.plan, callSystemV2: before.callSystemV2 },
      after: data,
    },
  });
  return { id };
};

export const softDeleteWorkspace = async (actorUserId: string, id: string) => {
  const ws = await prisma.workspace.findUnique({ where: { id }, select: { id: true, deletedAt: true } });
  if (!ws || ws.deletedAt) throw new AppError(404, 'Workspace not found');
  await prisma.workspace.update({ where: { id }, data: { deletedAt: new Date() } });
  await writePlatformAudit(prisma, {
    actorUserId,
    action: 'workspace.softDelete',
    targetType: 'workspace',
    targetId: id,
  });
  return { id };
};

export const listMembers = async (workspaceId: string) => {
  return prisma.workspaceMember.findMany({
    where: { workspaceId },
    select: { id: true, role: true, user: { select: { id: true, email: true, name: true } } },
  });
};

export const addMember = async (
  actorUserId: string,
  workspaceId: string,
  body: AddMemberBodyInput,
): Promise<{ id: string; tempPassword?: string }> => {
  let userId: string;
  let tempPassword: string | undefined;

  if (body.user.mode === 'existing') {
    const existing = await prisma.user.findUnique({ where: { email: body.user.email } });
    if (!existing) throw new AppError(400, `No user with email ${body.user.email}`);
    userId = existing.id;
  } else {
    const dupe = await prisma.user.findUnique({ where: { email: body.user.email } });
    if (dupe) throw new AppError(409, `User already exists: ${body.user.email}`);
    tempPassword = crypto.randomBytes(12).toString('base64url');
    const created = await prisma.user.create({
      data: {
        email: body.user.email,
        name: body.user.name,
        passwordHash: await hashPassword(tempPassword),
        temporaryPassword: true,
        mustChangePassword: true,
      } as any,
    });
    userId = created.id;
  }

  const member = await prisma.workspaceMember.create({
    data: { workspaceId, userId, role: body.role },
  });
  await writePlatformAudit(prisma, {
    actorUserId,
    action: 'member.add',
    targetType: 'member',
    targetId: member.id,
    metadata: { workspaceId, email: body.user.email, role: body.role },
  });
  if (tempPassword && body.user.mode === 'new') {
    const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } });
    await sendTemporaryPasswordEmail(
      body.user.email, body.user.name, ws?.name ?? 'your workspace', tempPassword,
    ).catch(() => {});
  }
  return { id: member.id, tempPassword };
};

export const changeMemberRole = async (actorUserId: string, memberId: string, role: string) => {
  const member = await prisma.workspaceMember.findUnique({
    where: { id: memberId },
    select: { id: true, role: true, workspaceId: true },
  });
  if (!member) throw new AppError(404, 'Member not found');
  await prisma.workspaceMember.update({ where: { id: memberId }, data: { role } });
  await writePlatformAudit(prisma, {
    actorUserId,
    action: 'member.roleChange',
    targetType: 'member',
    targetId: memberId,
    metadata: { from: member.role, to: role },
  });
  return { id: memberId };
};

// ---- Platform user management ----

/** Active super-admins = isSuperAdmin AND not deactivated (null or unset disabledAt). */
const countActiveSuperAdmins = () =>
  prisma.user.count({
    where: {
      isSuperAdmin: true,
      OR: [{ disabledAt: null }, { disabledAt: { isSet: false } }],
    },
  });

export const listUsers = async (q: ListUsersQueryInput) => {
  const where: any = {};
  if (q.q) {
    where.OR = [
      { email: { contains: q.q, mode: 'insensitive' } },
      { name: { contains: q.q, mode: 'insensitive' } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { [q.sort]: q.order },
      skip: (q.page - 1) * q.size,
      take: q.size,
      select: {
        id: true,
        email: true,
        name: true,
        isSuperAdmin: true,
        disabledAt: true,
        createdAt: true,
        _count: { select: { memberships: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items: rows.map((u: any) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      isSuperAdmin: u.isSuperAdmin,
      disabledAt: u.disabledAt ?? null,
      createdAt: u.createdAt,
      workspaceCount: u._count.memberships,
    })),
    page: q.page,
    size: q.size,
    total,
  };
};

export const setSuperAdmin = async (
  actorUserId: string,
  targetUserId: string,
  isSuperAdmin: boolean,
) => {
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, isSuperAdmin: true },
  });
  if (!target) throw new AppError(404, 'User not found');

  // Never leave the platform without an active super-admin.
  if (!isSuperAdmin && target.isSuperAdmin) {
    const active = await countActiveSuperAdmins();
    if (active <= 1) {
      throw new AppError(409, 'Cannot revoke the last active super-admin');
    }
  }

  await prisma.user.update({ where: { id: targetUserId }, data: { isSuperAdmin } });
  await writePlatformAudit(prisma, {
    actorUserId,
    action: 'user.setSuperAdmin',
    targetType: 'user',
    targetId: targetUserId,
    metadata: { isSuperAdmin },
  });
  return { id: targetUserId };
};

export const setUserStatus = async (
  actorUserId: string,
  targetUserId: string,
  active: boolean,
) => {
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, isSuperAdmin: true, disabledAt: true },
  });
  if (!target) throw new AppError(404, 'User not found');

  // Deactivating an active super-admin must not orphan the platform.
  if (!active && target.isSuperAdmin && !target.disabledAt) {
    const activeCount = await countActiveSuperAdmins();
    if (activeCount <= 1) {
      throw new AppError(409, 'Cannot deactivate the last active super-admin');
    }
  }

  await prisma.user.update({
    where: { id: targetUserId },
    data: { disabledAt: active ? null : new Date() },
  });
  await writePlatformAudit(prisma, {
    actorUserId,
    action: active ? 'user.activate' : 'user.deactivate',
    targetType: 'user',
    targetId: targetUserId,
  });
  return { id: targetUserId };
};

export const resetUserPassword = async (
  actorUserId: string,
  targetUserId: string,
): Promise<{ id: string; tempPassword: string }> => {
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, email: true, name: true },
  });
  if (!target) throw new AppError(404, 'User not found');

  const tempPassword = crypto.randomBytes(12).toString('base64url');
  await prisma.user.update({
    where: { id: targetUserId },
    data: {
      passwordHash: await hashPassword(tempPassword),
      temporaryPassword: true,
      mustChangePassword: true,
    } as any,
  });

  await writePlatformAudit(prisma, {
    actorUserId,
    action: 'user.resetPassword',
    targetType: 'user',
    targetId: targetUserId,
  });

  await sendTemporaryPasswordEmail(
    target.email,
    target.name || 'there',
    'BrainScale CRM',
    tempPassword,
  ).catch(() => {});

  return { id: targetUserId, tempPassword };
};

// ---- Audit log + soft-delete restore ----

export const listAudit = async (q: ListAuditQueryInput) => {
  const where: any = {};
  if (q.action) where.action = q.action;
  if (q.targetType) where.targetType = q.targetType;

  const [rows, total] = await Promise.all([
    prisma.platformAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.size,
      take: q.size,
      include: { actor: { select: { id: true, email: true, name: true } } },
    }),
    prisma.platformAuditLog.count({ where }),
  ]);

  return {
    items: rows.map((r: any) => ({
      id: r.id,
      action: r.action,
      targetType: r.targetType,
      targetId: r.targetId,
      metadata: r.metadata,
      createdAt: r.createdAt,
      actor: r.actor ? { id: r.actor.id, email: r.actor.email, name: r.actor.name } : null,
    })),
    page: q.page,
    size: q.size,
    total,
  };
};

export const listDeletedWorkspaces = async () => {
  const rows = await prisma.workspace.findMany({
    where: { deletedAt: { isSet: true, not: null } },
    orderBy: { deletedAt: 'desc' },
    select: {
      id: true,
      name: true,
      plan: true,
      deletedAt: true,
      _count: { select: { members: true, students: true } },
    },
  });
  return rows.map((w: any) => ({
    id: w.id,
    name: w.name,
    plan: w.plan,
    deletedAt: w.deletedAt,
    memberCount: w._count.members,
    studentCount: w._count.students,
  }));
};

export const restoreWorkspace = async (actorUserId: string, id: string) => {
  const ws = await prisma.workspace.findUnique({ where: { id }, select: { id: true, deletedAt: true } });
  if (!ws) throw new AppError(404, 'Workspace not found');
  if (!ws.deletedAt) throw new AppError(409, 'Workspace is not deleted');
  await prisma.workspace.update({ where: { id }, data: { deletedAt: null } });
  await writePlatformAudit(prisma, {
    actorUserId,
    action: 'workspace.restore',
    targetType: 'workspace',
    targetId: id,
  });
  return { id };
};

// ---- User details + feedback admin ----

export const getUser = async (id: string) => {
  const u = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, email: true, name: true, isSuperAdmin: true,
      disabledAt: true, mustChangePassword: true, createdAt: true,
      memberships: {
        select: { role: true, workspace: { select: { id: true, name: true, plan: true } } },
      },
      feedback: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, type: true, status: true, message: true, reply: true, repliedAt: true, createdAt: true },
      },
    },
  });
  if (!u) throw new AppError(404, 'User not found');

  const workspaces = (u as any).memberships.map((m: any) => ({
    id: m.workspace.id, name: m.workspace.name, role: m.role, plan: m.workspace.plan,
  }));
  const feedback = (u as any).feedback;

  return {
    id: u.id,
    email: u.email,
    name: u.name,
    isSuperAdmin: u.isSuperAdmin,
    disabledAt: u.disabledAt ?? null,
    createdAt: u.createdAt,
    workspaces,
    feedback,
    health: {
      isDeactivated: !!u.disabledAt,
      isPendingSetup: !!(u as any).mustChangePassword,
      noWorkspace: workspaces.length === 0,
      hasOpenFeedback: feedback.some((f: any) => f.status === 'OPEN'),
    },
  };
};

export const updateUser = async (actorUserId: string, id: string, body: UpdateUserBodyInput) => {
  const before = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!before) throw new AppError(404, 'User not found');
  await prisma.user.update({ where: { id }, data: { name: body.name } });
  await writePlatformAudit(prisma, {
    actorUserId,
    action: 'user.update',
    targetType: 'user',
    targetId: id,
    metadata: { before: { name: before.name }, after: { name: body.name } },
  });
  return { id };
};

export const listFeedback = async (q: ListFeedbackQueryInput) => {
  const where: any = {};
  if (q.status) where.status = q.status;

  const [rows, total] = await Promise.all([
    prisma.feedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.size,
      take: q.size,
      select: {
        id: true, type: true, status: true, message: true, reply: true, repliedAt: true, createdAt: true,
        user: { select: { id: true, email: true, name: true } },
      },
    }),
    prisma.feedback.count({ where }),
  ]);

  return { items: rows, page: q.page, size: q.size, total };
};

export const replyFeedback = async (actorUserId: string, id: string, reply: string) => {
  const fb = await prisma.feedback.findUnique({
    where: { id },
    select: { id: true, userId: true, workspaceId: true, status: true },
  });
  if (!fb) throw new AppError(404, 'Feedback not found');

  await prisma.feedback.update({
    where: { id },
    data: { reply, status: 'RESOLVED', repliedByUserId: actorUserId, repliedAt: new Date() },
  });

  // Notifications are workspace-scoped. Prefer the workspace the feedback was
  // submitted from; otherwise fall back to any workspace the user belongs to so
  // the reply still surfaces in their notification list. If the user has no
  // workspace at all, there is nowhere to deliver it — they read it in Settings.
  let notifyWorkspaceId = fb.workspaceId;
  if (!notifyWorkspaceId) {
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: fb.userId },
      select: { workspaceId: true },
      orderBy: { createdAt: 'asc' },
    });
    notifyWorkspaceId = membership?.workspaceId ?? null;
  }

  if (notifyWorkspaceId) {
    await createNotification({
      workspaceId: notifyWorkspaceId,
      userId: fb.userId,
      type: 'FEEDBACK_REPLY',
      title: 'Super Admin replied to your feedback',
      body: reply.slice(0, 120),
      meta: { entityId: fb.id, entityType: 'feedback' },
    });
  }

  await writePlatformAudit(prisma, {
    actorUserId,
    action: 'feedback.reply',
    targetType: 'feedback',
    targetId: id,
  });
  return { id };
};

export const setFeedbackStatus = async (
  actorUserId: string,
  id: string,
  status: 'OPEN' | 'RESOLVED',
) => {
  const fb = await prisma.feedback.findUnique({ where: { id }, select: { id: true } });
  if (!fb) throw new AppError(404, 'Feedback not found');
  await prisma.feedback.update({ where: { id }, data: { status } });
  await writePlatformAudit(prisma, {
    actorUserId,
    action: 'feedback.status',
    targetType: 'feedback',
    targetId: id,
    metadata: { status },
  });
  return { id };
};

export const createAnnouncement = async (
  actorUserId: string,
  data: CreateAnnouncementBodyInput,
) => {
  // Rich body: sanitize structurally, derive the canonical plain text from it.
  let bodyRich: ReturnType<typeof sanitizeAnnouncementRich> = null;
  let bodyPlain = data.body;
  if (data.bodyRich !== undefined) {
    bodyRich = sanitizeAnnouncementRich(data.bodyRich);
    if (!bodyRich) throw new AppError(400, 'Invalid rich text content');
    bodyPlain = tiptapToPlainText(bodyRich);
    if (!bodyPlain.trim()) throw new AppError(400, 'Announcement body is empty');
    if (bodyPlain.length > 2000) throw new AppError(400, 'Announcement body exceeds 2000 characters');
  }

  // Resolve target workspaces, always excluding soft-deleted ones.
  let workspaceIds: string[];
  if (data.targetType === 'SELECTED') {
    const found = await prisma.workspace.findMany({
      where: { id: { in: data.workspaceIds! }, ...NOT_DELETED },
      select: { id: true },
    });
    if (found.length === 0) throw new AppError(400, 'No valid workspaces selected');
    workspaceIds = found.map((w) => w.id);
  } else {
    const all = await prisma.workspace.findMany({ where: NOT_DELETED, select: { id: true } });
    workspaceIds = all.map((w) => w.id);
  }

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: { in: workspaceIds } },
    select: { workspaceId: true, userId: true },
  });

  const announcement = await prisma.announcement.create({
    data: {
      title: data.title,
      body: bodyPlain,
      bodyRich: bodyRich as any,
      targetType: data.targetType,
      workspaceIds: data.targetType === 'SELECTED' ? workspaceIds : [],
      sentById: actorUserId,
    },
  });

  let recipientCount = 0;
  if (members.length > 0) {
    const created = await prisma.notification.createMany({
      data: members.map((m) => ({
        workspaceId: m.workspaceId,
        userId: m.userId,
        type: 'PLATFORM_ANNOUNCEMENT',
        title: data.title,
        body: bodyPlain,
        meta: { announcementId: announcement.id, ...(bodyRich ? { bodyRich } : {}) } as any,
      })),
    });
    recipientCount = created.count;
  }

  const updated = await prisma.announcement.update({
    where: { id: announcement.id },
    data: { recipientCount },
  });

  await writePlatformAudit(prisma, {
    actorUserId,
    action: 'announcement.send',
    targetType: 'announcement',
    targetId: announcement.id,
    metadata: { targetType: data.targetType, workspaceCount: workspaceIds.length, recipientCount },
  });

  return updated;
};

export const getAnnouncement = async (id: string) => {
  const announcement = await prisma.announcement.findUnique({
    where: { id },
    select: {
      id: true, title: true, body: true, bodyRich: true, targetType: true, workspaceIds: true,
      recipientCount: true, createdAt: true,
      sentBy: { select: { id: true, email: true, name: true } },
    },
  });
  if (!announcement) throw new AppError(404, 'Announcement not found');

  // Read/unread counts per workspace. Notification.meta is Json, so the
  // Mongo connector needs a raw pipeline to match on meta.announcementId.
  const rows = (await prisma.notification.aggregateRaw({
    pipeline: [
      { $match: { 'meta.announcementId': id } },
      { $group: { _id: { workspaceId: '$workspaceId', isRead: '$isRead' }, count: { $sum: 1 } } },
    ],
  })) as unknown as Array<{ _id: { workspaceId: string; isRead: boolean }; count: number }>;

  let readCount = 0;
  let deliveredCount = 0;
  const byWorkspace = new Map<string, { delivered: number; read: number }>();
  for (const row of rows) {
    const ws = byWorkspace.get(row._id.workspaceId) ?? { delivered: 0, read: 0 };
    ws.delivered += row.count;
    if (row._id.isRead) ws.read += row.count;
    byWorkspace.set(row._id.workspaceId, ws);
    deliveredCount += row.count;
    if (row._id.isRead) readCount += row.count;
  }

  const workspaceIds = [...byWorkspace.keys()];
  const workspaces = workspaceIds.length
    ? await prisma.workspace.findMany({
        where: { id: { in: workspaceIds } },
        select: { id: true, name: true },
      })
    : [];
  const nameById = new Map(workspaces.map((w) => [w.id, w.name]));

  return {
    ...announcement,
    stats: {
      deliveredCount,
      readCount,
      unreadCount: deliveredCount - readCount,
      workspaces: workspaceIds.map((wid) => ({
        id: wid,
        name: nameById.get(wid) ?? 'Deleted workspace',
        delivered: byWorkspace.get(wid)!.delivered,
        read: byWorkspace.get(wid)!.read,
      })),
    },
  };
};

export const deleteAnnouncement = async (actorUserId: string, id: string) => {
  const announcement = await prisma.announcement.findUnique({ where: { id }, select: { id: true } });
  if (!announcement) throw new AppError(404, 'Announcement not found');

  // Remove the fan-out notifications first. meta is Json, so the Mongo
  // connector cannot express meta.announcementId in a normal where — use a
  // raw delete command scoped to exactly this announcement's notifications.
  await prisma.$runCommandRaw({
    delete: 'Notification',
    deletes: [{ q: { 'meta.announcementId': id }, limit: 0 }],
  });

  await prisma.announcement.delete({ where: { id } });

  await writePlatformAudit(prisma, {
    actorUserId,
    action: 'announcement.delete',
    targetType: 'announcement',
    targetId: id,
  });

  return { id };
};

export const listAnnouncements = async (q: ListAnnouncementsQueryInput) => {
  const [rows, total] = await Promise.all([
    prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.size,
      take: q.size,
      select: {
        id: true, title: true, body: true, bodyRich: true, targetType: true, workspaceIds: true,
        recipientCount: true, createdAt: true,
        sentBy: { select: { id: true, email: true, name: true } },
      },
    }),
    prisma.announcement.count(),
  ]);

  // Read counts for this page in one aggregation (meta is Json — raw pipeline).
  const ids = rows.map((r) => r.id);
  const readRows = ids.length
    ? ((await prisma.notification.aggregateRaw({
        pipeline: [
          { $match: { 'meta.announcementId': { $in: ids }, isRead: true } },
          { $group: { _id: '$meta.announcementId', count: { $sum: 1 } } },
        ],
      })) as unknown as Array<{ _id: string; count: number }>)
    : [];
  const readById = new Map(readRows.map((r) => [r._id, r.count]));

  return {
    items: rows.map((r) => ({ ...r, readCount: readById.get(r.id) ?? 0 })),
    page: q.page,
    size: q.size,
    total,
  };
};
