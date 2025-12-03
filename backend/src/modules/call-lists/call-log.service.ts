import { prisma } from '../../db/client';
import { AppError } from '../../middleware/error-handler';
import {
  CreateCallLogInput,
  UpdateCallLogInput,
  ListCallLogsInput,
} from './call-log.schemas';
import { CreateFollowupCallLogInput } from '../followups/followup.schemas';
import * as followupService from '../followups/followup.service';

/**
 * Create a call log
 */
export const createCallLog = async (
  workspaceId: string,
  userId: string,
  data: CreateCallLogInput
) => {
  // Get current user's member ID
  const member = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
  });

  if (!member) {
    throw new AppError(403, 'Access denied');
  }

  // Verify call list item exists and is assigned to user
  const callListItem = await prisma.callListItem.findFirst({
    where: {
      id: data.callListItemId,
      assignedTo: member.id,
    },
    include: {
      callList: {
        include: {
          group: true,
        },
      },
      student: true,
    },
  });

  if (!callListItem) {
    throw new AppError(404, 'Call list item not found or not assigned to you');
  }

  // Verify call list belongs to workspace
  if (callListItem.callList.workspaceId !== workspaceId) {
    throw new AppError(403, 'Access denied');
  }

  // Get call list questions to validate answers
  const questions = (callListItem.callList.meta as any)?.questions || [];
  const requiredQuestions = questions.filter((q: any) => q.required);

  // Validate all required questions are answered (only if answers are provided)
  if (requiredQuestions.length > 0 && data.answers && data.answers.length > 0) {
    const answeredQuestionIds = new Set(data.answers.map((a) => a.questionId));
    const missingQuestions = requiredQuestions.filter(
      (q: any) => !answeredQuestionIds.has(q.id)
    );

    if (missingQuestions.length > 0) {
      throw new AppError(
        400,
        `Missing answers for required questions: ${missingQuestions.map((q: any) => q.question).join(', ')}`
      );
    }
  }

  // Validate answer types match question types (only if answers are provided)
  if (data.answers && data.answers.length > 0) {
    for (const answer of data.answers) {
      const question = questions.find((q: any) => q.id === answer.questionId);
      if (question) {
        // Validate answer type matches question type
        if (question.type === 'yes_no' && typeof answer.answer !== 'boolean') {
          throw new AppError(400, `Answer for question "${question.question}" must be boolean`);
        }
        if (question.type === 'number' && typeof answer.answer !== 'number') {
          throw new AppError(400, `Answer for question "${question.question}" must be number`);
        }
        if (question.type === 'multiple_choice') {
          if (!question.options || !question.options.includes(String(answer.answer))) {
            throw new AppError(
              400,
              `Answer for question "${question.question}" must be one of: ${question.options.join(', ')}`
            );
          }
        }
      }
    }
  }

  // Parse follow-up date if provided
  let followUpDate: Date | null = null;
  if (data.followUpDate) {
    followUpDate = new Date(data.followUpDate);
    if (isNaN(followUpDate.getTime())) {
      throw new AppError(400, 'Invalid follow-up date');
    }
  }

  // Create call log
  const callLog = await prisma.callLog.create({
    data: {
      callListItemId: data.callListItemId,
      callListId: callListItem.callListId,
      studentId: callListItem.studentId,
      assignedTo: member.id,
      callDate: new Date(),
      callDuration: data.callDuration,
      status: data.status,
      answers: (data.answers || []) as any,
      notes: data.notes,
      callerNote: data.callerNote,
      followUpDate,
      followUpRequired: data.followUpRequired || false,
    },
    include: {
      callListItem: true,
      callList: {
        include: {
          group: {
            include: {
              batch: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          phones: {
            select: {
              phone: true,
              isPrimary: true,
            },
          },
        },
      },
      assignee: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  // Update call list item: set state to DONE, set callLogId
  await prisma.callListItem.update({
    where: { id: data.callListItemId },
    data: {
      state: 'DONE',
      callLogId: callLog.id,
    },
  });

  // If follow-up required, create Followup record
  if (data.followUpRequired && followUpDate) {
    try {
      await followupService.createFollowup(workspaceId, userId, {
        studentId: callListItem.studentId,
        groupId: callListItem.callList.groupId || callListItem.callList.group?.id || '',
        callListId: callListItem.callListId,
        previousCallLogId: callLog.id,
        dueAt: followUpDate.toISOString(),
        notes: `Follow-up from call log: ${data.notes || 'No additional notes'}`,
        assignedTo: member.id,
      });
    } catch (error) {
      // Log error but don't fail call log creation
      console.error('Error creating follow-up:', error);
    }
  }

  return callLog;
};

/**
 * Update a call log
 */
export const updateCallLog = async (
  logId: string,
  workspaceId: string,
  userId: string,
  data: UpdateCallLogInput
) => {
  // Get current user's member ID
  const member = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
  });

  if (!member) {
    throw new AppError(403, 'Access denied');
  }

  // Get call log
  const callLog = await prisma.callLog.findFirst({
    where: {
      id: logId,
      callList: {
        workspaceId,
      },
    },
  });

  if (!callLog) {
    throw new AppError(404, 'Call log not found');
  }

  // Verify user owns the call log or is admin
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
  });

  if (!membership) {
    throw new AppError(403, 'Access denied');
  }

  const isAdmin = membership.role === 'ADMIN';
  const isOwner = callLog.assignedTo === member.id;

  if (!isAdmin && !isOwner) {
    throw new AppError(403, 'You can only update your own call logs');
  }

  // Parse follow-up date if provided
  let followUpDate: Date | undefined = undefined;
  if (data.followUpDate !== undefined) {
    if (data.followUpDate) {
      followUpDate = new Date(data.followUpDate);
      if (isNaN(followUpDate.getTime())) {
        throw new AppError(400, 'Invalid follow-up date');
      }
    } else {
      followUpDate = null as any;
    }
  }

  // Update call log
  const updated = await prisma.callLog.update({
    where: { id: logId },
    data: {
      callDuration: data.callDuration,
      status: data.status,
      answers: data.answers !== undefined ? (data.answers as any) : undefined,
      notes: data.notes !== undefined ? data.notes : undefined,
      callerNote: data.callerNote !== undefined ? data.callerNote : undefined,
      followUpDate: followUpDate !== undefined ? followUpDate : undefined,
      followUpRequired: data.followUpRequired,
    },
    include: {
      callListItem: true,
      callList: {
        include: {
          group: {
            include: {
              batch: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          phones: {
            select: {
              phone: true,
              isPrimary: true,
            },
          },
        },
      },
      assignee: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  return updated;
};

/**
 * Get call log details
 */
export const getCallLog = async (logId: string, workspaceId: string) => {
  const callLog = await prisma.callLog.findFirst({
    where: {
      id: logId,
      callList: {
        workspaceId,
      },
    },
    include: {
      callListItem: true,
      callList: {
        include: {
          group: {
            include: {
              batch: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          phones: {
            select: {
              phone: true,
              isPrimary: true,
            },
          },
        },
      },
      assignee: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!callLog) {
    throw new AppError(404, 'Call log not found');
  }

  // Extract questions from call list meta
  const questions = (callLog.callList.meta as any)?.questions || [];

  return {
    ...callLog,
    callList: {
      ...callLog.callList,
      questions,
    },
  };
};

/**
 * List call logs with filters
 */
export const listCallLogs = async (
  workspaceId: string,
  options: ListCallLogsInput
) => {
  // Build where clause
  const where: any = {
    callList: {
      workspaceId,
    },
  };

  if (options.studentId) {
    where.studentId = options.studentId;
  }

  if (options.callListId) {
    where.callListId = options.callListId;
  }

  if (options.assignedTo) {
    where.assignedTo = options.assignedTo;
  }

  if (options.status) {
    where.status = options.status;
  }

  if (options.dateFrom || options.dateTo) {
    where.callDate = {};
    if (options.dateFrom) {
      where.callDate.gte = new Date(options.dateFrom);
    }
    if (options.dateTo) {
      where.callDate.lte = new Date(options.dateTo);
    }
  }

  // Filter by batchId via callList.group.batchId
  if (options.batchId) {
    where.callList = {
      ...where.callList,
      group: {
        batchId: options.batchId,
      },
    };
  }

  // Filter by groupId via callList.groupId
  if (options.groupId) {
    if (where.callList.group) {
      where.callList.group.groupId = options.groupId;
    } else {
      where.callList = {
        ...where.callList,
        groupId: options.groupId,
      };
    }
  }

  // Pagination
  const page = options.page || 1;
  const size = Math.min(options.size || 20, 100);
  const skip = (page - 1) * size;

  // Get call logs
  const [logs, total] = await Promise.all([
    prisma.callLog.findMany({
      where,
      include: {
        callList: {
          include: {
            group: {
              include: {
                batch: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignee: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { callDate: 'desc' },
      skip,
      take: size,
    }),
    prisma.callLog.count({ where }),
  ]);

  return {
    logs,
    pagination: {
      page,
      size,
      total,
      totalPages: Math.ceil(total / size),
    },
  };
};

/**
 * Get student call logs
 */
export const getStudentCallLogs = async (
  studentId: string,
  workspaceId: string,
  options: ListCallLogsInput
) => {
  // Verify student belongs to workspace
  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      workspaceId,
      isDeleted: false,
    },
  });

  if (!student) {
    throw new AppError(404, 'Student not found');
  }

  // Use listCallLogs with studentId filter
  return listCallLogs(workspaceId, {
    ...options,
    studentId,
  });
};

/**
 * Get call list call logs
 */
export const getCallListCallLogs = async (
  callListId: string,
  workspaceId: string,
  options: ListCallLogsInput
) => {
  // Verify call list belongs to workspace
  const callList = await prisma.callList.findFirst({
    where: {
      id: callListId,
      workspaceId,
    },
  });

  if (!callList) {
    throw new AppError(404, 'Call list not found');
  }

  // Use listCallLogs with callListId filter
  return listCallLogs(workspaceId, {
    ...options,
    callListId,
  });
};

/**
 * Create a call log for a follow-up call
 * Uses same questions as original call list, allows adding answers to same questions
 */
export const createFollowupCallLog = async (
  workspaceId: string,
  userId: string,
  data: CreateFollowupCallLogInput
) => {
  // Get current user's member ID
  const member = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
  });

  if (!member) {
    throw new AppError(403, 'Access denied');
  }

  // Get follow-up with context (must be PENDING status)
  const followup = await prisma.followup.findFirst({
    where: {
      id: data.followupId,
      workspaceId,
      status: 'PENDING',
    },
    include: {
      student: true,
      group: true,
      callList: true,
      previousCallLog: true,
    },
  });

  if (!followup) {
    throw new AppError(404, 'Pending follow-up not found');
  }

  // Verify call list exists
  if (!followup.callList) {
    throw new AppError(400, 'Follow-up is not associated with a call list');
  }

  // Get or find/create CallListItem for the call list and student
  let callListItem = await prisma.callListItem.findFirst({
    where: {
      callListId: followup.callListId!,
      studentId: followup.studentId,
    },
  });

  if (!callListItem) {
    // Create call list item if doesn't exist
    callListItem = await prisma.callListItem.create({
      data: {
        callListId: followup.callListId!,
        studentId: followup.studentId,
        assignedTo: member.id,
        state: 'QUEUED',
      },
    });
  }

  // Get questions from call list meta
  const questions = (followup.callList.meta as any)?.questions || [];
  const requiredQuestions = questions.filter((q: any) => q.required);

  // Validate all required questions are answered
  if (requiredQuestions.length > 0) {
    const answeredQuestionIds = new Set(data.answers.map((a) => a.questionId));
    const missingQuestions = requiredQuestions.filter(
      (q: any) => !answeredQuestionIds.has(q.id)
    );

    if (missingQuestions.length > 0) {
      throw new AppError(
        400,
        `Missing answers for required questions: ${missingQuestions.map((q: any) => q.question).join(', ')}`
      );
    }
  }

  // Validate answer types match question types (same validation as createCallLog)
  for (const answer of data.answers) {
    const question = questions.find((q: any) => q.id === answer.questionId);
    if (question) {
      // Validate answer type matches question type
      if (question.type === 'yes_no' && typeof answer.answer !== 'boolean') {
        throw new AppError(400, `Answer for question "${question.question}" must be boolean`);
      }
      if (question.type === 'number' && typeof answer.answer !== 'number') {
        throw new AppError(400, `Answer for question "${question.question}" must be number`);
      }
      if (question.type === 'multiple_choice') {
        if (!question.options || !question.options.includes(String(answer.answer))) {
          throw new AppError(
            400,
            `Answer for question "${question.question}" must be one of: ${question.options.join(', ')}`
          );
        }
      }
    }
  }

  // Parse follow-up date if provided
  let followUpDate: Date | null = null;
  if (data.followUpDate) {
    followUpDate = new Date(data.followUpDate);
    if (isNaN(followUpDate.getTime())) {
      throw new AppError(400, 'Invalid follow-up date');
    }
  }

  // Create call log
  const callLog = await prisma.callLog.create({
    data: {
      callListItemId: callListItem.id,
      callListId: followup.callListId!,
      studentId: followup.studentId,
      assignedTo: member.id,
      callDate: new Date(),
      callDuration: data.callDuration,
      status: data.status,
      answers: data.answers as any,
      notes: data.notes,
      callerNote: data.callerNote,
      followUpDate,
      followUpRequired: data.followUpRequired || false,
    },
    include: {
      callListItem: true,
      callList: {
        include: {
          group: {
            include: {
              batch: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          phones: {
            select: {
              phone: true,
              isPrimary: true,
            },
          },
        },
      },
      assignee: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  // Update follow-up status to DONE
  await prisma.followup.update({
    where: { id: data.followupId },
    data: { status: 'DONE' },
  });

  // Update call list item
  await prisma.callListItem.update({
    where: { id: callListItem.id },
    data: {
      state: 'DONE',
      callLogId: callLog.id,
    },
  });

  // If follow-up required, create new follow-up
  if (data.followUpRequired && followUpDate) {
    try {
      await followupService.createFollowup(workspaceId, userId, {
        studentId: followup.studentId,
        groupId: followup.groupId,
        callListId: followup.callListId!,
        previousCallLogId: callLog.id,
        dueAt: followUpDate.toISOString(),
        notes: `Follow-up call: ${data.notes || ''}`,
        assignedTo: member.id,
      });
    } catch (error) {
      // Log error but don't fail call log creation
      console.error('Error creating new follow-up:', error);
    }
  }

  return callLog;
};

