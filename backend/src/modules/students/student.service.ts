import { prisma } from '../../db/client';
import { AppError } from '../../middleware/error-handler';
import {
  CreateStudentInput,
  UpdateStudentInput,
  ListStudentsInput,
  AddPhoneInput,
  BulkPasteStudentsInput,
  AddStudentToBatchInput,
  SetStudentBatchesInput,
} from './student.schemas';
import * as enrollmentService from '../enrollments/enrollment.service';
import {
  normalizeMapping,
  parseStudentFromMapping,
  parsePhonesFromMapping,
  parseEnrollmentFromMapping,
  validateMapping,
  type NormalizedMapping,
} from './import-export-utils';
import { getStartOfWeek, getStartOfMonth, getStartOfDay } from '../../utils/date-helpers';

/**
 * Create a new student
 */
export const createStudent = async (
  workspaceId: string,
  data: CreateStudentInput
) => {
  if (data.email) {
    const existing = await prisma.student.findFirst({
      where: { workspaceId, email: data.email, isDeleted: false },
    });
    if (existing) throw new AppError(409, 'Student with this email already exists');
  }

  const student = await prisma.student.create({
    data: {
      workspaceId,
      name: data.name,
      email: data.email,
      discordId: data.discordId ?? undefined,
      tags: data.tags || [],
      phones: {
        create: (data.phones || []).map((p) => ({
          workspaceId,
          phone: p.phone,
          isPrimary: p.isPrimary || false,
        })),
      },
    },
    include: { phones: true },
  });

  return student;
};

/**
 * List students with search and filters
 */
