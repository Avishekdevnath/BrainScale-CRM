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

  // Search query (name, email, or phone)
  if (options.q) {
    where.OR = [
      { name: { contains: options.q, mode: 'insensitive' } },
      ...(options.q.includes('@') ? [{ email: { contains: options.q, mode: 'insensitive' } }] : []),
      {
        phones: {
          some: {
            phone: { contains: options.q },
          },
        },
      },
    ];
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

  // Get timeline (calls and follow-ups)
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

    try {
      const student = await createStudent(workspaceId, {
        name: studentData.name,
        email: studentData.email,
        discordId: studentData.discordId,
        tags: studentData.tags,
        phones,
      });
      createdStudentId = student.id;
      successCount += 1;

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
  columns?: string[]
) => {
  // Build where clause
  const where: any = {
    workspaceId,
    isDeleted: false,
  };

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


