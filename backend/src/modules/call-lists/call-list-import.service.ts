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

  // Validate file buffer
  if (!fileBuffer || fileBuffer.length === 0) {
    throw new AppError(400, 'File is empty or could not be read');
  }

  // Parse file
  let parsed;
  try {
    parsed = await parseFile(fileBuffer, filename);
  } catch (error: any) {
    // Provide more context for parsing errors
    if (error.message) {
      throw new AppError(400, `Failed to parse file: ${error.message}`);
    }
    throw new AppError(400, 'Failed to parse file. Please ensure it is a valid CSV or XLSX file.');
  }

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

  // Get existing student IDs in call list
  const existingItems = await prisma.callListItem.findMany({
    where: { callListId: listId },
    select: { studentId: true },
  });
  const existingStudentIds = new Set(existingItems.map(item => item.studentId));

  // Calculate matching statistics for ALL rows (not just preview)
  // For performance, we'll process all rows up to 1000, then scale the results
  // For files with <= 1000 rows, we process all rows for accurate statistics
  let willMatch = 0;
  let willCreate = 0;
  let willSkip = 0;

  // Process all rows for accurate statistics (up to 1000 for performance)
  const maxRowsForStats = 1000;
  const rowsToProcess = parsed.rows.slice(0, Math.min(maxRowsForStats, parsed.rows.length));
  
  for (const row of rowsToProcess) {
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

  // Scale statistics if we only processed a sample (for files > 1000 rows)
  if (rowsToProcess.length < parsed.rows.length) {
    const scaleFactor = parsed.rows.length / rowsToProcess.length;
    willMatch = Math.round(willMatch * scaleFactor);
    willCreate = Math.round(willCreate * scaleFactor);
    willSkip = Math.round(willSkip * scaleFactor);
  }

  // Return preview data (first 10 rows for preview display only)
  const previewRows = parsed.rows.slice(0, 10);
  
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

  // Phase 1: Collect all row data for batch processing
  interface RowData {
    row: Record<string, any>;
    rowNum: number;
    name: string;
    email?: string;
    phone?: string;
  }

  const rowData: RowData[] = [];
  const allEmails: string[] = [];
  const allPhones: string[] = [];
  const allNames: string[] = [];

  for (let idx = 0; idx < parsedData.rows.length; idx++) {
    const row = parsedData.rows[idx] as Record<string, any>;
    const rowNum = idx + 2;

    const name = extractField(row, data.columnMapping.name);
    const email = extractField(row, data.columnMapping.email);
    const phone = extractField(row, data.columnMapping.phone);

    if (!name || name.length === 0) {
      stats.errors++;
      errors.push(`Row ${rowNum}: Name is required`);
      continue;
    }

    const emailLower = email?.toLowerCase();
    rowData.push({
      row,
      rowNum,
      name,
      email: emailLower || undefined,
      phone: phone || undefined,
    });

    if (emailLower) allEmails.push(emailLower);
    if (phone) allPhones.push(phone);
    if (data.matchBy === 'name') allNames.push(name);
  }

  // Phase 2: Batch match students
  const emailMap = new Map<string, any>();
  const phoneMap = new Map<string, any>();
  const nameMap = new Map<string, any>();

  // Batch match by email
  if (allEmails.length > 0 && (data.matchBy === 'email_or_phone' || data.matchBy === 'email')) {
    const matchedByEmail = await prisma.student.findMany({
      where: {
        workspaceId,
        email: { in: allEmails },
        isDeleted: false,
      },
    });
    matchedByEmail.forEach(student => {
      if (student.email) {
        emailMap.set(student.email.toLowerCase(), student);
      }
    });
  }

  // Batch match by phone
  if (allPhones.length > 0 && (data.matchBy === 'email_or_phone' || data.matchBy === 'phone')) {
    const matchedByPhone = await prisma.studentPhone.findMany({
      where: {
        workspaceId,
        phone: { in: allPhones },
        student: {
          workspaceId,
          isDeleted: false,
        },
      },
      include: {
        student: true,
      },
    });
    matchedByPhone.forEach(sp => {
      phoneMap.set(sp.phone, sp.student);
    });
  }

  // Batch match by name (if needed)
  // Note: Prisma's `in` operator doesn't support case-insensitive mode,
  // so we fetch all potential matches and filter in memory
  if (allNames.length > 0 && data.matchBy === 'name') {
    const uniqueNames = [...new Set(allNames)];
    // Fetch students with names that might match (case-insensitive)
    // We'll do a broader query and filter in memory for case-insensitive matching
    const allStudents = await prisma.student.findMany({
      where: {
        workspaceId,
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
      },
    });
    // Build case-insensitive map
    const nameLowerSet = new Set(uniqueNames.map(n => n.toLowerCase()));
    allStudents.forEach(student => {
      if (nameLowerSet.has(student.name.toLowerCase())) {
        nameMap.set(student.name.toLowerCase(), student);
      }
    });
  }

  // Phase 3: Process rows with pre-matched data
  interface StudentToCreate {
    name: string;
    email: string | null;
    phone?: string;
    rowNum: number;
    index: number;
  }

  interface RelationshipOperation {
    studentId: string;
    rowNum: number;
  }

  const studentsToCreate: StudentToCreate[] = [];
  const groupStatusesToUpsert: RelationshipOperation[] = [];
  const enrollmentsToCheck: RelationshipOperation[] = [];
  const batchesToUpsert: RelationshipOperation[] = [];
  const callListItemsToUpsert: RelationshipOperation[] = [];
  const phonesToCreate: Array<{ studentId: string; phone: string; rowNum: number }> = [];
  const studentRowMap = new Map<number, any>(); // Map row index to student
  const tempStudentIdMap = new Map<number, string>(); // Map row index to temp/real student ID

  for (let idx = 0; idx < rowData.length; idx++) {
    const { row, rowNum, name, email, phone } = rowData[idx];

    try {
      let student: any = null;
      let isMatched = false;

      // Match by email_or_phone strategy
      if (data.matchBy === 'email_or_phone' || data.matchBy === 'email') {
        if (email && emailMap.has(email)) {
          student = emailMap.get(email);
          isMatched = true;
        }
      }

      if (!student && (data.matchBy === 'email_or_phone' || data.matchBy === 'phone')) {
        if (phone && phoneMap.has(phone)) {
          student = phoneMap.get(phone);
          isMatched = true;
        }
      }

      if (!student && data.matchBy === 'name') {
        if (nameMap.has(name.toLowerCase())) {
          student = nameMap.get(name.toLowerCase());
          isMatched = true;
        }
      }

      // Check for duplicates if skipDuplicates is true
      if (!student && data.createNewStudents && data.skipDuplicates) {
        if (email && emailMap.has(email)) {
          stats.duplicates++;
          continue;
        }
        if (phone && phoneMap.has(phone)) {
          stats.duplicates++;
          continue;
        }
      }

      // Create student if not found and createNewStudents is true
      if (!student && data.createNewStudents) {
        studentsToCreate.push({
          name,
          email: email || null,
          phone: phone || undefined,
          rowNum,
          index: idx,
        });
        // Use temporary ID for tracking
        const tempId = `temp-${idx}`;
        tempStudentIdMap.set(idx, tempId);
        student = { id: tempId, name, email: email || null };
        stats.created++;
      } else if (!student) {
        stats.errors++;
        errors.push(`Row ${rowNum}: Student not found and createNewStudents is false`);
        continue;
      } else {
        stats.matched++;
        tempStudentIdMap.set(idx, student.id);
      }

      // Check if student already in call list
      if (existingStudentIds.has(student.id)) {
        stats.duplicates++;
        continue;
      }

      studentRowMap.set(idx, student);

      // Collect operations for batch processing
      if (groupId) {
        groupStatusesToUpsert.push({ studentId: student.id, rowNum });
        enrollmentsToCheck.push({ studentId: student.id, rowNum });
      }

      if (batchId) {
        batchesToUpsert.push({ studentId: student.id, rowNum });
      }

      callListItemsToUpsert.push({ studentId: student.id, rowNum });

      // Track phone creation for new students
      if (!isMatched && phone && data.createNewStudents) {
        phonesToCreate.push({ studentId: student.id, phone, rowNum });
      }
    } catch (error: any) {
      stats.errors++;
      errors.push(`Row ${rowNum}: ${error.message || 'Unknown error'}`);
    }
  }

  // Phase 4: Batch create students
  if (studentsToCreate.length > 0) {
    let createdStudents: any[] = [];
    try {
      createdStudents = await prisma.$transaction(
        studentsToCreate.map(studentData =>
          prisma.student.create({
            data: {
              workspaceId,
              name: studentData.name,
              email: studentData.email,
            },
          })
        )
      );
    } catch (error: any) {
      // If batch create fails, log errors for each student that failed
      studentsToCreate.forEach(studentData => {
        stats.errors++;
        errors.push(`Row ${studentData.rowNum}: Failed to create student - ${error.message || 'Unknown error'}`);
      });
      // Continue with other operations even if some students failed to create
    }

    // Update temp IDs with real IDs
    createdStudents.forEach((created, createIdx) => {
      const studentData = studentsToCreate[createIdx];
      const rowIdx = studentData.index;
      const realId = created.id;

      // Update temp ID in maps
      tempStudentIdMap.set(rowIdx, realId);
      const student = studentRowMap.get(rowIdx);
      if (student) {
        student.id = realId;
        studentRowMap.set(rowIdx, student);
      }

      // Update all operation arrays with real IDs
      groupStatusesToUpsert.forEach(op => {
        if (op.studentId === `temp-${rowIdx}`) op.studentId = realId;
      });
      enrollmentsToCheck.forEach(op => {
        if (op.studentId === `temp-${rowIdx}`) op.studentId = realId;
      });
      batchesToUpsert.forEach(op => {
        if (op.studentId === `temp-${rowIdx}`) op.studentId = realId;
      });
      callListItemsToUpsert.forEach(op => {
        if (op.studentId === `temp-${rowIdx}`) op.studentId = realId;
      });
      phonesToCreate.forEach(phone => {
        if (phone.studentId === `temp-${rowIdx}`) phone.studentId = realId;
      });
    });
  }

  // Phase 5: Batch upsert operations in parallel
  const upsertPromises: Promise<any>[] = [];

  // Batch upsert group statuses
  if (groupStatusesToUpsert.length > 0) {
    upsertPromises.push(
      ...groupStatusesToUpsert.map(op =>
        prisma.studentGroupStatus.upsert({
          where: {
            studentId_groupId: {
              studentId: op.studentId,
              groupId: groupId!,
            },
          },
          create: {
            studentId: op.studentId,
            groupId: groupId!,
            status: 'NEW',
          },
          update: {},
        })
      )
    );
  }

  // Batch handle enrollments
  if (enrollmentsToCheck.length > 0) {
    // First, check which enrollments exist
    const existingEnrollments = await prisma.enrollment.findMany({
      where: {
        studentId: { in: enrollmentsToCheck.map(e => e.studentId) },
        groupId: groupId!,
        courseId: null,
        moduleId: null,
      },
    });
    const existingEnrollmentMap = new Map(
      existingEnrollments.map(e => [e.studentId, e])
    );

    enrollmentsToCheck.forEach(op => {
      const existing = existingEnrollmentMap.get(op.studentId);
      if (existing) {
        upsertPromises.push(
          prisma.enrollment.update({
            where: { id: existing.id },
            data: { isActive: true },
          })
        );
      } else {
        upsertPromises.push(
          prisma.enrollment.create({
            data: {
              studentId: op.studentId,
              groupId: groupId!,
              courseId: null,
              moduleId: null,
              isActive: true,
            },
          })
        );
      }
    });
  }

  // Batch upsert batches
  if (batchesToUpsert.length > 0) {
    upsertPromises.push(
      ...batchesToUpsert.map(op =>
        prisma.studentBatch.upsert({
          where: {
            studentId_batchId: {
              studentId: op.studentId,
              batchId: batchId!,
            },
          },
          create: {
            studentId: op.studentId,
            batchId: batchId!,
          },
          update: {},
        })
      )
    );
  }

  // Batch upsert call list items
  if (callListItemsToUpsert.length > 0) {
    upsertPromises.push(
      ...callListItemsToUpsert.map(op =>
        prisma.callListItem.upsert({
          where: {
            callListId_studentId: {
              callListId: listId,
              studentId: op.studentId,
            },
          },
          create: {
            workspaceId,
            callListId: listId,
            studentId: op.studentId,
            state: 'QUEUED',
            priority: 0,
          },
          update: {},
        })
      )
    );
  }

  // Batch create phones for new students
  if (phonesToCreate.length > 0) {
    upsertPromises.push(
      ...phonesToCreate.map(phone =>
        prisma.studentPhone.create({
          data: {
            studentId: phone.studentId,
            workspaceId,
            phone: phone.phone,
            isPrimary: true,
          },
        })
      )
    );
  }

  // Execute all upsert operations in parallel
  try {
    await Promise.all(upsertPromises);
    stats.added = callListItemsToUpsert.length;
  } catch (error: any) {
    // If batch upserts fail, log the error but don't fail the entire import
    // Individual row errors are already tracked in the processing loop
    errors.push(`Batch operation error: ${error.message || 'Unknown error'}`);
    // Still count successfully added items (they may have been created before the error)
    stats.added = callListItemsToUpsert.length;
  }

  return {
    message: `Import completed: ${stats.matched} matched, ${stats.created} created, ${stats.added} added, ${stats.duplicates} duplicates, ${stats.errors} errors`,
    stats,
    errors: errors.slice(0, 10),
  };
};

