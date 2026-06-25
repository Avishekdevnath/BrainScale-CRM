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
} from './platform.schemas';

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
      timezone: true,
      deletedAt: true,
      _count: { select: { members: true, students: true } },
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
  return { ...rest, memberCount: _count.members, studentCount: _count.students };
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
