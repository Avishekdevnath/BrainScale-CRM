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
  CreateCallListFromFollowupsInput,
} from './call-list.schemas';
import {
  normalizeMapping,
  parseStudentFromMapping,
  parsePhonesFromMapping,
  type NormalizedMapping,
} from '../students/import-export-utils';

/**
 * Helper function to update matched student with missing fields
 */
async function updateMatchedStudent(
  studentId: string,
  workspaceId: string,
  studentData: { 
    name: string; 
    email?: string; 
    phone?: string;
    secondaryPhone?: string;
    discordId?: string;
    tags?: string[];
  },
  email?: string,
  phone?: string
): Promise<any> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { phones: true },
  });

  if (!student) return null;

  const updateData: any = {};
  let needsUpdate = false;

  // Update email if missing
  if (email && !student.email) {
    updateData.email = email;
    needsUpdate = true;
  }

  // Update discordId if missing
  if (studentData.discordId?.trim() && !student.discordId) {
    updateData.discordId = studentData.discordId.trim();
    needsUpdate = true;
  }

  // Merge tags (combine existing with new, remove duplicates)
  if (studentData.tags && studentData.tags.length > 0) {
    const existingTags = (student.tags || []) as string[];
    const newTags = studentData.tags;
    const mergedTags = Array.from(new Set([...existingTags, ...newTags]));
    if (mergedTags.length !== existingTags.length) {
      updateData.tags = mergedTags;
      needsUpdate = true;
    }
  }

  // Update student if any fields need updating
  let updatedStudent = student;
  if (needsUpdate) {
    updatedStudent = await prisma.student.update({
      where: { id: student.id },
      data: updateData,
      include: {
        phones: true,
      },
    });
  }

  // Handle phones - add missing phones
  const existingPhones = (updatedStudent.phones || []).map(p => p.phone);
  
  // Add primary phone if provided and doesn't exist
  if (phone && !existingPhones.includes(phone)) {
    // Check if student already has a primary phone
    const hasPrimary = updatedStudent.phones?.some(p => p.isPrimary);
    await prisma.studentPhone.create({
      data: {
        studentId: updatedStudent.id,
        workspaceId,
        phone: phone,
        isPrimary: !hasPrimary, // Make primary only if no primary exists
      },
    });
  }

  // Add secondary phone if provided and doesn't exist
  if (studentData.secondaryPhone?.trim() && !existingPhones.includes(studentData.secondaryPhone.trim())) {
    await prisma.studentPhone.create({
      data: {
        studentId: updatedStudent.id,
        workspaceId,
        phone: studentData.secondaryPhone.trim(),
        isPrimary: false,
      },
    });
  }

  // Reload student with updated phones
  return await prisma.student.findUnique({
    where: { id: updatedStudent.id },
    include: { phones: true },
  });
}

/**
 * Normalize tags to always be string[] (flatten nested arrays)
 */
function normalizeTags(tags: string | string[] | string[][] | undefined | null): string[] {
  if (!tags) return [];
  
  // If it's a string, split by comma and trim
  if (typeof tags === 'string') {
    return tags.split(',').map(t => t.trim()).filter(Boolean);
  }
  
  // If it's an array, flatten it (handles both string[] and string[][])
  if (Array.isArray(tags)) {
    // Flatten nested arrays and filter out empty strings
    return tags.flat().filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0);
  }
  
  return [];
}

/**
 * Helper function to match or create a student
 * Returns the student and whether it was created or matched
 */