export const listStudents = async (
  workspaceId: string,
  userId: string,
  options: ListStudentsInput
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

  // Build where clause
  const where: any = {
    workspaceId,
    isDeleted: false,
  };

  // Enhanced search query - searches across all visible fields and related data
  if (options.q) {
    const searchTerm = options.q.trim().toLowerCase();
    const searchConditions: any[] = [
      // Direct student fields - all converted to lowercase for case-insensitive search
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { email: { contains: searchTerm, mode: 'insensitive' } },
      { discordId: { contains: searchTerm, mode: 'insensitive' } },
      { notes: { contains: searchTerm, mode: 'insensitive' } },
      
      // Tags - case-insensitive search by trying multiple case variations
      // Since Prisma's 'has' does exact matching, we need to check multiple variations
      { tags: { has: searchTerm } }, // lowercase (e.g., "vip")
      { tags: { has: options.q.trim() } }, // original case (e.g., "vip" or "VIP")
      { tags: { has: options.q.trim().toUpperCase() } }, // uppercase (e.g., "VIP")
      // Title case (e.g., "Vip")
      ...(options.q.trim().length > 0 ? [{ tags: { has: options.q.trim().charAt(0).toUpperCase() + options.q.trim().slice(1).toLowerCase() } }] : []),
      
      // All phone numbers (primary and secondary) - case-insensitive
      {
        phones: {
          some: {
            phone: { contains: searchTerm },
          },
        },
      },
      
      // Status values via statuses - case-insensitive
      {
        statuses: {
          some: {
            status: { contains: searchTerm, mode: 'insensitive' },
          },
        },
      },
    ];

    // For nested relations (groups, batches, courses), we need to find IDs first
    // then filter by those IDs to avoid nested relation query issues in MongoDB
    
    // Search for groups by name (case-insensitive)
    try {
      const matchingGroups = await prisma.group.findMany({
        where: {
          workspaceId,
          name: { contains: searchTerm, mode: 'insensitive' },
          isActive: true,
        },
        select: { id: true },
      });
      
      if (matchingGroups.length > 0) {
        const groupIds = matchingGroups.map(g => g.id);
        searchConditions.push({
          enrollments: {
            some: {
              groupId: { in: groupIds },
            },
          },
        });
      }
    } catch (err) {
      // If group search fails, continue without it
      console.warn('Group search failed:', err);
    }

    // Search for batches by name (case-insensitive)
    try {
      const matchingBatches = await prisma.batch.findMany({
        where: {
          workspaceId,
          name: { contains: searchTerm, mode: 'insensitive' },
        },
        select: { id: true },
      });
      
      if (matchingBatches.length > 0) {
        const batchIds = matchingBatches.map(b => b.id);
        searchConditions.push({
          studentBatches: {
            some: {
              batchId: { in: batchIds },
            },
          },
        });
      }
    } catch (err) {
      // If batch search fails, continue without it
      console.warn('Batch search failed:', err);
    }

    // Search for courses by name (case-insensitive)
    try {
      const matchingCourses = await prisma.course.findMany({
        where: {
          workspaceId,
          name: { contains: searchTerm, mode: 'insensitive' },
        },
        select: { id: true },
      });
      
      if (matchingCourses.length > 0) {
        const courseIds = matchingCourses.map(c => c.id);
        searchConditions.push({
          enrollments: {
            some: {
              courseId: { in: courseIds },
            },
          },
        });
      }
    } catch (err) {
      // If course search fails, continue without it
      console.warn('Course search failed:', err);
    }

    where.OR = searchConditions;
  }

  // Build enrollment filter
  const enrollmentFilter: any = {
    isActive: true,
  };

  // Filter by group (only if user has access to that group)
  if (options.groupId) {
    // Check if user has access to this group
    if (membership.role !== 'ADMIN') {
      const hasAccess = membership.groupAccess.some(
        (access) => access.groupId === options.groupId
      );
      if (!hasAccess) {
        throw new AppError(403, 'Access denied to this group');
      }
    }
    enrollmentFilter.groupId = options.groupId;
  }

  // Filter by course
  if (options.courseId) {
    enrollmentFilter.courseId = options.courseId;
  }

  // Filter by module
  if (options.moduleId) {
    enrollmentFilter.moduleId = options.moduleId;
  }

  // Apply enrollment filter if any
  if (Object.keys(enrollmentFilter).length > 0) {
    where.enrollments = {
      some: enrollmentFilter,
    };
  }

  // Filter by status (requires groupId)
  if (options.status && options.groupId) {
    where.statuses = {
      some: {
        groupId: options.groupId,
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
  let [students, total] = await Promise.all([
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
 * Get student profile with timeline
 */
export const getStudent = async (studentId: string, workspaceId: string) => {
  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      workspaceId,
      isDeleted: false,
    },
    include: {
      phones: {
        orderBy: { isPrimary: 'desc' },
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
          module: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      statuses: {
        include: {
          group: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      _count: {
        select: {
          calls: true,
          followups: true,
        },
      },
    },
  });

  if (!student) {
    throw new AppError(404, 'Student not found');
  }

  // Get call logs for statistics
  const callLogs = await prisma.callLog.findMany({
    where: {
      studentId,
      workspaceId,
    },
    orderBy: { callDate: 'desc' },
    take: 5, // Last 5 calls for recent context
  });

  // Calculate average call duration
  const durations = callLogs
    .map((log) => log.callDuration)
    .filter((d): d is number => d !== null && d !== undefined);
  const averageCallDuration =
    durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : null;

  // Get last call date
  const lastCallDate = callLogs.length > 0 ? callLogs[0].callDate : null;

  // Get next follow-up date (first pending follow-up)
  const nextFollowup = await prisma.followup.findFirst({
    where: {
      studentId,
      workspaceId,
      status: 'PENDING',
    },
    orderBy: { dueAt: 'asc' },
  });
  const nextFollowUpDate = nextFollowup ? nextFollowup.dueAt : null;

  // Get timeline (calls and follow-ups) - using Call model for legacy support
  const [calls, followups] = await Promise.all([
    prisma.call.findMany({
      where: {
        studentId,
        workspaceId,
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { callDate: 'desc' },
      take: 20, // Last 20 calls
    }),
    prisma.followup.findMany({
      where: {
        studentId,
        workspaceId,
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
        assignee: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { dueAt: 'desc' },
      take: 20, // Last 20 follow-ups
    }),
  ]);

  return {
    ...student,
    lastCallDate: lastCallDate ? lastCallDate.toISOString() : null,
    nextFollowUpDate: nextFollowUpDate ? nextFollowUpDate.toISOString() : null,
    averageCallDuration: averageCallDuration ? Math.round(averageCallDuration) : null,
    timeline: {
      calls,
      followups,
    },
  };
};

/**
 * Update a student
 */
export const updateStudent = async (
  studentId: string,
  workspaceId: string,
  data: UpdateStudentInput
) => {
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

  // Check email uniqueness if being updated
  if (data.email && data.email !== student.email) {
    const existing = await prisma.student.findFirst({
      where: {
        workspaceId,
        email: data.email,
        isDeleted: false,
        id: { not: studentId },
      },
    });

    if (existing) {
      throw new AppError(409, 'Student with this email already exists');
    }
  }

  const updated = await prisma.student.update({
    where: { id: studentId },
    data: {
      name: data.name,
      email: data.email === null ? null : data.email,
      discordId: data.discordId === null ? null : data.discordId ?? undefined,
      tags: data.tags,
      notes: data.notes !== undefined ? (data.notes === null ? null : data.notes) : undefined,
    },
    include: {
      phones: {
        orderBy: { isPrimary: 'desc' },
      },
    },
  });

  return updated;
};

/**
 * Soft delete a student
 */
export const deleteStudent = async (studentId: string, workspaceId: string) => {
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

  await prisma.student.update({
    where: { id: studentId },
    data: { isDeleted: true },
  });

  return { message: 'Student deleted successfully' };
};

export const bulkDeleteStudents = async (workspaceId: string, studentIds: string[]) => {
  const result = await prisma.student.updateMany({
    where: {
      workspaceId,
      isDeleted: false,
      id: {
        in: studentIds,
      },
    },
    data: {
      isDeleted: true,
    },
  });

  return {
    message: 'Students deleted successfully',
    deletedCount: result.count,
  };
};

/**
 * Add phone to student
 */
export const addPhone = async (
  studentId: string,
  workspaceId: string,
  data: AddPhoneInput
) => {
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

  // Check if phone already exists in workspace
  const existing = await prisma.studentPhone.findFirst({
    where: {
      workspaceId,
      phone: data.phone,
    },
  });

  if (existing) {
    throw new AppError(409, 'This phone number is already associated with another student');
  }

  // If setting as primary, unset other primary phones
  if (data.isPrimary) {
    await prisma.studentPhone.updateMany({
      where: {
        studentId,
        isPrimary: true,
      },
      data: {
        isPrimary: false,
      },
    });
  }

  const phone = await prisma.studentPhone.create({
    data: {
      studentId,
      workspaceId,
      phone: data.phone,
      isPrimary: data.isPrimary || false,
    },
  });

  return phone;
};

/**
 * Remove phone from student
 */
export const removePhone = async (
  studentId: string,
  workspaceId: string,
  phoneId: string
) => {
  const phone = await prisma.studentPhone.findFirst({
    where: {
      id: phoneId,
      studentId,
      workspaceId,
    },
  });

  if (!phone) {
    throw new AppError(404, 'Phone not found');
  }

  await prisma.studentPhone.delete({
    where: { id: phoneId },
  });

  return { message: 'Phone removed successfully' };
};

type FixBangladeshPhonesResult = {
  message: string;
  scanned: number;
  updated: number;
  duplicatesRemoved: number;
  skipped: number;
  conflicts: number;
  conflictExamples: Array<{
    phoneId: string;
    from: string;
    to: string;
    existingStudentId: string;
  }>;
};

/**
 * Fix Bangladesh phone numbers imported without the '+' sign.
 * Examples:
 * - 8801812345678 -> 01812345678
 * - +8801712345678 -> 01712345678
 *
 * Only removes a leading "88" if (after removal) the remaining string starts with "0".
 */
export const fixBangladeshPhones = async (
  workspaceId: string
): Promise<FixBangladeshPhonesResult> => {
  const candidates = await prisma.studentPhone.findMany({
    where: {
      workspaceId,
      OR: [{ phone: { startsWith: '88' } }, { phone: { startsWith: '+88' } }],
      student: { isDeleted: false },
    },
    select: {
      id: true,
      studentId: true,
      phone: true,
      isPrimary: true,
    },
  });

  let scanned = candidates.length;
  let updated = 0;
  let duplicatesRemoved = 0;
  let skipped = 0;
  let conflicts = 0;
  const conflictExamples: FixBangladeshPhonesResult['conflictExamples'] = [];

  const normalize = (raw: string): string | null => {
    const trimmed = raw.trim();
    let working = trimmed;
    if (working.startsWith('+')) working = working.slice(1);
    if (!working.startsWith('88')) return null;

    const next = working.slice(2);
    if (!next.startsWith('0')) return null;
    if (next === trimmed) return null;

    return next;
  };

  await prisma.$transaction(async (tx) => {
    for (const phoneRow of candidates) {
      const to = normalize(phoneRow.phone);
      if (!to) {
        skipped += 1;
        continue;
      }

      const existing = await tx.studentPhone.findFirst({
        where: { workspaceId, phone: to },
        select: { id: true, studentId: true, isPrimary: true },
      });

      // Same student already has the normalized number: remove duplicate and preserve primary.
      if (existing && existing.studentId === phoneRow.studentId) {
        if (phoneRow.isPrimary && !existing.isPrimary) {
          await tx.studentPhone.updateMany({
            where: { studentId: phoneRow.studentId, isPrimary: true },
            data: { isPrimary: false },
          });
          await tx.studentPhone.update({
            where: { id: existing.id },
            data: { isPrimary: true },
          });
        }

        await tx.studentPhone.delete({ where: { id: phoneRow.id } });
        duplicatesRemoved += 1;
        continue;
      }

      // Another student already has the normalized number: skip and report conflict.
      if (existing && existing.studentId !== phoneRow.studentId) {
        conflicts += 1;
        if (conflictExamples.length < 25) {
          conflictExamples.push({
            phoneId: phoneRow.id,
            from: phoneRow.phone,
            to,
            existingStudentId: existing.studentId,
          });
        }
        continue;
      }

      try {
        await tx.studentPhone.update({
          where: { id: phoneRow.id },
          data: { phone: to },
        });
        updated += 1;
      } catch (err: any) {
        // Unique constraint race (workspaceId+phone) or other concurrent updates.
        if (err?.code === 'P2002') {
          conflicts += 1;
          if (conflictExamples.length < 25) {
            conflictExamples.push({
              phoneId: phoneRow.id,
              from: phoneRow.phone,
              to,
              existingStudentId: 'unknown',
            });
          }
          continue;
        }
        throw err;
      }
    }
  });

  return {
    message: 'Bangladesh phone numbers normalized successfully',
    scanned,
    updated,
    duplicatesRemoved,
    skipped,
    conflicts,
    conflictExamples,
  };
};

/**
 * Simple bulk import for students from pasted CSV data.
 *
 * This is intentionally minimal: it creates students row-by-row
 * using the existing createStudent logic and returns a summary.
 * If groupId is provided, students are also enrolled in that group.
 */
export const bulkImportFromPaste = async (
  workspaceId: string,
  userId: string,
  input: BulkPasteStudentsInput
) => {
  const { rows, mapping, groupId } = input;

  const mappingValidation = validateMapping(mapping);
  if (!mappingValidation.valid) {
    throw new AppError(400, mappingValidation.errors.join('; '));
  }

  // Validate group exists and user has access if groupId is provided
  if (groupId) {
    const group = await prisma.group.findFirst({
      where: {
        id: groupId,
        workspaceId,
        isActive: true,
      },
    });

    if (!group) {
      throw new AppError(404, 'Group not found');
    }

    // Verify user has access to this group
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        userId,
        workspaceId,
      },
      include: {
        groupAccess: {
          where: { groupId },
        },
      },
    });

    if (!membership) {
      throw new AppError(403, 'Access denied');
    }

    if (membership.role !== 'ADMIN' && membership.groupAccess.length === 0) {
      throw new AppError(403, 'Access denied to this group');
    }
  }

  // Normalize mapping (convert old format to new format if needed)
  const normalizedMapping = normalizeMapping(mapping as any);

  let successCount = 0;
  let enrollmentSuccessCount = 0;
  const errors: { rowIndex: number; message: string }[] = [];
  const maxReportedErrors = 100;

  for (let index = 0; index < rows.length; index += 1) {
    const raw = rows[index] as Record<string, any>;

    // Skip rows that are completely empty/whitespace
    const isEmptyRow = Object.values(raw).every((value) => {
      if (value === null || value === undefined) return true;
      const str = String(value).trim();
      return str.length === 0;
    });
    if (isEmptyRow) {
      continue;
    }

    // Parse student data using flexible mapping
    const studentData = parseStudentFromMapping(raw, normalizedMapping);

    if (!studentData.name) {
      if (errors.length < maxReportedErrors) {
        errors.push({ rowIndex: index, message: 'Name is required' });
      }
      continue;
    }

    // Parse phones using flexible mapping (supports multiple phones)
    const phones = parsePhonesFromMapping(raw, normalizedMapping);

    let createdStudentId: string | null = null;
    let wasCreated = false;
    let wasMatched = false;

    try {
      // Try to match existing student first
      let student = null;
      const email = studentData.email?.toLowerCase();
      const primaryPhone = phones.find((p) => p.isPrimary)?.phone || phones[0]?.phone;

      // Match by email
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

      // Match by phone if not found
      if (!student && primaryPhone) {
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

      // If student exists, update missing fields
      if (student) {
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

        // Add missing phones
        const existingPhones = (student.phones || []).map(p => p.phone);
        for (const phoneData of phones) {
          if (!existingPhones.includes(phoneData.phone)) {
            const hasPrimary = student.phones?.some(p => p.isPrimary);
            await prisma.studentPhone.create({
              data: {
                studentId: student.id,
                workspaceId,
                phone: phoneData.phone,
                isPrimary: phoneData.isPrimary || (!hasPrimary && phoneData === phones[0]),
              },
            });
          }
        }

        // Reload student with updated phones
        student = await prisma.student.findUnique({
          where: { id: student.id },
          include: { phones: true },
        });

        if (!student) {
          throw new AppError(404, 'Student not found after update');
        }

        createdStudentId = student.id;
        successCount += 1;
      } else {
        // Create new student if not found
        const student = await createStudent(workspaceId, {
          name: studentData.name,
          email: studentData.email,
          discordId: studentData.discordId,
          tags: studentData.tags,
          phones,
        });
        createdStudentId = student.id;
        wasCreated = true;
        successCount += 1;
      }

      // Handle enrollment from CSV data or groupId parameter
      let targetGroupId = groupId;
      let enrollmentData: {
        groupId?: string;
        courseId?: string;
        status?: string;
      } = {};

      // Parse enrollment data from CSV if available
      const csvEnrollment = parseEnrollmentFromMapping(raw, normalizedMapping);

      // If enrollment.groupName is provided in CSV, lookup group by name
      if (csvEnrollment.groupName) {
        const group = await prisma.group.findFirst({
          where: {
            workspaceId,
            name: csvEnrollment.groupName,
            isActive: true,
          },
        });

        if (group) {
          targetGroupId = group.id;
          enrollmentData.groupId = group.id;
        } else {
          if (errors.length < maxReportedErrors) {
            errors.push({
              rowIndex: index,
              message: `Group not found: ${csvEnrollment.groupName}`,
            });
          }
        }
      }

      // If enrollment.courseName is provided, lookup course by name
      if (csvEnrollment.courseName) {
        const course = await prisma.course.findFirst({
          where: {
            workspaceId,
            name: csvEnrollment.courseName,
          },
        });

        if (course) {
          enrollmentData.courseId = course.id;
        } else {
          if (errors.length < maxReportedErrors) {
            errors.push({
              rowIndex: index,
              message: `Course not found: ${csvEnrollment.courseName}`,
            });
          }
        }
      }

      // Create enrollment if groupId is available (from parameter or CSV)
      if (targetGroupId && createdStudentId) {
        try {
          await enrollmentService.createEnrollment(workspaceId, userId, {
            studentId: createdStudentId,
            groupId: targetGroupId,
            courseId: enrollmentData.courseId,
          });
          enrollmentSuccessCount += 1;

          // Create/update status if provided in CSV
          if (csvEnrollment.status && targetGroupId) {
            try {
              const validStatuses = ['NEW', 'IN_PROGRESS', 'FOLLOW_UP', 'CONVERTED', 'LOST'];
              if (validStatuses.includes(csvEnrollment.status.toUpperCase())) {
                await enrollmentService.setStudentStatus(
                  createdStudentId,
                  workspaceId,
                  userId,
                  {
                    groupId: targetGroupId,
                    status: csvEnrollment.status.toUpperCase() as any,
                  }
                );
              }
            } catch (statusErr: any) {
              // Status failure doesn't prevent enrollment
              // Silently continue (or could log if needed)
            }
          }
        } catch (enrollmentErr: any) {
          // Enrollment failure doesn't prevent student creation
          // But we report it as an error
          const enrollmentMessage =
            enrollmentErr instanceof AppError
              ? enrollmentErr.message
              : 'Failed to enroll student in group';
          if (errors.length < maxReportedErrors) {
            errors.push({
              rowIndex: index,
              message: `Student created but enrollment failed: ${enrollmentMessage}`,
            });
          }
        }
      }
    } catch (err: any) {
      const message =
        err instanceof AppError
          ? err.message
          : 'Failed to create student for this row';
      if (errors.length < maxReportedErrors) {
        errors.push({ rowIndex: index, message });
      }
    }
  }

  // Check if enrollment fields were used in mapping
  const hasEnrollmentFields = normalizedMapping.enrollment.groupName || 
                               normalizedMapping.enrollment.courseName || 
                               normalizedMapping.enrollment.status;

  return {
    successCount,
    enrollmentSuccessCount: (groupId || hasEnrollmentFields) ? enrollmentSuccessCount : undefined,
    errorCount: errors.length,
    totalRows: rows.length,
    errors,
  };
};

/**
 * Export students as a simple CSV string.
 * If groupId is provided, only exports students enrolled in that group.
 * If columns is provided, exports only those columns in the specified order.
 */
export const exportStudentsCsv = async (
  workspaceId: string,
  userId: string,
  groupId?: string,
  batchId?: string,
  columns?: string[],
  studentIds?: string[]
) => {
  // Build where clause
  const where: any = {
    workspaceId,
    isDeleted: false,
  };

  if (studentIds && studentIds.length > 0) {
    where.id = { in: studentIds };
  }

  // If groupId is provided, filter by enrollment
  if (groupId) {
    // Verify group exists and user has access
    const group = await prisma.group.findFirst({
      where: {
        id: groupId,
        workspaceId,
        isActive: true,
      },
    });

    if (!group) {
      throw new AppError(404, 'Group not found');
    }

    // Verify user has access to this group
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        userId,
        workspaceId,
      },
      include: {
        groupAccess: {
          where: { groupId },
        },
      },
    });

    if (!membership) {
      throw new AppError(403, 'Access denied');
    }

    if (membership.role !== 'ADMIN' && membership.groupAccess.length === 0) {
      throw new AppError(403, 'Access denied to this group');
    }

    // Filter students by enrollment in this group
    where.enrollments = {
      some: {
        groupId,
        isActive: true,
      },
    };
  }

  // If batchId is provided, filter by batch
  if (batchId) {
    // Verify batch exists
    const batch = await prisma.batch.findFirst({
      where: {
        id: batchId,
        workspaceId,
        isActive: true,
      },
    });

    if (!batch) {
      throw new AppError(404, 'Batch not found');
    }

    // Filter students by batch association
    where.studentBatches = {
      some: {
        batchId,
      },
    };
  }

  // Default columns if not specified
  const exportColumns = columns && columns.length > 0
    ? columns
    : ['student.name', 'student.email', 'phone.0', 'student.tags'];

  // Fetch students with related data
  const students = await prisma.student.findMany({
    where,
    include: {
      phones: {
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      },
      enrollments: {
        where: { isActive: true },
        include: {
          group: {
            select: { name: true },
          },
          course: {
            select: { name: true },
          },
        },
      },
      statuses: groupId
        ? {
            where: { groupId },
            include: {
              group: {
                select: { name: true },
              },
            },
          }
        : {
            include: {
              group: {
                select: { name: true },
              },
            },
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
    },
    orderBy: { createdAt: 'desc' },
  });

  // Generate headers based on requested columns
  const headers = exportColumns.map((col) => {
    if (col === 'student.name') return 'Name';
    if (col === 'student.email') return 'Email';
    if (col === 'student.tags') return 'Tags';
    if (col.startsWith('phone.')) {
      const phoneIndex = col.replace('phone.', '');
      if (phoneIndex === '0' || phoneIndex === 'primary') return 'Phone';
      return `Phone ${phoneIndex}`;
    }
    if (col === 'enrollment.groupName') return 'Group';
    if (col === 'enrollment.courseName') return 'Course';
    if (col === 'enrollment.status') return 'Status';
    if (col === 'batch.names') return 'Batch Names';
    if (col === 'batch.ids') return 'Batch IDs';
    return col;
  });

  const lines: string[] = [headers.join(',')];

  // Generate rows
  for (const student of students) {
    const fields: string[] = [];

    for (const col of exportColumns) {
      let value = '';

      if (col === 'student.name') {
        value = student.name || '';
      } else if (col === 'student.email') {
        value = student.email || '';
      } else if (col === 'student.tags') {
        value = (student.tags || []).join('|');
      } else if (col.startsWith('phone.')) {
        const phoneKey = col.replace('phone.', '');
        const phoneIndex = parseInt(phoneKey, 10);
        if (!isNaN(phoneIndex)) {
          // Indexed phone
          const phone = student.phones[phoneIndex];
          value = phone ? phone.phone : '';
        } else {
          // Named phone (primary, secondary, etc.)
          if (phoneKey === 'primary' || phoneKey === '0') {
            const primaryPhone = student.phones.find((p) => p.isPrimary) ?? student.phones[0];
            value = primaryPhone ? primaryPhone.phone : '';
          } else {
            // For other named phones, just use first available
            value = student.phones[0]?.phone || '';
          }
        }
      } else if (col === 'enrollment.groupName') {
        // Get first active enrollment's group name
        const enrollment = student.enrollments[0];
        value = enrollment?.group?.name || '';
      } else if (col === 'enrollment.courseName') {
        // Get first active enrollment's course name
        const enrollment = student.enrollments[0];
        value = enrollment?.course?.name || '';
      } else if (col === 'enrollment.status') {
        // Get status for the group (if groupId provided) or first status
        const status = groupId
          ? student.statuses.find((s) => s.groupId === groupId)
          : student.statuses[0];
        value = status?.status || '';
      } else if (col === 'batch.names') {
        // Get all batch names
        value = student.studentBatches.map((sb) => sb.batch.name).join('|');
      } else if (col === 'batch.ids') {
        // Get all batch IDs
        value = student.studentBatches.map((sb) => sb.batch.id).join('|');
      }

      fields.push(value);
    }

    // Escape CSV fields
    const escaped = fields.map((v) => {
      const str = String(v ?? '');
      if (str.includes('"') || str.includes(',') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });

    lines.push(escaped.join(','));
  }

  return lines.join('\n');
};

/**
 * Add student to a batch
 */
export const addStudentToBatch = async (
  studentId: string,
  workspaceId: string,
  userId: string,
  data: AddStudentToBatchInput
) => {
  // Verify student exists and belongs to workspace
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

  // Verify batch exists and belongs to workspace
  const batch = await prisma.batch.findFirst({
    where: {
      id: data.batchId,
      workspaceId,
    },
  });

  if (!batch) {
    throw new AppError(404, 'Batch not found');
  }

  // Verify user has access
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
  });

  if (!membership) {
    throw new AppError(403, 'Access denied');
  }

  // Create or get existing association (upsert to handle duplicates)
  const studentBatch = await prisma.studentBatch.upsert({
    where: {
      studentId_batchId: {
        studentId,
        batchId: data.batchId,
      },
    },
    update: {}, // Don't update if exists
    create: {
      studentId,
      batchId: data.batchId,
    },
    include: {
      batch: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return studentBatch;
};

/**
 * Remove student from a batch
 */
export const removeStudentFromBatch = async (
  studentId: string,
  batchId: string,
  workspaceId: string,
  userId: string
) => {
  // Verify student exists and belongs to workspace
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

  // Verify batch exists and belongs to workspace
  const batch = await prisma.batch.findFirst({
    where: {
      id: batchId,
      workspaceId,
    },
  });

  if (!batch) {
    throw new AppError(404, 'Batch not found');
  }

  // Verify user has access
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
  });

  if (!membership) {
    throw new AppError(403, 'Access denied');
  }

  // Remove association
  await prisma.studentBatch.deleteMany({
    where: {
      studentId,
      batchId,
    },
  });

  return { message: 'Student removed from batch successfully' };
};

/**
 * Get all batches for a student
 */
export const getStudentBatches = async (
  studentId: string,
  workspaceId: string,
  userId: string
) => {
  // Verify student exists and belongs to workspace
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

  // Verify user has access
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
  });

  if (!membership) {
    throw new AppError(403, 'Access denied');
  }

  // Get all batches for this student
  const studentBatches = await prisma.studentBatch.findMany({
    where: {
      studentId,
      batch: {
        workspaceId,
      },
    },
    include: {
      batch: {
        select: {
          id: true,
          name: true,
          description: true,
          startDate: true,
          endDate: true,
          isActive: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return studentBatches;
};

/**
 * Set all batches for a student (replace existing)
 */
export const setStudentBatches = async (
  studentId: string,
  workspaceId: string,
  userId: string,
  data: SetStudentBatchesInput
) => {
  // Verify student exists and belongs to workspace
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

  // Verify all batches exist and belong to workspace
  if (data.batchIds.length > 0) {
    const batches = await prisma.batch.findMany({
      where: {
        id: { in: data.batchIds },
        workspaceId,
      },
    });

    if (batches.length !== data.batchIds.length) {
      throw new AppError(400, 'One or more batches not found');
    }
  }

  // Verify user has access
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
  });

  if (!membership) {
    throw new AppError(403, 'Access denied');
  }

  // Remove all existing associations
  await prisma.studentBatch.deleteMany({
    where: {
      studentId,
    },
  });

  // Create new associations
  if (data.batchIds.length > 0) {
    await prisma.studentBatch.createMany({
      data: data.batchIds.map((batchId) => ({
        studentId,
        batchId,
      })),
    });
  }

  // Return updated list
  const studentBatches = await prisma.studentBatch.findMany({
    where: {
      studentId,
    },
    include: {
      batch: {
        select: {
          id: true,
          name: true,
          description: true,
          startDate: true,
          endDate: true,
          isActive: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return studentBatches;
};

/**
 * Get student statistics
 */
export const getStudentStats = async (studentId: string, workspaceId: string) => {
  // Verify student exists
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

  const now = new Date();
  const startOfWeek = getStartOfWeek(now);
  const startOfMonth = getStartOfMonth(now);
  const startOfDay = getStartOfDay(now);

  // Get all call logs for this student
  const allCallLogs = await prisma.callLog.findMany({
    where: {
      studentId,
      workspaceId,
    },
    orderBy: { callDate: 'desc' },
  });

  // Get call logs this week
  const callsThisWeek = allCallLogs.filter(
    (log) => new Date(log.callDate) >= startOfWeek
  );

  // Get call logs this month
  const callsThisMonth = allCallLogs.filter(
    (log) => new Date(log.callDate) >= startOfMonth
  );

  // Calculate average duration
  const durations = allCallLogs
    .map((log) => log.callDuration)
    .filter((d): d is number => d !== null && d !== undefined);
  const averageDuration =
    durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;

  // Most common call status
  const statusCounts: Record<string, number> = {};
  allCallLogs.forEach((log) => {
    statusCounts[log.status] = (statusCounts[log.status] || 0) + 1;
  });
  const mostCommonStatus =
    Object.keys(statusCounts).length > 0
      ? Object.entries(statusCounts).sort((a, b) => b[1] - a[1])[0][0]
      : null;

  // Call success rate (completed vs total)
  const completedCalls = allCallLogs.filter((log) => log.status === 'completed').length;
  const successRate =
    allCallLogs.length > 0 ? (completedCalls / allCallLogs.length) * 100 : 0;

  // Last call date
  const lastCallDate = allCallLogs.length > 0 ? allCallLogs[0].callDate : null;

  // Days since last call
  const daysSinceLastCall = lastCallDate
    ? Math.floor((now.getTime() - new Date(lastCallDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Get all follow-ups for this student
  const allFollowups = await prisma.followup.findMany({
    where: {
      studentId,
      workspaceId,
    },
    orderBy: { dueAt: 'asc' },
  });

  // Pending follow-ups
  const pendingFollowups = allFollowups.filter((f) => f.status === 'PENDING');

  // Overdue follow-ups (pending and due date is in the past)
  const overdueFollowups = pendingFollowups.filter(
    (f) => new Date(f.dueAt) < startOfDay
  );

  // Next follow-up date (first pending follow-up)
  const nextFollowUpDate =
    pendingFollowups.length > 0 ? pendingFollowups[0].dueAt : null;

  // Follow-up completion rate
  const completedFollowups = allFollowups.filter((f) => f.status === 'DONE').length;
  const followupCompletionRate =
    allFollowups.length > 0 ? (completedFollowups / allFollowups.length) * 100 : 0;

  // Calculate engagement metrics
  // Response rate: percentage of calls that were completed (vs missed/busy/no_answer)
  const respondedCalls = allCallLogs.filter(
    (log) => log.status === 'completed'
  ).length;
  const responseRate =
    allCallLogs.length > 0 ? (respondedCalls / allCallLogs.length) * 100 : 0;

  // Average time between calls (in days)
  let averageTimeBetweenCalls = 0;
  if (allCallLogs.length > 1) {
    const sortedCalls = [...allCallLogs].sort(
      (a, b) => new Date(a.callDate).getTime() - new Date(b.callDate).getTime()
    );
    const timeDiffs: number[] = [];
    for (let i = 1; i < sortedCalls.length; i++) {
      const diff =
        (new Date(sortedCalls[i].callDate).getTime() -
          new Date(sortedCalls[i - 1].callDate).getTime()) /
        (1000 * 60 * 60 * 24);
      timeDiffs.push(diff);
    }
    averageTimeBetweenCalls =
      timeDiffs.length > 0
        ? timeDiffs.reduce((sum, d) => sum + d, 0) / timeDiffs.length
        : 0;
  }

  // Calls per week (average over last 4 weeks)
  const fourWeeksAgo = new Date(now);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const callsLastFourWeeks = allCallLogs.filter(
    (log) => new Date(log.callDate) >= fourWeeksAgo
  );
  const callsPerWeek = callsLastFourWeeks.length / 4;

  // Calls per month (average over last 3 months)
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const callsLastThreeMonths = allCallLogs.filter(
    (log) => new Date(log.callDate) >= threeMonthsAgo
  );
  const callsPerMonth = callsLastThreeMonths.length / 3;

  return {
    calls: {
      total: allCallLogs.length,
      thisWeek: callsThisWeek.length,
      thisMonth: callsThisMonth.length,
      averageDuration: Math.round(averageDuration),
      lastCallDate: lastCallDate ? lastCallDate.toISOString() : null,
      daysSinceLastCall,
      successRate: Math.round(successRate * 100) / 100,
      byStatus: statusCounts,
    },
    followups: {
      total: allFollowups.length,
      pending: pendingFollowups.length,
      overdue: overdueFollowups.length,
      nextFollowUpDate: nextFollowUpDate ? nextFollowUpDate.toISOString() : null,
      completionRate: Math.round(followupCompletionRate * 100) / 100,
    },
    engagement: {
      responseRate: Math.round(responseRate * 100) / 100,
      averageTimeBetweenCalls: Math.round(averageTimeBetweenCalls * 100) / 100,
      callsPerWeek: Math.round(callsPerWeek * 100) / 100,
      callsPerMonth: Math.round(callsPerMonth * 100) / 100,
    },
  };
};
