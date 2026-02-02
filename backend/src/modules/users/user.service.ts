import { prisma } from '../../db/client';
import { AppError } from '../../middleware/error-handler';
import { deleteWorkspace } from '../workspaces/workspace.service';
import * as XLSX from 'xlsx';

function safeSheetName(name: string): string {
  // Excel sheet names: max 31 chars; avoid []:*?/\
  const cleaned = name.replace(/[\[\]\:\*\?\/\\]/g, ' ').trim();
  return (cleaned || 'Sheet').slice(0, 31);
}

function toISO(d: unknown): string {
  if (d instanceof Date) return d.toISOString();
  if (typeof d === 'string') return d;
  return '';
}

export const exportMyAccountXlsx = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  if (!user) throw new AppError(404, 'User not found');

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    select: {
      id: true,
      role: true,
      customRoleId: true,
      setupCompleted: true,
      agreementAccepted: true,
      agreementAcceptedAt: true,
      createdAt: true,
      workspaceId: true,
      workspace: {
        select: {
          id: true,
          name: true,
          plan: true,
          timezone: true,
          createdAt: true,
        },
      },
    },
  });

  const workspaceIds = memberships.map((m) => m.workspaceId);

  // Gather workspace-scoped data (across all workspaces the user belongs to)
  const [
    groups,
    students,
    callLists,
    callListItems,
    callLogs,
    followups,
    invitations,
    payments,
    batches,
    courses,
    modules,
  ] = await Promise.all([
    prisma.group.findMany({ where: { workspaceId: { in: workspaceIds } } }),
    prisma.student.findMany({ where: { workspaceId: { in: workspaceIds } } }),
    prisma.callList.findMany({ where: { workspaceId: { in: workspaceIds } } }),
    prisma.callListItem.findMany({ where: { workspaceId: { in: workspaceIds } } }),
    prisma.callLog.findMany({ where: { workspaceId: { in: workspaceIds } } }),
    prisma.followup.findMany({ where: { workspaceId: { in: workspaceIds } } }),
    prisma.invitation.findMany({ where: { workspaceId: { in: workspaceIds } } }),
    prisma.payment.findMany({ where: { workspaceId: { in: workspaceIds } } }),
    prisma.batch.findMany({ where: { workspaceId: { in: workspaceIds } } }),
    prisma.course.findMany({ where: { workspaceId: { in: workspaceIds } } }),
    prisma.module.findMany({
      where: {
        course: { workspaceId: { in: workspaceIds } },
      },
    }),
  ]);

  const wb = XLSX.utils.book_new();

  // Account sheet
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet([
      {
        UserId: user.id,
        Email: user.email,
        Name: user.name ?? '',
        CreatedAt: toISO(user.createdAt),
        ExportedAt: new Date().toISOString(),
      },
    ]),
    safeSheetName('Account')
  );

  // Workspaces sheet
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      memberships.map((m) => ({
        WorkspaceId: m.workspace.id,
        WorkspaceName: m.workspace.name,
        Plan: m.workspace.plan,
        Timezone: m.workspace.timezone,
        WorkspaceCreatedAt: toISO(m.workspace.createdAt),
        MemberId: m.id,
        Role: m.role,
        CustomRoleId: m.customRoleId ?? '',
        SetupCompleted: m.setupCompleted,
        AgreementAccepted: m.agreementAccepted,
        AgreementAcceptedAt: toISO(m.agreementAcceptedAt),
        MembershipCreatedAt: toISO(m.createdAt),
      }))
    ),
    safeSheetName('Workspaces')
  );

  const addSheet = (name: string, rows: Array<Record<string, unknown>>) => {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), safeSheetName(name));
  };

  addSheet(
    'Groups',
    groups.map((g: any) => ({
      WorkspaceId: g.workspaceId,
      GroupId: g.id,
      Name: g.name,
      BatchId: g.batchId ?? '',
      IsActive: g.isActive ?? true,
      CreatedAt: toISO(g.createdAt),
    }))
  );

  addSheet(
    'Students',
    students.map((s: any) => ({
      WorkspaceId: s.workspaceId,
      StudentId: s.id,
      Name: s.name,
      Email: s.email ?? '',
      Tags: Array.isArray(s.tags) ? s.tags.join(', ') : '',
      CreatedAt: toISO(s.createdAt),
    }))
  );

  addSheet(
    'CallLists',
    callLists.map((cl: any) => ({
      WorkspaceId: cl.workspaceId,
      CallListId: cl.id,
      Name: cl.name,
      GroupId: cl.groupId ?? '',
      Source: cl.source,
      Status: cl.status,
      CreatedAt: toISO(cl.createdAt),
      CompletedAt: toISO(cl.completedAt),
    }))
  );

  addSheet(
    'CallListItems',
    callListItems.map((it: any) => ({
      WorkspaceId: it.workspaceId,
      ItemId: it.id,
      CallListId: it.callListId,
      StudentId: it.studentId,
      AssignedToMemberId: it.assignedTo ?? '',
      State: it.state,
      Priority: it.priority,
      CreatedAt: toISO(it.createdAt),
    }))
  );

  addSheet(
    'CallLogs',
    callLogs.map((l: any) => ({
      WorkspaceId: l.workspaceId,
      CallLogId: l.id,
      CallListId: l.callListId,
      CallListItemId: l.callListItemId,
      StudentId: l.studentId,
      AssignedToMemberId: l.assignedTo,
      CallDate: toISO(l.callDate),
      Status: l.status,
      FollowUpRequired: !!l.followUpRequired,
      FollowUpDate: toISO(l.followUpDate),
      Notes: l.notes ?? '',
    }))
  );

  addSheet(
    'Followups',
    followups.map((f: any) => ({
      WorkspaceId: f.workspaceId,
      FollowupId: f.id,
      StudentId: f.studentId,
      GroupId: f.groupId,
      AssignedToMemberId: f.assignedTo ?? '',
      DueAt: toISO(f.dueAt),
      Status: f.status,
      Notes: f.notes ?? '',
      CreatedAt: toISO(f.createdAt),
    }))
  );

  addSheet(
    'Invitations',
    invitations.map((inv: any) => ({
      WorkspaceId: inv.workspaceId,
      InvitationId: inv.id,
      Email: inv.email,
      Status: inv.status,
      Role: inv.role,
      InvitedByUserId: inv.invitedBy,
      ExpiresAt: toISO(inv.expiresAt),
      AcceptedAt: toISO(inv.acceptedAt),
      CreatedAt: toISO(inv.createdAt),
    }))
  );

  addSheet(
    'Payments',
    payments.map((p: any) => ({
      WorkspaceId: p.workspaceId,
      PaymentId: p.id,
      StudentId: p.studentId,
      GroupId: p.groupId,
      BatchId: p.batchId ?? '',
      Amount: p.amount,
      Currency: p.currency,
      PaymentDate: toISO(p.paymentDate),
      Method: p.paymentMethod ?? '',
      Status: p.status,
      Reference: p.reference ?? '',
      CreatedByUserId: p.createdBy ?? '',
    }))
  );

  addSheet(
    'Batches',
    batches.map((b: any) => ({
      WorkspaceId: b.workspaceId,
      BatchId: b.id,
      Name: b.name,
      IsActive: b.isActive ?? true,
      CreatedAt: toISO(b.createdAt),
    }))
  );

  addSheet(
    'Courses',
    courses.map((c: any) => ({
      WorkspaceId: c.workspaceId,
      CourseId: c.id,
      Name: c.name,
      Description: c.description ?? '',
      CreatedAt: toISO(c.createdAt),
    }))
  );

  addSheet(
    'Modules',
    modules.map((m: any) => ({
      CourseId: m.courseId,
      ModuleId: m.id,
      Name: m.name,
      Order: m.order ?? '',
      CreatedAt: toISO(m.createdAt),
    }))
  );

  const date = new Date().toISOString().slice(0, 10);
  const filename = `brainscale-account-export-${date}.xlsx`;

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
  return { buffer, filename };
};

