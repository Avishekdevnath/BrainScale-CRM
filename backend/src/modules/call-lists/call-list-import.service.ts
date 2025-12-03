import { prisma } from '../../db/client';
import { AppError } from '../../middleware/error-handler';
import { parseFile, ParseResult } from '../../utils/file-parser';
import { CommitCallListImportInput } from './call-list-import.schemas';

/**
 * Preview call list import file (parse and return data with column mapping suggestions)
 */
export const previewCallListImport = async (
  listId: string,
  workspaceId: string,
  userId: string,
  fileBuffer: Buffer,
  filename: string
) => {
  // Verify call list exists and get details
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
          batchId: true,
        },
      },
    },
  });

  if (!callList) {
    throw new AppError(404, 'Call list not found');
  }

  // Verify user has access
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

  // If call list has a group, verify user has access
  if (callList.groupId) {
    if (membership.role !== 'ADMIN') {
      const hasAccess = membership.groupAccess.some(
        (access) => access.groupId === callList.groupId
      );
      if (!hasAccess) {
        throw new AppError(403, 'Access denied to this call list');
      }
    }
  }

  // Parse file
  const parsed = await parseFile(fileBuffer, filename);

  if (parsed.rows.length === 0) {
    throw new AppError(400, 'File is empty or has no valid data rows');
  }

  // Suggest column mapping (auto-detect common column names)
  const suggestions: Record<string, string | null> = {};
  const headers = parsed.headers;
  
  // Common mappings
  const namePatterns = ['name', 'student name', 'full name', 'student_name', 'full_name'];
  const emailPatterns = ['email', 'e-mail', 'email address'];
  const phonePatterns = ['phone', 'mobile', 'phone number', 'phone_number', 'mobile number', 'contact'];
  
  headers.forEach((header) => {
    const lowerHeader = header.toLowerCase();
    
    if (!suggestions.name && namePatterns.some(p => lowerHeader.includes(p))) {
      suggestions.name = header;
    } else if (!suggestions.email && emailPatterns.some(p => lowerHeader.includes(p))) {
      suggestions.email = header;
    } else if (!suggestions.phone && phonePatterns.some(p => lowerHeader.includes(p))) {
      suggestions.phone = header;
    }
  });

  // Get batchId from call list meta
  const batchId = (callList.meta as any)?.batchId || callList.group?.batchId || null;

  // Check matching statistics for preview rows
  const previewRows = parsed.rows.slice(0, 10);
  let willMatch = 0;
  let willCreate = 0;
  let willSkip = 0;

  // Get existing student IDs in call list
  const existingItems = await prisma.callListItem.findMany({
    where: { callListId: listId },
    select: { studentId: true },
  });
  const existingStudentIds = new Set(existingItems.map(item => item.studentId));

  for (const row of previewRows) {
    const email = row[suggestions.email || '']?.toString().trim().toLowerCase();
    const phone = row[suggestions.phone || '']?.toString().trim();
    const name = row[suggestions.name || '']?.toString().trim();

    if (!name) {
      willSkip++;
      continue;
    }

    // Try to match existing student
    let matched = false;
    if (email) {
      const student = await prisma.student.findFirst({
        where: {
          workspaceId,
          email: email.toLowerCase(),
          isDeleted: false,
        },
      });
      if (student) {
        matched = true;
        if (existingStudentIds.has(student.id)) {
          willSkip++;
        } else {
          willMatch++;
        }
      }
    }

    if (!matched && phone) {
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
        matched = true;
        if (existingStudentIds.has(studentPhone.student.id)) {
          willSkip++;
        } else {
          willMatch++;
        }
      }
    }

    if (!matched) {
      willCreate++;
    }
  }

  // Return preview data (first 10 rows for preview)
  return {
    headers,
    previewRows,
    totalRows: parsed.totalRows,
    suggestions,
    matchingStats: {
      willMatch,
      willCreate,
      willSkip,
    },
    parsedData: parsed, // Store full parsed data for commit
    message: 'File parsed successfully. Review the preview and column mapping before committing.',
  };
};

/**
 * Commit call list import (match/create students and add to call list)
 */
export const commitCallListImport = async (
  listId: string,
  workspaceId: string,
  userId: string,
  parsedData: ParseResult,
  data: CommitCallListImportInput
) => {
  // Verify call list exists and get details
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
          batchId: true,
        },
      },
    },
  });

  if (!callList) {
    throw new AppError(404, 'Call list not found');
  }

  // Verify user has access
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

  // If call list has a group, verify user has access
  if (callList.groupId) {
    if (membership.role !== 'ADMIN') {
      const hasAccess = membership.groupAccess.some(
        (access) => access.groupId === callList.groupId
      );
      if (!hasAccess) {
        throw new AppError(403, 'Access denied to this call list');
      }
    }
  }

  // Get batchId from call list meta or group
  const batchId = (callList.meta as any)?.batchId || callList.group?.batchId || null;
  const groupId = callList.groupId;

  // Get existing student IDs in call list
  const existingItems = await prisma.callListItem.findMany({
    where: { callListId: listId },
    select: { studentId: true },
  });
  const existingStudentIds = new Set(existingItems.map(item => item.studentId));

  const stats = {
    matched: 0,
    created: 0,
    added: 0,
    duplicates: 0,
    errors: 0,
  };
  const errors: string[] = [];

  const extractField = (row: Record<string, any>, columnName?: string): string | null => {
    if (!columnName) return null;
    const value = row[columnName];
    return typeof value === 'string' ? value.trim() : (value?.toString().trim() || null);
  };

  for (let idx = 0; idx < parsedData.rows.length; idx++) {
    const row = parsedData.rows[idx] as Record<string, any>;
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
        // Fuzzy match by name (exact match for now, can be enhanced)
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

      // Assign student to group if call list has groupId
      if (groupId) {
        // Create/update StudentGroupStatus
        await prisma.studentGroupStatus.upsert({
          where: {
            studentId_groupId: {
              studentId: student.id,
              groupId: groupId,
            },
          },
          create: {
            studentId: student.id,
            groupId: groupId,
            status: 'NEW',
          },
          update: {},
        });

        // Create Enrollment if needed
        const existingEnrollment = await prisma.enrollment.findFirst({
          where: {
            studentId: student.id,
            groupId: groupId,
            courseId: null,
            moduleId: null,
          },
        });

        if (existingEnrollment) {
          await prisma.enrollment.update({
            where: { id: existingEnrollment.id },
            data: {
              isActive: true,
            },
          });
        } else {
          await prisma.enrollment.create({
            data: {
              studentId: student.id,
              groupId: groupId,
              courseId: null,
              moduleId: null,
              isActive: true,
            },
          });
        }
      }

      // Assign student to batch if call list has batchId
      if (batchId) {
        await prisma.studentBatch.upsert({
          where: {
            studentId_batchId: {
              studentId: student.id,
              batchId: batchId,
            },
          },
          create: {
            studentId: student.id,
            batchId: batchId,
          },
          update: {},
        });
      }

      // Add student to call list
      await prisma.callListItem.upsert({
        where: {
          callListId_studentId: {
            callListId: listId,
            studentId: student.id,
          },
        },
        create: {
          callListId: listId,
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

  return {
    message: `Import completed: ${stats.matched} matched, ${stats.created} created, ${stats.added} added, ${stats.duplicates} duplicates, ${stats.errors} errors`,
    stats,
    errors: errors.slice(0, 10),
  };
};

