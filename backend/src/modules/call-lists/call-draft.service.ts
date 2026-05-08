import { prisma } from '../../db/client';
import { AppError } from '../../middleware/error-handler';
import { logger } from '../../config/logger';
import * as callLogService from './call-log.service';
import { CreateCallLogInput } from './call-log.schemas';
import {
  DraftPayload,
  ListCallDraftsInput,
  SubmitAllDraftsInput,
} from './call-draft.schemas';

const verifyItemAccess = async (
  callListItemId: string,
  workspaceId: string,
  userId: string
) => {
  const member = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId },
  });
  if (!member) throw new AppError(403, 'Access denied');

  const item = await prisma.callListItem.findFirst({
    where: { id: callListItemId, workspaceId },
    select: { id: true, callListId: true, assignedTo: true },
  });
  if (!item) throw new AppError(404, 'Call list item not found');

  // Allow draft for assignee OR any workspace member with calls:create (loose: anyone in workspace)
  return { member, item };
};

export const upsertDraft = async (
  callListItemId: string,
  workspaceId: string,
  userId: string,
  payload: DraftPayload
) => {
  await verifyItemAccess(callListItemId, workspaceId, userId);

  const draft = await prisma.callDraft.upsert({
    where: { callListItemId_userId: { callListItemId, userId } },
    create: {
      workspaceId,
      callListItemId,
      userId,
      payload: payload as any,
    },
    update: {
      payload: payload as any,
    },
  });

  return draft;
};

export const getDraft = async (
  callListItemId: string,
  workspaceId: string,
  userId: string
) => {
  const draft = await prisma.callDraft.findFirst({
    where: { callListItemId, userId, workspaceId },
  });
  return draft;
};

export const listDrafts = async (
  workspaceId: string,
  userId: string,
  filter: ListCallDraftsInput
) => {
  const drafts = await prisma.callDraft.findMany({
    where: {
      workspaceId,
      userId,
      ...(filter.callListId
        ? { callListItem: { callListId: filter.callListId } }
        : {}),
    },
    include: {
      callListItem: {
        select: {
          id: true,
          callListId: true,
          state: true,
          studentId: true,
          assignedTo: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });
  return drafts;
};

export const deleteDraft = async (
  callListItemId: string,
  workspaceId: string,
  userId: string
) => {
  await prisma.callDraft.deleteMany({
    where: { callListItemId, userId, workspaceId },
  });
  return { success: true };
};

const VALID_STATUSES = ['completed', 'missed', 'busy', 'no_answer', 'voicemail', 'other'];

const buildCreatePayload = (
  callListItemId: string,
  payload: any,
  questions: any[]
): CreateCallLogInput | null => {
  if (!payload) return null;

  const status = VALID_STATUSES.includes(payload.status) ? payload.status : 'completed';

  // Convert answers map → array
  const answersMap = payload.answers || {};
  const answersArray = questions
    .filter((q: any) => {
      const v = answersMap[q.id];
      return v !== undefined && v !== null && v !== '';
    })
    .map((q: any) => {
      let answerValue: string | number | boolean = answersMap[q.id];
      if (q.type === 'number' && typeof answerValue === 'string') {
        answerValue = parseFloat(answerValue);
      } else if (q.type === 'yes_no' && typeof answerValue === 'string') {
        answerValue = answerValue === 'true' || answerValue === 'yes';
      }
      return {
        questionId: q.id,
        question: q.question,
        answer: answerValue,
        answerType: q.type,
      };
    });

  const callDuration =
    typeof payload.callDuration === 'string' && payload.callDuration
      ? parseInt(payload.callDuration, 10)
      : typeof payload.callDuration === 'number'
        ? payload.callDuration
        : undefined;

  return {
    callListItemId,
    status: status as any,
    answers: answersArray as any,
    notes: payload.notes?.trim() || undefined,
    callerNote: payload.callerNote?.trim() || undefined,
    followUpRequired: payload.followUpRequired === true,
    followUpDate:
      payload.followUpRequired && payload.followUpDate ? payload.followUpDate : undefined,
    followUpNote:
      payload.followUpRequired && payload.followUpNote?.trim()
        ? payload.followUpNote.trim()
        : undefined,
    callDuration: Number.isFinite(callDuration) ? (callDuration as number) : undefined,
  };
};

export interface SubmitAllResult {
  total: number;
  succeeded: number;
  failed: number;
  failures: Array<{ callListItemId: string; reason: string }>;
}

export const submitAllDrafts = async (
  workspaceId: string,
  userId: string,
  filter: SubmitAllDraftsInput
): Promise<SubmitAllResult> => {
  const drafts = await prisma.callDraft.findMany({
    where: {
      workspaceId,
      userId,
      ...(filter.itemIds && filter.itemIds.length > 0
        ? { callListItemId: { in: filter.itemIds } }
        : {}),
      ...(filter.callListId
        ? { callListItem: { callListId: filter.callListId } }
        : {}),
    },
    include: {
      callListItem: {
        select: {
          id: true,
          callListId: true,
          state: true,
          assignedTo: true,
          callList: { select: { meta: true } },
        },
      },
    },
  });

  const result: SubmitAllResult = {
    total: drafts.length,
    succeeded: 0,
    failed: 0,
    failures: [],
  };

  // Sequential to avoid overwhelming DB and keep error handling simple
  for (const draft of drafts) {
    const item = draft.callListItem;
    if (!item) {
      result.failed += 1;
      result.failures.push({
        callListItemId: draft.callListItemId,
        reason: 'Item not found',
      });
      continue;
    }

    if (item.state === 'DONE') {
      // Already done; clean up stale draft
      await prisma.callDraft.delete({ where: { id: draft.id } }).catch(() => {});
      result.failed += 1;
      result.failures.push({
        callListItemId: draft.callListItemId,
        reason: 'Item already done',
      });
      continue;
    }

    const meta = (item.callList as any)?.meta;
    const questions = (meta?.questions as any[]) || [];

    const createInput = buildCreatePayload(
      draft.callListItemId,
      draft.payload,
      questions
    );

    if (!createInput) {
      result.failed += 1;
      result.failures.push({
        callListItemId: draft.callListItemId,
        reason: 'Empty draft payload',
      });
      continue;
    }

    try {
      await callLogService.createCallLog(workspaceId, userId, createInput);
      await prisma.callDraft.delete({ where: { id: draft.id } }).catch(() => {});
      result.succeeded += 1;
    } catch (err: any) {
      const reason = err?.message || 'Submit failed';
      logger.warn({ err, draftId: draft.id }, 'submit-all: draft failed');
      result.failed += 1;
      result.failures.push({
        callListItemId: draft.callListItemId,
        reason,
      });
    }
  }

  return result;
};