const matchOrCreateStudent = async (
  workspaceId: string,
  studentData: { 
    name: string; 
    email?: string; 
    phone?: string;
    secondaryPhone?: string;
    discordId?: string;
    tags?: string[];
  },
  matchBy: 'email' | 'phone' | 'email_or_phone' | 'name' = 'email_or_phone',
  skipDuplicates: boolean = true
): Promise<{ student: any; wasCreated: boolean; wasMatched: boolean }> => {
  let student = null;
  let wasMatched = false;
  let wasCreated = false;

  // Normalize email
  const email = studentData.email?.trim().toLowerCase() || undefined;
  const phone = studentData.phone?.trim() || undefined;

  // Match by email_or_phone strategy
  if (matchBy === 'email_or_phone' || matchBy === 'email') {
    if (email) {
      student = await prisma.student.findFirst({
        where: {
          workspaceId,
          email: email,
          isDeleted: false,
        },
        include: {
          phones: true,
        },
      });
      if (student) wasMatched = true;
    }
  }

  if (!student && (matchBy === 'email_or_phone' || matchBy === 'phone')) {
    if (phone) {
      const studentPhone = await prisma.studentPhone.findFirst({
        where: {
          workspaceId,
          phone: phone,
          student: {
            workspaceId,
            isDeleted: false,
          },
        },
        include: {
          student: {
            include: {
              phones: true,
            },
          },
        },
      });
      if (studentPhone) {
        student = studentPhone.student;
        wasMatched = true;
      }
    }
  }

  if (!student && matchBy === 'name') {
    student = await prisma.student.findFirst({
      where: {
        workspaceId,
        name: {
          equals: studentData.name.trim(),
          mode: 'insensitive',
        },
        isDeleted: false,
      },
      include: {
        phones: true,
      },
    });
    if (student) wasMatched = true;
  }

  // If student was matched, update missing fields
  if (student && wasMatched) {
    const updateData: any = {};
    let needsUpdate = false;

    // Update email if missing
    if (email && !student.email) {
      updateData.email = email;
      needsUpdate = true;
    }

    // Update discordId if missing
    if (studentData.discordId?.trim() && !student.discordId) {
      updateData.discordId = studentData.discordId.trim();
      needsUpdate = true;
    }

    // Merge tags (combine existing with new, remove duplicates)
    if (studentData.tags && studentData.tags.length > 0) {
      const existingTags = (student.tags || []) as string[];
      const newTags = studentData.tags;
      const mergedTags = Array.from(new Set([...existingTags, ...newTags]));
      if (mergedTags.length !== existingTags.length) {
        updateData.tags = mergedTags;
        needsUpdate = true;
      }
    }

    // Update student if any fields need updating
    if (needsUpdate) {
      student = await prisma.student.update({
        where: { id: student.id },
        data: updateData,
        include: {
          phones: true,
        },
      });
    }

    // Handle phones - add missing phones
    if (!student.phones) {
      student = await prisma.student.findUnique({
        where: { id: student.id },
        include: { phones: true },
      });
    }

    if (!student) {
      // This shouldn't happen, but handle it gracefully
      return { student: null, wasCreated: false, wasMatched: false };
    }

    const existingPhones = (student.phones || []).map(p => p.phone);
    
    // Add primary phone if provided and doesn't exist
    if (phone && !existingPhones.includes(phone)) {
      // Check if student already has a primary phone
      const hasPrimary = student?.phones?.some(p => p.isPrimary);
      await prisma.studentPhone.create({
        data: {
          studentId: student.id,
          workspaceId,
          phone: phone,
          isPrimary: !hasPrimary, // Make primary only if no primary exists
        },
      });
    }

    // Add secondary phone if provided and doesn't exist
    if (studentData.secondaryPhone?.trim() && !existingPhones.includes(studentData.secondaryPhone.trim())) {
      await prisma.studentPhone.create({
        data: {
          studentId: student.id,
          workspaceId,
          phone: studentData.secondaryPhone.trim(),
          isPrimary: false,
        },
      });
    }

    // Reload student with updated phones
    student = await prisma.student.findUnique({
      where: { id: student.id },
      include: { phones: true },
    });
  }

  // Create student if not found
  if (!student) {
    // Check for duplicates if skipDuplicates is true
    if (skipDuplicates) {
      if (email) {
        const exists = await prisma.student.findFirst({
          where: { workspaceId, email: email, isDeleted: false },
        });
        if (exists) {
          // Update missing fields for matched student
          const updated = await updateMatchedStudent(exists.id, workspaceId, studentData, email, phone);
          return { student: updated, wasCreated: false, wasMatched: true };
        }
      }

      if (phone) {
        const exists = await prisma.studentPhone.findFirst({
          where: {
            workspaceId,
            phone: phone,
            student: { workspaceId, isDeleted: false },
          },
          include: {
            student: {
              include: {
                phones: true,
              },
            },
          },
        });
        if (exists) {
          // Update missing fields for matched student
          const updated = await updateMatchedStudent(exists.student.id, workspaceId, studentData, email, phone);
          return { student: updated, wasCreated: false, wasMatched: true };
        }
      }
    }

    // Create student
    const createData: any = {
      workspaceId,
      name: studentData.name.trim(),
      email: email || null,
      discordId: studentData.discordId?.trim() || null,
      tags: studentData.tags && studentData.tags.length > 0 ? studentData.tags : [],
    };

    // Create phones (primary and secondary if provided)
    const phonesToCreate: any[] = [];
    if (phone) {
      phonesToCreate.push({
        workspaceId,
        phone: phone,
        isPrimary: true,
      });
    }
    if (studentData.secondaryPhone?.trim()) {
      phonesToCreate.push({
        workspaceId,
        phone: studentData.secondaryPhone.trim(),
        isPrimary: false,
      });
    }

    if (phonesToCreate.length > 0) {
      createData.phones = {
        create: phonesToCreate,
      };
    }

    student = await prisma.student.create({
      data: createData,
    });
    wasCreated = true;
  }

  return { student, wasCreated, wasMatched };
};

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

  // If studentsData provided, match or create students
  if (data.studentsData && data.studentsData.length > 0) {
    const matchBy = data.matchBy || 'email_or_phone';
    const skipDuplicates = data.skipDuplicates !== undefined ? data.skipDuplicates : true;
    const stats = {
      matched: 0,
      created: 0,
      errors: 0,
    };
    const errors: string[] = [];

    for (const studentData of data.studentsData) {
      try {
        // Skip if name is empty
        if (!studentData.name || studentData.name.trim().length === 0) {
          stats.errors++;
          errors.push(`Student missing required name field`);
          continue;
        }

        // Normalize data (convert empty strings to undefined)
        const normalizedData = {
          name: studentData.name,
          email: studentData.email && studentData.email.trim() ? studentData.email.trim() : undefined,
          phone: studentData.phone && studentData.phone.trim() ? studentData.phone.trim() : undefined,
          secondaryPhone: studentData.secondaryPhone && studentData.secondaryPhone.trim() ? studentData.secondaryPhone.trim() : undefined,
          discordId: studentData.discordId && studentData.discordId.trim() ? studentData.discordId.trim() : undefined,
          tags: normalizeTags(studentData.tags),
        };

        const result = await matchOrCreateStudent(
          workspaceId,
          normalizedData,
          matchBy,
          skipDuplicates
        );

        if (result.student) {
          validatedStudentIds.push(result.student.id);
          if (result.wasCreated) {
            stats.created++;
          } else if (result.wasMatched) {
            stats.matched++;
          }
        } else {
          stats.errors++;
          errors.push(`Failed to create or match student: ${studentData.name}`);
        }
      } catch (error: any) {
        stats.errors++;
        errors.push(`Error processing student "${studentData.name}": ${error.message || 'Unknown error'}`);
      }
    }

    // Store stats in meta for response (optional, for debugging)
    if (stats.errors > 0) {
      // Log errors but don't fail if we have at least some valid students
      console.warn(`Call list creation: ${stats.matched} matched, ${stats.created} created, ${stats.errors} errors`);
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
            workspaceId: workspaceId, // For tenant isolation
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
export const listCallLists = async (
  workspaceId: string,
  options?: { groupId?: string; batchId?: string; status?: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED' }
) => {
  const where: any = { workspaceId };
  
  // Filter by status
  if (options?.status) {
    where.status = options.status;
  }
  // If no status specified, don't filter by status (show all for backward compatibility)
  
  // If groupId provided (for group dashboard), include both:
  // - Call lists for that specific group
  // - Workspace-level call lists (groupId = null)
  if (options?.groupId) {
    const groupFilter = {
      OR: [
        { groupId: options.groupId },
        { groupId: null },
      ],
    };
    
    // Combine status filter with group filter using AND
    if (where.OR) {
      where.AND = [
        { OR: where.OR },
        groupFilter,
      ];
      delete where.OR;
    } else {
      where.OR = groupFilter.OR;
    }
  }
  
  // Filter by batchId if provided (via group's batchId)
  if (options?.batchId) {
    const batchFilter = { group: { batchId: options.batchId } };
    
    // Combine with existing filters using AND
    if (where.AND) {
      where.AND.push(batchFilter);
    } else if (where.OR) {
      where.AND = [
        { OR: where.OR },
        batchFilter,
      ];
      delete where.OR;
    } else {
      where.group = { batchId: options.batchId };
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
  userId: string,
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

  // If status is being changed, verify user is admin
  if (data.status !== undefined && data.status !== callList.status) {
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        userId,
        workspaceId,
      },
    });

    if (!membership || membership.role !== 'ADMIN') {
      throw new AppError(403, 'Only admins can change call list status');
    }
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
  if (data.status !== undefined) {
    updateData.status = data.status;
    // Handle completion tracking
    if (data.status === 'COMPLETED') {
      updateData.completedAt = new Date();
      updateData.completedBy = userId;
    } else if (data.status === 'ACTIVE' || data.status === 'ARCHIVED') {
      // Clear completion tracking when moving to ACTIVE or ARCHIVED
      updateData.completedAt = null;
      updateData.completedBy = null;
    }
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
          workspaceId: workspaceId, // For tenant isolation
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

  // Merge custom fields if provided (preserve existing fields)
  let customData = item.custom as Record<string, any> | null;
  if (data.custom !== undefined) {
    customData = { ...(customData || {}), ...data.custom };
  }

  const updated = await prisma.callListItem.update({
    where: { id: itemId },
    data: {
      state: data.state,
      priority: data.priority,
      custom: customData !== undefined && customData !== null && Object.keys(customData).length > 0 ? customData : null,
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
 * Mark call list as complete (Admin only)
 */
export const markCallListComplete = async (
  listId: string,
  workspaceId: string,
  userId: string
) => {
  // Verify user is admin
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
  });

  if (!membership) {
    throw new AppError(403, 'Access denied');
  }

  if (membership.role !== 'ADMIN') {
    throw new AppError(403, 'Only admins can mark call lists as complete');
  }

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

  // Update status to COMPLETED
  const updated = await prisma.callList.update({
    where: { id: listId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      completedBy: userId,
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

  return updated;
};

/**
 * Mark call list as active (reopen) - Admin only
 */
export const markCallListActive = async (
  listId: string,
  workspaceId: string,
  userId: string
) => {
  // Verify user is admin
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
  });

  if (!membership) {
    throw new AppError(403, 'Access denied');
  }

  if (membership.role !== 'ADMIN') {
    throw new AppError(403, 'Only admins can reopen call lists');
  }

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

  // Update status to ACTIVE and clear completion fields
  const updated = await prisma.callList.update({
    where: { id: listId },
    data: {
      status: 'ACTIVE',
      completedAt: null,
      completedBy: null,
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

  return updated;
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

/**
 * Delete a call list item (remove student from call list)
 */
export const deleteCallListItem = async (itemId: string, workspaceId: string) => {
  // Verify item exists and belongs to workspace
  const item = await prisma.callListItem.findFirst({
    where: {
      id: itemId,
      callList: {
        workspaceId,
      },
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!item) {
    throw new AppError(404, 'Call list item not found');
  }

  await prisma.callListItem.delete({
    where: { id: itemId },
  });

  return { 
    message: 'Call list item deleted successfully',
    deletedItem: {
      id: item.id,
      studentName: item.student?.name,
    },
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

  // Normalize column mapping (supports both old and new format)
  const normalizedMapping = normalizeMapping(data.columnMapping as any);

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

  // Process rows using the same logic as student import
  const stats = {
    matched: 0,
    created: 0,
    added: 0,
    duplicates: 0,
    errors: 0,
  };
  const errors: string[] = [];
  const existingStudentIds = new Set<string>();

  const maxReportedErrors = 100;

  for (let idx = 0; idx < parsed.rows.length; idx++) {
    const row = parsed.rows[idx] as Record<string, any>;
    const rowNum = idx + 2;

    // Skip rows that are completely empty/whitespace
    const isEmptyRow = Object.values(row).every((value) => {
      if (value === null || value === undefined) return true;
      const str = String(value).trim();
      return str.length === 0;
    });
    if (isEmptyRow) {
      continue;
    }

    try {
      // Parse student data using flexible mapping (like student import)
      const studentData = parseStudentFromMapping(row, normalizedMapping);

      if (!studentData.name) {
        if (errors.length < maxReportedErrors) {
          errors.push(`Row ${rowNum}: Name is required`);
        }
        stats.errors++;
        continue;
      }

      // Parse phones using flexible mapping (supports multiple phones)
      const phones = parsePhonesFromMapping(row, normalizedMapping);
      const primaryPhone = phones.find((p) => p.isPrimary)?.phone || phones[0]?.phone;

      // Match existing student
      let student = null;
      let isMatched = false;

      // Match by email_or_phone strategy
      if (data.matchBy === 'email_or_phone' || data.matchBy === 'email') {
        if (studentData.email) {
          student = await prisma.student.findFirst({
            where: {
              workspaceId,
              email: studentData.email.toLowerCase(),
              isDeleted: false,
            },
          });
          if (student) isMatched = true;
        }
      }

      if (!student && (data.matchBy === 'email_or_phone' || data.matchBy === 'phone')) {
        if (primaryPhone) {
          const studentPhone = await prisma.studentPhone.findFirst({
            where: {
              workspaceId,
              phone: primaryPhone,
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
              equals: studentData.name,
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
          if (studentData.email) {
            const exists = await prisma.student.findFirst({
              where: { workspaceId, email: studentData.email.toLowerCase(), isDeleted: false },
            });
            if (exists) {
              stats.duplicates++;
              continue;
            }
          }

          if (primaryPhone) {
            const exists = await prisma.studentPhone.findFirst({
              where: { workspaceId, phone: primaryPhone, student: { workspaceId, isDeleted: false } },
            });
            if (exists) {
              stats.duplicates++;
              continue;
            }
          }
        }

        // Create student with all data
        student = await prisma.student.create({
          data: {
            workspaceId,
            name: studentData.name,
            email: studentData.email?.toLowerCase() || null,
            discordId: studentData.discordId || null,
            tags: studentData.tags || [],
            phones: {
              create: phones.map((p) => ({
                workspaceId,
                phone: p.phone,
                isPrimary: p.isPrimary,
              })),
            },
          },
        });
        stats.created++;
      } else if (!student) {
        if (errors.length < maxReportedErrors) {
          errors.push(`Row ${rowNum}: Student not found and createNewStudents is false`);
        }
        stats.errors++;
        continue;
      } else {
        stats.matched++;
      }

      if (!student) {
        if (errors.length < maxReportedErrors) {
          errors.push(`Row ${rowNum}: Could not create or match student`);
        }
        stats.errors++;
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
          workspaceId: workspaceId, // For tenant isolation
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
      if (errors.length < maxReportedErrors) {
        errors.push(`Row ${rowNum}: ${error.message || 'Unknown error'}`);
      }
      stats.errors++;
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

/**
 * Create a call list from selected follow-ups
 * Admin-only feature that creates a new call list with items from follow-ups
 * Each item preserves the follow-up's note in the custom field
 */
export const createCallListFromFollowups = async (
  workspaceId: string,
  userId: string,
  data: CreateCallListFromFollowupsInput
) => {
  // Verify user is ADMIN
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
  });

  if (!membership) {
    throw new AppError(403, 'Access denied');
  }

  if (membership.role !== 'ADMIN') {
    throw new AppError(403, 'Only admins can create call lists from follow-ups');
  }

  // Validate all follow-up IDs exist and belong to workspace
  const followups = await prisma.followup.findMany({
    where: {
      id: { in: data.followupIds },
      workspaceId,
    },
    include: {
      callList: {
        select: {
          id: true,
          name: true,
          messages: true,
          meta: true,
        },
      },
      student: {
        select: {
          id: true,
        },
      },
    },
  });

  if (followups.length !== data.followupIds.length) {
    throw new AppError(404, 'One or more follow-ups not found');
  }

  // Ensure all follow-ups are PENDING status
  const nonPendingFollowups = followups.filter((f) => f.status !== 'PENDING');
  if (nonPendingFollowups.length > 0) {
    throw new AppError(400, 'All follow-ups must be in PENDING status');
  }

  // Ensure all follow-ups have associated call lists (for questions/messages)
  const followupsWithoutCallList = followups.filter((f) => !f.callList);
  if (followupsWithoutCallList.length > 0) {
    throw new AppError(400, 'All follow-ups must be associated with a call list');
  }

  // Determine messages and questions
  // Use provided messages/questions, or copy from first follow-up's call list
  let messages: string[] = data.messages || [];
  let questions: any[] = data.questions || [];

  if (messages.length === 0 && followups[0].callList?.messages) {
    messages = followups[0].callList.messages;
  }

  if (questions.length === 0 && followups[0].callList?.meta) {
    const meta = followups[0].callList.meta as any;
    if (meta.questions) {
      questions = meta.questions;
    }
  }

  // Prepare meta object with questions
  let metaData: any = data.meta || {};
  if (questions.length > 0) {
    metaData.questions = questions;
  }

  // Create call list (workspace-level, no groupId)
  const callList = await prisma.callList.create({
    data: {
      workspaceId,
      name: data.name,
      source: data.source || 'FILTER',
      description: data.description,
      messages,
      meta: Object.keys(metaData).length > 0 ? metaData : null,
    },
    include: {
      _count: {
        select: {
          items: true,
        },
      },
    },
  });

  // Create call list items for each follow-up
  const items = await Promise.all(
    followups.map((followup) =>
      prisma.callListItem.create({
        data: {
          workspaceId: workspaceId, // For tenant isolation
          callListId: callList.id,
          studentId: followup.studentId,
          assignedTo: null, // No assignment required for follow-ups
          state: 'QUEUED',
          custom: {
            followupNote: followup.notes || null,
          },
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })
    )
  );

  // Fetch updated call list with item count
  const updatedCallList = await prisma.callList.findUnique({
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
    callList: updatedCallList || callList,
    items,
    message: `Call list created with ${items.length} items from follow-ups`,
  };
};

