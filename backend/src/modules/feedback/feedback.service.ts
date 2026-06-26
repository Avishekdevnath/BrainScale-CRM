import { prisma } from '../../db/client';
import { SubmitFeedbackBodyInput } from './feedback.schemas';

/**
 * Create a feedback record. `candidateWorkspaceId` comes from the X-Workspace-Id
 * header; it is stored only if the user is actually a member (used solely to
 * route the future reply notification). Otherwise stored null.
 */
export const submitFeedback = async (
  userId: string,
  candidateWorkspaceId: string | null,
  input: SubmitFeedbackBodyInput,
): Promise<{ id: string }> => {
  let workspaceId: string | null = null;
  if (candidateWorkspaceId) {
    const member = await prisma.workspaceMember.findFirst({
      where: { userId, workspaceId: candidateWorkspaceId },
      select: { id: true },
    });
    if (member) workspaceId = candidateWorkspaceId;
  }

  const created = await prisma.feedback.create({
    data: { userId, workspaceId, message: input.message, type: input.type ?? 'OTHER' },
  });
  return { id: created.id };
};

export const getMyFeedback = async (userId: string) => {
  return prisma.feedback.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, type: true, status: true, message: true, reply: true, repliedAt: true, createdAt: true },
  });
};