export const deleteMyAccount = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) throw new AppError(404, 'User not found');

  // Find memberships (need member IDs for call logs and assignments)
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    select: { id: true, workspaceId: true, role: true },
  });

  const memberIds = memberships.map((m) => m.id);
  const workspaceIds = Array.from(new Set(memberships.map((m) => m.workspaceId)));

  // Delete user-owned AI chats & messages first (workspace can remain)
  await Promise.all([
    prisma.chatMessage.deleteMany({ where: { userId } }),
    prisma.chat.deleteMany({ where: { userId } }),
  ]);

  // Delete user-created records (keeps shared workspace consistent with required creator relations)
  await Promise.all([
    prisma.call.deleteMany({ where: { createdBy: userId } }),
    prisma.followup.deleteMany({ where: { createdBy: userId } }),
    prisma.auditLog.deleteMany({ where: { userId } }),
    prisma.emailVerification.deleteMany({ where: { userId } }),
  ]);

  // Remove each membership and clean references
  for (const membership of memberships) {
    // Clean assignment references
    await Promise.all([
      prisma.callListItem.updateMany({
        where: { workspaceId: membership.workspaceId, assignedTo: membership.id },
        data: { assignedTo: null },
      }),
      prisma.followup.updateMany({
        where: { workspaceId: membership.workspaceId, assignedTo: membership.id },
        data: { assignedTo: null },
      }),
      prisma.callLog.deleteMany({
        where: { workspaceId: membership.workspaceId, assignedTo: membership.id },
      }),
      prisma.groupAccess.deleteMany({ where: { memberId: membership.id } }),
    ]);

    await prisma.workspaceMember.delete({ where: { id: membership.id } });

    const remaining = await prisma.workspaceMember.findMany({
      where: { workspaceId: membership.workspaceId },
      select: { id: true, role: true },
    });

    if (remaining.length === 0) {
      // Last member left -> delete workspace and its data.
      await deleteWorkspace(membership.workspaceId);
      continue;
    }

    if (remaining.length === 1 && remaining[0].role !== 'ADMIN') {
      await prisma.workspaceMember.update({
        where: { id: remaining[0].id },
        data: { role: 'ADMIN' },
      });
    }
  }

  // Finally delete the user record
  await prisma.user.delete({ where: { id: userId } });

  return { message: 'Account deleted successfully' };
};

