import { prisma } from '../../db/client';
import { AppError } from '../../middleware/error-handler';
import { parseTextData } from '../../utils/file-parser';
import {
  CreateCallListInput,
  UpdateCallListInput,
  AddCallListItemsInput,
  AssignCallListItemsInput,
  UnassignCallListItemsInput,
  UpdateCallListItemInput,
  ListCallListItemsInput,
  GetAvailableStudentsInput,
  BulkPasteCallListInput,
} from './call-list.schemas';

/**
 * Create a call list
 */
export const createCallList = async (
  workspaceId: string,
  userId: string,
  data: CreateCallListInput
) => {
  // Verify user has access to workspace
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
    include: {
      groupAccess: true,
    },
  });

  if (!membership) {
    throw new AppError(403, 'Access denied');
  }

  let groupId: string | null = data.groupId || null;
  let validatedStudentIds: string[] = [];
  let batchId: string | null = data.batchId || null;

  // Validate batch if provided
  if (data.batchId) {
    const batch = await prisma.batch.findFirst({
      where: {
        id: data.batchId,
        workspaceId,
        isActive: true,
      },
    });

    if (!batch) {
      throw new AppError(404, 'Batch not found');
    }

    // If groupId also provided, validate group belongs to batch
    if (data.groupId) {
      const group = await prisma.group.findFirst({
        where: {
          id: data.groupId,
          workspaceId,
          batchId: data.batchId,
          isActive: true,
        },
      });

      if (!group) {
        throw new AppError(400, 'Group does not belong to the specified batch');
      }
    }
  }

  // If groupId provided, validate it
  if (data.groupId) {
    const group = await prisma.group.findFirst({
      where: {
        id: data.groupId,
        workspaceId,
        isActive: true,
      },
    });

    if (!group) {
      throw new AppError(404, 'Group not found');
    }

    // Verify user has access to this group
    if (membership.role !== 'ADMIN') {
      const hasAccess = membership.groupAccess.some(
        (access) => access.groupId === data.groupId
      );
      if (!hasAccess) {
    throw new AppError(403, 'Access denied to this group');
  }
    }
  }

  // If studentIds provided, validate and filter them
  if (data.studentIds && data.studentIds.length > 0) {
    // Build student where clause
    const studentWhere: any = {
      id: { in: data.studentIds },
      workspaceId,
      isDeleted: false,
    };

    // If batchId provided, filter students by batch
    if (data.batchId) {
      studentWhere.studentBatches = {
        some: {
          batchId: data.batchId,
        },
      };
    }

    // If groupIds provided, filter students by those groups
    if (data.groupIds && data.groupIds.length > 0) {
      // Verify user has access to all specified groups
      if (membership.role !== 'ADMIN') {
        const accessibleGroupIds = membership.groupAccess.map((a) => a.groupId);
        const hasAccessToAll = data.groupIds.every((gId) =>
          accessibleGroupIds.includes(gId)
        );
        if (!hasAccessToAll) {
          throw new AppError(403, 'Access denied to one or more groups');
        }
      }

      // Filter students by enrollments in specified groups
      studentWhere.enrollments = {
        some: {
          groupId: { in: data.groupIds },
          isActive: true,
        },
      };
    }

    // Fetch and validate students
    const students = await prisma.student.findMany({
      where: studentWhere,
    });

    if (students.length === 0) {
      throw new AppError(400, 'No valid students found matching the criteria');
    }

    validatedStudentIds = students.map((s) => s.id);

    // If some studentIds were not found, warn but continue with valid ones
    if (validatedStudentIds.length !== data.studentIds.length) {
      // Log warning but don't fail - use only valid students
    }
  }

  // Prepare meta object with questions and batchId if provided
  let metaData: any = data.meta || {};
  if (data.questions && data.questions.length > 0) {
    metaData.questions = data.questions;
  }
  if (data.batchId) {
    metaData.batchId = data.batchId;
  }

  // Create call list (with or without groupId)
  const createData: any = {
    workspaceId,
      name: data.name,
      source: data.source,
    description: data.description,
    messages: data.messages || [],
    meta: Object.keys(metaData).length > 0 ? metaData : null,
  };
  
  if (groupId) {
    createData.groupId = groupId;
  }

  const callList = await prisma.callList.create({
    data: createData,
    include: {
      group: {
        select: {
          id: true,
          name: true,
          batch: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      _count: {
        select: {
          items: true,
        },
      },
    },
  });

  // If studentIds provided, automatically add them to the call list
  if (validatedStudentIds.length > 0) {
    await Promise.all(
      validatedStudentIds.map((studentId) =>
        prisma.callListItem.upsert({
          where: {
            callListId_studentId: {
              callListId: callList.id,
              studentId,
            },
          },
          update: {}, // Don't update if exists
          create: {
            callListId: callList.id,
            studentId,
            state: 'QUEUED',
            priority: 0,
          },
        })
      )
    );

    // Fetch updated call list with item count
    const updatedCallList = await prisma.callList.findUnique({
      where: { id: callList.id },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            batch: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            items: true,
          },
        },
      },
    });

    return updatedCallList || callList;
  }

  return callList;
};

/**
 * List call lists for a workspace/group
 */
export const listCallLists = async (workspaceId: string, groupId?: string, batchId?: string) => {
  const where: any = { workspaceId };
  
  // If groupId provided (for group dashboard), include both:
  // - Call lists for that specific group
  // - Workspace-level call lists (groupId = null)
  if (groupId) {
    where.OR = [
      { groupId: groupId },
      { groupId: null }, // Include workspace-level call lists
    ];
  }
  
  // Filter by batchId if provided (via group's batchId)
  if (batchId) {
    // If we already have an OR condition, we need to combine it
    if (where.OR) {
      where.AND = [
        { OR: where.OR },
        { group: { batchId } },
      ];
      delete where.OR;
    } else {
      where.group = { batchId };
    }
  }

  const callLists = await prisma.callList.findMany({
    where,
    include: {
      group: {
        select: {
          id: true,
          name: true,
          batch: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      _count: {
        select: {
          items: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return callLists;
};

/**
 * Get call list details
 */
export const getCallList = async (listId: string, workspaceId: string) => {
  const callList = await prisma.callList.findFirst({
    where: {
      id: listId,
      workspaceId,
    },
    include: {
      group: {
        select: {
          id: true,
          name: true,
          batch: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      _count: {
        select: {
          items: true,
        },
      },
    },
  });

  if (!callList) {
    throw new AppError(404, 'Call list not found');
  }

  // Extract questions from meta if they exist
  const questions = (callList.meta as any)?.questions || [];

  return {
    ...callList,
    questions,
  };
};

/**
 * Update a call list
 */
export const updateCallList = async (
  listId: string,
  workspaceId: string,
  data: UpdateCallListInput
) => {
  const callList = await prisma.callList.findFirst({
    where: {
      id: listId,
      workspaceId,
    },
  });

  if (!callList) {
    throw new AppError(404, 'Call list not found');
  }

  // Prepare meta object - merge existing meta with new questions if provided
  let metaData: any = undefined;
  if (data.meta !== undefined || data.questions !== undefined) {
    // Get existing call list to merge meta
    const existing = await prisma.callList.findUnique({
      where: { id: listId },
      select: { meta: true },
    });
    
    metaData = existing?.meta ? { ...(existing.meta as any) } : {};
    
    if (data.meta !== undefined) {
      metaData = { ...metaData, ...data.meta };
    }
    
    if (data.questions !== undefined) {
      metaData.questions = data.questions;
    }
  }

  // Build update data object (using any until Prisma client is regenerated)
  const updateData: any = {};
  if (data.name !== undefined) {
    updateData.name = data.name;
  }
  if (data.description !== undefined) {
    updateData.description = data.description;
  }
  if (data.messages !== undefined) {
    updateData.messages = data.messages;
  }
  if (metaData !== undefined) {
    updateData.meta = metaData;
  }

  const updated = await prisma.callList.update({
    where: { id: listId },
    data: updateData,
    include: {
      group: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          items: true,
        },
      },
    },
  });

  return updated;
};

/**
 * Add students to a call list (bulk)
 */
export const addCallListItems = async (
  listId: string,
  workspaceId: string,
  data: AddCallListItemsInput
) => {
  // Verify call list exists and belongs to workspace
  const callList = await prisma.callList.findFirst({
    where: {
      id: listId,
      workspaceId,
    },
  });

  if (!callList) {
    throw new AppError(404, 'Call list not found');
  }

  // Verify all students belong to workspace
  const students = await prisma.student.findMany({
    where: {
      id: { in: data.studentIds },
      workspaceId,
      isDeleted: false,
    },
  });

  if (students.length !== data.studentIds.length) {
    throw new AppError(400, 'One or more students not found');
  }

  // Create items (skip duplicates)
  const items = await Promise.all(
    data.studentIds.map((studentId) =>
      prisma.callListItem.upsert({
        where: {
          callListId_studentId: {
            callListId: listId,
            studentId,
          },
        },
        update: {}, // Don't update if exists
        create: {
          callListId: listId,
          studentId,
          state: 'QUEUED',
          priority: 0,
        },
      })
    )
  );

  return {
    added: items.length,
    items,
  };
};

/**
 * Assign call list items (bulk)
 */
export const assignCallListItems = async (
  listId: string,
  workspaceId: string,
  userId: string,
  data: AssignCallListItemsInput
) => {
  // Verify call list exists
  const callList = await prisma.callList.findFirst({
    where: {
      id: listId,
      workspaceId,
    },
  });

  if (!callList) {
    throw new AppError(404, 'Call list not found');
  }

  // Determine assignee (provided or current user)
  let assignedTo: string;

  if (data.assignedTo) {
    // Verify assignee is a workspace member
    const member = await prisma.workspaceMember.findFirst({
      where: {
        id: data.assignedTo,
        workspaceId,
      },
    });

    if (!member) {
      throw new AppError(404, 'Assigned member not found');
    }

    assignedTo = data.assignedTo;
  } else {
    // Use current user's member ID
    const currentUserMember = await prisma.workspaceMember.findFirst({
      where: {
        userId,
        workspaceId,
      },
    });

    if (!currentUserMember) {
      throw new AppError(403, 'Access denied');
    }

    assignedTo = currentUserMember.id;
  }

  // Update items
  const result = await prisma.callListItem.updateMany({
    where: {
      id: { in: data.itemIds },
      callListId: listId,
    },
    data: {
      assignedTo,
    },
  });

  // Get updated items
  const items = await prisma.callListItem.findMany({
    where: {
      id: { in: data.itemIds },
      callListId: listId,
    },
    include: {
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
  });

  return {
    updated: result.count,
    items,
  };
};

/**
 * List call list items with pagination
 */
export const listCallListItems = async (
  listId: string,
  workspaceId: string,
  options: ListCallListItemsInput
) => {
  // Verify call list exists
  const callList = await prisma.callList.findFirst({
    where: {
      id: listId,
      workspaceId,
    },
  });

  if (!callList) {
    throw new AppError(404, 'Call list not found');
  }

  // Build where clause
  const where: any = {
    callListId: listId,
  };

  if (options.state) {
    where.state = options.state;
  }

  if (options.assignedTo) {
    where.assignedTo = options.assignedTo;
  }

  // Filter by call log status and/or follow-up required
  if (options.callLogStatus || options.followUpRequired !== undefined) {
    where.callLog = {};
    if (options.callLogStatus) {
      where.callLog.status = options.callLogStatus;
    }
    if (options.followUpRequired !== undefined) {
      where.callLog.followUpRequired = options.followUpRequired;
    }
  }

  // Calculate pagination
  const page = options.page || 1;
  const size = Math.min(options.size || 20, 100);
  const skip = (page - 1) * size;

  // Get items with pagination
  const [items, total] = await Promise.all([
    prisma.callListItem.findMany({
      where,
      include: {
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
        callLog: {
          select: {
            id: true,
            status: true,
            summaryNote: true,
            followUpDate: true,
            followUpRequired: true,
            callerNote: true,
            notes: true,
            callDate: true,
            callDuration: true,
            assignedTo: true,
          },
        },
      } as any,
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
      skip,
      take: size,
    }),
    prisma.callListItem.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page,
      size,
      total,
      totalPages: Math.ceil(total / size),
    },
  };
};

/**
 * Get available students for a call list (students not already in the list)
 */
export const getAvailableStudents = async (
  listId: string,
  workspaceId: string,
  userId: string,
  options: GetAvailableStudentsInput
) => {
  // Get call list with group info
  const callList = await prisma.callList.findFirst({
    where: {
      id: listId,
      workspaceId,
    },
    include: {
      group: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!callList) {
    throw new AppError(404, 'Call list not found');
  }

  // Verify user has access to workspace
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
    include: {
      groupAccess: true,
    },
  });

  if (!membership) {
    throw new AppError(403, 'Access denied');
  }

  // If call list has a group, verify user has access to that group
  if (callList.groupId) {
    if (membership.role !== 'ADMIN') {
      const hasAccess = membership.groupAccess.some(
        (access) => access.groupId === callList.groupId
      );
      if (!hasAccess) {
        throw new AppError(403, 'Access denied to this group');
      }
    }
  }

  // Get student IDs already in the call list
  const existingItems = await prisma.callListItem.findMany({
    where: {
      callListId: listId,
    },
    select: {
      studentId: true,
    },
  });

  const existingStudentIds = existingItems.map((item) => item.studentId);

  // Build student where clause
  const where: any = {
    workspaceId,
    isDeleted: false,
  };

  // Exclude students already in the call list
  if (existingStudentIds.length > 0) {
    where.id = {
      notIn: existingStudentIds,
    };
  }

  // Search query (name, email, or phone)
  if (options.q) {
    const searchConditions: any[] = [
      { name: { contains: options.q, mode: 'insensitive' } },
    ];

    if (options.q.includes('@')) {
      searchConditions.push({ email: { contains: options.q, mode: 'insensitive' } });
    }

    searchConditions.push({
      phones: {
        some: {
          phone: { contains: options.q },
        },
      },
    });

    where.OR = searchConditions;
  }

  // Build enrollment filter
  const enrollmentFilter: any = {
    isActive: true,
  };

  // If call list has a groupId, filter students by that group
  if (callList.groupId) {
    enrollmentFilter.groupId = callList.groupId;
  }

  // Apply enrollment filter if we have groupId or other enrollment filters
  if (callList.groupId || options.courseId || options.moduleId) {
    if (options.courseId) {
      enrollmentFilter.courseId = options.courseId;
    }
    if (options.moduleId) {
      enrollmentFilter.moduleId = options.moduleId;
    }
    where.enrollments = {
      some: enrollmentFilter,
    };
  }

  // Filter by status (requires groupId)
  if (options.status && callList.groupId) {
    where.statuses = {
      some: {
        groupId: callList.groupId,
        status: options.status,
      },
    };
  }

  // Filter by batch (via StudentBatch junction)
  if (options.batchId) {
    where.studentBatches = {
      some: {
        batchId: options.batchId,
      },
    };
  }

  // Calculate pagination
  const page = options.page || 1;
  const size = Math.min(options.size || 20, 100);
  const skip = (page - 1) * size;

  // Get students with pagination
  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      include: {
        phones: {
          where: { isPrimary: true },
          take: 1,
        },
        studentBatches: {
          include: {
            batch: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        enrollments: {
          where: { isActive: true },
          include: {
            group: {
              select: {
                id: true,
                name: true,
              },
            },
            course: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: size,
    }),
    prisma.student.count({ where }),
  ]);

  return {
    students,
    pagination: {
      page,
      size,
      total,
      totalPages: Math.ceil(total / size),
    },
  };
};

/**
 * Update a call list item
 */
export const updateCallListItem = async (
  itemId: string,
  workspaceId: string,
  data: UpdateCallListItemInput
) => {
  // Verify item exists and belongs to workspace
  const item = await prisma.callListItem.findFirst({
    where: {
      id: itemId,
      callList: {
        workspaceId,
      },
    },
  });

  if (!item) {
    throw new AppError(404, 'Call list item not found');
  }

  const updated = await prisma.callListItem.update({
    where: { id: itemId },
    data: {
      state: data.state,
      priority: data.priority,
      custom: data.custom !== undefined ? data.custom : undefined,
    },
    include: {
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
      callList: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return updated;
};

/**
 * Delete a call list
 */
export const deleteCallList = async (listId: string, workspaceId: string) => {
  const callList = await prisma.callList.findFirst({
    where: {
      id: listId,
      workspaceId,
    },
  });

  if (!callList) {
    throw new AppError(404, 'Call list not found');
  }

  await prisma.callList.delete({
    where: { id: listId },
  });

  return { message: 'Call list deleted successfully' };
};

/**
 * Unassign call list items
 */
export const unassignCallListItems = async (
  listId: string,
  workspaceId: string,
  itemIds: string[]
) => {
  // Verify call list exists
  const callList = await prisma.callList.findFirst({
    where: {
      id: listId,
      workspaceId,
    },
  });

  if (!callList) {
    throw new AppError(404, 'Call list not found');
  }

  // Verify all items belong to this call list
  const items = await prisma.callListItem.findMany({
    where: {
      id: { in: itemIds },
      callListId: listId,
    },
  });

  if (items.length !== itemIds.length) {
    throw new AppError(400, 'One or more items not found in this call list');
  }

  // Unassign items (set assignedTo to null)
  const result = await prisma.callListItem.updateMany({
    where: {
      id: { in: itemIds },
      callListId: listId,
    },
    data: {
      assignedTo: null,
    },
  });

  // Get updated items
  const updatedItems = await prisma.callListItem.findMany({
    where: {
      id: { in: itemIds },
      callListId: listId,
    },
    include: {
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
  });

  return {
    updated: result.count,
    items: updatedItems,
  };
};

export const createCallListFromBulkPaste = async (
  workspaceId: string,
  userId: string,
  data: BulkPasteCallListInput
) => {
  // Verify user has access to workspace
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
  });

  if (!membership) {
    throw new AppError(403, 'Access denied');
  }

  // Parse text data
  const parsed = await parseTextData(data.data);

  if (parsed.rows.length === 0) {
    throw new AppError(400, 'No data found in pasted content');
  }

  // Prepare meta with description and questions if provided
  const metaData: any = data.meta || {};
  if (data.description) {
    metaData.description = data.description;
  }
  if (data.questions) {
    metaData.questions = data.questions;
  }

  // Create call list WITHOUT groupId/batchId
  const createData: any = {
    workspaceId,
    name: data.name,
    source: 'IMPORT',
    description: data.description,
    messages: data.messages || [],
    meta: Object.keys(metaData).length > 0 ? metaData : null,
  };
  // groupId is optional, so we don't set it (no group dependency)

  const callList = await prisma.callList.create({
    data: createData,
  });

  // Process rows (similar to commitCallListImport but WITHOUT group/batch assignment)
  const stats = {
    matched: 0,
    created: 0,
    added: 0,
    duplicates: 0,
    errors: 0,
  };
  const errors: string[] = [];
  const existingStudentIds = new Set<string>();

  const extractField = (row: Record<string, any>, columnName?: string): string | null => {
    if (!columnName) return null;
    const value = row[columnName];
    return typeof value === 'string' ? value.trim() : (value?.toString().trim() || null);
  };

  for (let idx = 0; idx < parsed.rows.length; idx++) {
    const row = parsed.rows[idx] as Record<string, any>;
    const rowNum = idx + 2;

    try {
      const name = extractField(row, data.columnMapping.name);
      const email = extractField(row, data.columnMapping.email);
      const phone = extractField(row, data.columnMapping.phone);

      if (!name || name.length === 0) {
        stats.errors++;
        errors.push(`Row ${rowNum}: Name is required`);
        continue;
      }

      // Match existing student
      let student = null;
      let isMatched = false;

      // Match by email_or_phone strategy
      if (data.matchBy === 'email_or_phone' || data.matchBy === 'email') {
        if (email) {
          student = await prisma.student.findFirst({
            where: {
              workspaceId,
              email: email.toLowerCase(),
              isDeleted: false,
            },
          });
          if (student) isMatched = true;
        }
      }

      if (!student && (data.matchBy === 'email_or_phone' || data.matchBy === 'phone')) {
        if (phone) {
          const studentPhone = await prisma.studentPhone.findFirst({
            where: {
              workspaceId,
              phone,
              student: {
                workspaceId,
                isDeleted: false,
              },
            },
            include: {
              student: true,
            },
          });
          if (studentPhone) {
            student = studentPhone.student;
            isMatched = true;
          }
        }
      }

      if (!student && data.matchBy === 'name') {
        student = await prisma.student.findFirst({
          where: {
            workspaceId,
            name: {
              equals: name,
              mode: 'insensitive',
            },
            isDeleted: false,
          },
        });
        if (student) isMatched = true;
      }

      // Create student if not found and createNewStudents is true
      if (!student && data.createNewStudents) {
        // Check for duplicates if skipDuplicates is true
        if (data.skipDuplicates) {
          if (email) {
            const exists = await prisma.student.findFirst({
              where: { workspaceId, email: email.toLowerCase(), isDeleted: false },
            });
            if (exists) {
              stats.duplicates++;
              continue;
            }
          }

          if (phone) {
            const exists = await prisma.studentPhone.findFirst({
              where: { workspaceId, phone, student: { workspaceId, isDeleted: false } },
            });
            if (exists) {
              stats.duplicates++;
              continue;
            }
          }
        }

        student = await prisma.student.create({
          data: {
            workspaceId,
            name,
            email: email?.toLowerCase() || null,
          },
        });
        stats.created++;

        // Create phone if provided
        if (phone) {
          await prisma.studentPhone.create({
            data: {
              studentId: student.id,
              workspaceId,
              phone,
              isPrimary: true,
            },
          });
        }
      } else if (!student) {
        stats.errors++;
        errors.push(`Row ${rowNum}: Student not found and createNewStudents is false`);
        continue;
      } else {
        stats.matched++;
      }

      if (!student) {
        stats.errors++;
        errors.push(`Row ${rowNum}: Could not create or match student`);
        continue;
      }

      // Check if student already in call list
      if (existingStudentIds.has(student.id)) {
        stats.duplicates++;
        continue;
      }

      // Add student to call list (NO group/batch assignment)
      await prisma.callListItem.upsert({
        where: {
          callListId_studentId: {
            callListId: callList.id,
            studentId: student.id,
          },
        },
        create: {
          callListId: callList.id,
          studentId: student.id,
          state: 'QUEUED',
          priority: 0,
        },
        update: {}, // Don't update if exists
      });

      stats.added++;
      existingStudentIds.add(student.id); // Track in memory to avoid duplicates in same import
    } catch (error: any) {
      stats.errors++;
      errors.push(`Row ${rowNum}: ${error.message || 'Unknown error'}`);
    }
  }

  // Fetch created call list with item count
  const createdCallList = await prisma.callList.findUnique({
    where: { id: callList.id },
    include: {
      _count: {
        select: {
          items: true,
        },
      },
    },
  });

  return {
    callList: createdCallList,
    stats,
    errors: errors.slice(0, 10),
    message: `Call list created: ${stats.matched} matched, ${stats.created} created, ${stats.added} added, ${stats.duplicates} duplicates, ${stats.errors} errors`,
  };
};

