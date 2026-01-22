import { prisma } from '../../db/client';
import { AppError } from '../../middleware/error-handler';
import { parseFile, ParseResult } from '../../utils/file-parser';
import { CommitCallListImportInput } from './call-list-import.schemas';

type ImportProgress = {
  phase:
    | 'PREVIEW'
    | 'READY'
    | 'MATCHING'
    | 'CREATING_STUDENTS'
    | 'WRITING_RELATIONS'
    | 'COMPLETED'
    | 'FAILED';
  totalRows: number;
  processedRows: number;
  matched: number;
  created: number;
  added: number;
  duplicates: number;
  errors: number;
  updatedAt: string;
};

const buildProgress = (partial: Partial<ImportProgress>, totalRows: number): ImportProgress => ({
  phase: partial.phase ?? 'READY',
  totalRows,
  processedRows: partial.processedRows ?? 0,
  matched: partial.matched ?? 0,
  created: partial.created ?? 0,
  added: partial.added ?? 0,
  duplicates: partial.duplicates ?? 0,
  errors: partial.errors ?? 0,
  updatedAt: new Date().toISOString(),
});

const chunkArray = <T,>(items: T[], size: number): T[][] => {
  if (size <= 0) return [items];
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

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
  let parsed: ParseResult;
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

  const emailsToMatch = Array.from(
    new Set(
      rowsToProcess
        .map((row) => row[suggestions.email || '']?.toString().trim().toLowerCase())
        .filter((email): email is string => Boolean(email))
    )
  );

  const phonesToMatch = Array.from(
    new Set(
      rowsToProcess
        .map((row) => row[suggestions.phone || '']?.toString().trim())
        .filter((phone): phone is string => Boolean(phone))
    )
  );

  const [matchedByEmail, matchedByPhone] = await Promise.all([
    emailsToMatch.length > 0
      ? prisma.student.findMany({
          where: { workspaceId, email: { in: emailsToMatch }, isDeleted: false },
          select: { id: true, email: true },
        })
      : Promise.resolve([]),
    phonesToMatch.length > 0
      ? prisma.studentPhone.findMany({
          where: { workspaceId, phone: { in: phonesToMatch }, student: { workspaceId, isDeleted: false } },
          include: { student: { select: { id: true } } },
        })
      : Promise.resolve([]),
  ]);

  const emailToStudentId = new Map<string, string>();
  matchedByEmail.forEach((student) => {
    if (student.email) emailToStudentId.set(student.email.toLowerCase(), student.id);
  });

  const phoneToStudentId = new Map<string, string>();
  matchedByPhone.forEach((studentPhone) => {
    phoneToStudentId.set(studentPhone.phone, studentPhone.student.id);
  });

  for (const row of rowsToProcess) {
    const name = row[suggestions.name || '']?.toString().trim();
    if (!name) {
      willSkip++;
      continue;
    }

    const email = row[suggestions.email || '']?.toString().trim().toLowerCase();
    const phone = row[suggestions.phone || '']?.toString().trim();

    const matchedStudentId = (email ? emailToStudentId.get(email) : undefined) ?? (phone ? phoneToStudentId.get(phone) : undefined);
    if (matchedStudentId) {
      if (existingStudentIds.has(matchedStudentId)) willSkip++;
      else willMatch++;
      continue;
    }

    willCreate++;
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

export const startCallListImportCommit = async (
  listId: string,
  workspaceId: string,
  userId: string,
  importId: string,
  data: CommitCallListImportInput
) => {
  const importRecord = await prisma.import.findFirst({
    where: { id: importId, workspaceId, status: 'PREVIEW' },
  });

  if (!importRecord) {
    throw new AppError(400, 'Import data not found. Please re-upload the file.');
  }

  const meta = importRecord.meta as any;
  if (!meta?.parsedData) {
    throw new AppError(400, 'Import data corrupted. Please re-upload the file.');
  }

  if (meta.callListId && meta.callListId !== listId) {
    throw new AppError(403, 'Import does not belong to this call list');
  }

  if (meta.userId && meta.userId !== userId) {
    throw new AppError(403, 'Import does not belong to this user');
  }

  const parsedData = meta.parsedData as ParseResult;
  const progress = buildProgress({ phase: 'READY', processedRows: 0 }, parsedData.totalRows ?? parsedData.rows.length);

  await prisma.import.update({
    where: { id: importId },
    data: {
      status: 'IN_PROGRESS',
      meta: {
        ...meta,
        commitSettings: data,
        cursor: { nextIndex: 0 },
        progress,
        stats: { matched: 0, created: 0, added: 0, duplicates: 0, errors: 0, errorMessages: [] as string[] },
      },
    },
  });

  return { importId, status: 'IN_PROGRESS', progress };
};

export const processCallListImportCommitChunk = async (
  listId: string,
  workspaceId: string,
  userId: string,
  importId: string,
  chunkSize = 50
) => {
  const importRecord = await prisma.import.findFirst({
    where: { id: importId, workspaceId },
  });

  if (!importRecord) {
    throw new AppError(404, 'Import not found');
  }

  const meta = importRecord.meta as any;
  if (!meta?.parsedData || !meta?.commitSettings) {
    throw new AppError(400, 'Import is not ready to process');
  }

  if (meta.callListId && meta.callListId !== listId) {
    throw new AppError(403, 'Import does not belong to this call list');
  }

  if (meta.userId && meta.userId !== userId) {
    throw new AppError(403, 'Import does not belong to this user');
  }

  const parsedData = meta.parsedData as ParseResult;
  const commitSettings = meta.commitSettings as CommitCallListImportInput;
  const cursor = meta.cursor as { nextIndex: number } | undefined;
  const nextIndex = cursor?.nextIndex ?? 0;
  const totalRows = parsedData.totalRows ?? parsedData.rows.length;

  const stats = (meta.stats as any) ?? { matched: 0, created: 0, added: 0, duplicates: 0, errors: 0, errorMessages: [] as string[] };
  const progress = buildProgress(meta.progress ?? {}, totalRows);

  if (importRecord.status === 'COMPLETED') {
    return {
      importId,
      status: 'COMPLETED',
      progress: buildProgress({ ...progress, phase: 'COMPLETED', processedRows: totalRows }, totalRows),
      result: { message: meta.resultMessage ?? 'Import completed', stats, errors: (stats.errorMessages || []).slice(0, 10) },
    };
  }

  if (importRecord.status !== 'IN_PROGRESS') {
    throw new AppError(400, `Import is not in progress (status=${importRecord.status})`);
  }

  const rows = parsedData.rows as Array<Record<string, any>>;
  const slice = rows.slice(nextIndex, Math.min(nextIndex + chunkSize, rows.length));
  if (slice.length === 0) {
    const completedProgress = buildProgress({ ...progress, phase: 'COMPLETED', processedRows: totalRows }, totalRows);
    await prisma.import.update({
      where: { id: importId },
      data: { status: 'COMPLETED', successCount: stats.added, duplicateCount: stats.duplicates, errorCount: stats.errors, meta: { ...meta, progress: completedProgress, resultMessage: meta.resultMessage ?? 'Import completed' } },
    });
    return {
      importId,
      status: 'COMPLETED',
      progress: completedProgress,
      result: { message: meta.resultMessage ?? 'Import completed', stats, errors: (stats.errorMessages || []).slice(0, 10) },
    };
  }

  const extractField = (row: Record<string, any>, columnName?: string): string | null => {
    if (!columnName) return null;
    const value = row[columnName];
    return typeof value === 'string' ? value.trim() : (value?.toString().trim() || null);
  };

  const rowEntries = slice.map((row, index) => {
    const rowNum = nextIndex + index + 2;
    const name = extractField(row, commitSettings.columnMapping.name);
    const emailRaw = extractField(row, commitSettings.columnMapping.email);
    const phoneRaw = extractField(row, commitSettings.columnMapping.phone);
    const email = emailRaw ? emailRaw.toLowerCase() : null;
    const phone = phoneRaw || null;
    return { row, rowNum, name, email, phone };
  });

  const errors: string[] = [];
  const validRows = rowEntries.filter((entry) => {
    if (!entry.name) {
      stats.errors++;
      const message = `Row ${entry.rowNum}: Name is required`;
      errors.push(message);
      stats.errorMessages = [...(stats.errorMessages || []), message].slice(0, 200);
      return false;
    }
    return true;
  });

  const emails = Array.from(new Set(validRows.map((entry) => entry.email).filter((email): email is string => Boolean(email))));
  const phones = Array.from(new Set(validRows.map((entry) => entry.phone).filter((phone): phone is string => Boolean(phone))));

  const [studentsByEmail, studentPhones] = await Promise.all([
    emails.length > 0 && (commitSettings.matchBy === 'email_or_phone' || commitSettings.matchBy === 'email')
      ? prisma.student.findMany({ where: { workspaceId, email: { in: emails }, isDeleted: false } })
      : Promise.resolve([]),
    phones.length > 0 && (commitSettings.matchBy === 'email_or_phone' || commitSettings.matchBy === 'phone')
      ? prisma.studentPhone.findMany({ where: { workspaceId, phone: { in: phones }, student: { workspaceId, isDeleted: false } }, include: { student: true } })
      : Promise.resolve([]),
  ]);

  const emailMap = new Map<string, any>();
  studentsByEmail.forEach((student) => {
    if (student.email) emailMap.set(student.email.toLowerCase(), student);
  });

  const phoneMap = new Map<string, any>();
  studentPhones.forEach((studentPhone) => phoneMap.set(studentPhone.phone, studentPhone.student));

  // Determine call list context only once per chunk
  const callList = await prisma.callList.findFirst({ where: { id: listId, workspaceId }, include: { group: { select: { batchId: true } } } });
  if (!callList) throw new AppError(404, 'Call list not found');

  const batchId = (callList.meta as any)?.batchId || callList.group?.batchId || null;
  const groupId = callList.groupId;

  // Process matches + create new students in this chunk
  const studentsToCreate = validRows
    .filter((entry) => {
      if (!commitSettings.createNewStudents) return false;
      const matched = (entry.email && emailMap.has(entry.email)) || (entry.phone && phoneMap.has(entry.phone));
      return !matched;
    })
    .map((entry) => ({ rowNum: entry.rowNum, name: entry.name as string, email: entry.email, phone: entry.phone }));

  const createdStudents: any[] = [];
  if (studentsToCreate.length > 0) {
    progress.phase = 'CREATING_STUDENTS';
    await prisma.import.update({ where: { id: importId }, data: { meta: { ...meta, progress } } });

    // Create students with limited concurrency by chunking
    const createChunks = chunkArray(studentsToCreate, 25);
    for (const createChunk of createChunks) {
      const results = await Promise.all(
        createChunk.map(async (studentData) => {
          try {
            const created = await prisma.student.create({
              data: { workspaceId, name: studentData.name, email: studentData.email || null },
            });
            stats.created++;
            return { ok: true as const, created, studentData };
          } catch (error: any) {
            stats.errors++;
            const message = `Row ${studentData.rowNum}: Failed to create student - ${error.message || 'Unknown error'}`;
            errors.push(message);
            stats.errorMessages = [...(stats.errorMessages || []), message].slice(0, 200);
            return { ok: false as const, studentData };
          }
        })
      );

      results.forEach((result) => {
        if (result.ok) createdStudents.push(result.created);
      });
    }

    createdStudents.forEach((student) => {
      if (student.email) emailMap.set(student.email.toLowerCase(), student);
    });
  }

  // For matched students, count them now (after creates are merged)
  validRows.forEach((entry) => {
    const matched = (entry.email && emailMap.has(entry.email)) || (entry.phone && phoneMap.has(entry.phone));
    if (matched) stats.matched++;
  });

  // Resolve studentId per row
  const studentIdByRowNum = new Map<number, string>();
  validRows.forEach((entry) => {
    const byEmail = entry.email ? emailMap.get(entry.email) : undefined;
    const byPhone = entry.phone ? phoneMap.get(entry.phone) : undefined;
    const student = byEmail ?? byPhone;
    if (student?.id) studentIdByRowNum.set(entry.rowNum, student.id);
  });

  const studentIds = Array.from(new Set(Array.from(studentIdByRowNum.values())));
  const existingCallListItems = studentIds.length > 0
    ? await prisma.callListItem.findMany({ where: { callListId: listId, studentId: { in: studentIds } }, select: { studentId: true } })
    : [];
  const alreadyInCallList = new Set(existingCallListItems.map((item) => item.studentId));

  const callListItemCreates = studentIds
    .filter((studentId) => !alreadyInCallList.has(studentId))
    .map((studentId) => ({ workspaceId, callListId: listId, studentId, state: 'QUEUED', priority: 0 }));

  const duplicatesCount = studentIds.length - callListItemCreates.length;
  stats.duplicates += duplicatesCount;

  progress.phase = 'WRITING_RELATIONS';
  await prisma.import.update({ where: { id: importId }, data: { meta: { ...meta, progress } } });

  // Write relations in chunked bulk operations
  const writeOps: Array<{
    name: string;
    promise: Promise<any>;
    onSuccess?: (result: any) => void;
  }> = [];

  const [
    existingStudentGroupStatuses,
    existingEnrollments,
    existingStudentBatches,
  ] = await Promise.all([
    groupId && studentIds.length > 0
      ? prisma.studentGroupStatus.findMany({ where: { groupId, studentId: { in: studentIds } }, select: { studentId: true } })
      : Promise.resolve([]),
    groupId && studentIds.length > 0
      ? prisma.enrollment.findMany({
          where: { groupId, studentId: { in: studentIds }, courseId: null, moduleId: null },
          select: { studentId: true },
        })
      : Promise.resolve([]),
    batchId && studentIds.length > 0
      ? prisma.studentBatch.findMany({ where: { batchId, studentId: { in: studentIds } }, select: { studentId: true } })
      : Promise.resolve([]),
  ]);

  const existingStudentGroupStatusStudentIds = new Set(existingStudentGroupStatuses.map((s) => s.studentId));
  const studentGroupStatusCreates =
    groupId && studentIds.length > 0
      ? studentIds
          .filter((studentId) => !existingStudentGroupStatusStudentIds.has(studentId))
          .map((studentId) => ({ studentId, groupId, status: 'NEW' }))
      : [];

  const existingEnrollmentStudentIds = new Set(existingEnrollments.map((e) => e.studentId));
  const enrollmentCreates =
    groupId && studentIds.length > 0
      ? studentIds
          .filter((studentId) => !existingEnrollmentStudentIds.has(studentId))
          .map((studentId) => ({ studentId, groupId, courseId: null, moduleId: null, isActive: true }))
      : [];

  const existingStudentBatchStudentIds = new Set(existingStudentBatches.map((b) => b.studentId));
  const studentBatchCreates =
    batchId && studentIds.length > 0
      ? studentIds.filter((studentId) => !existingStudentBatchStudentIds.has(studentId)).map((studentId) => ({ studentId, batchId }))
      : [];

  const phonesFromRows = validRows
    .filter((entry) => entry.phone && studentIdByRowNum.has(entry.rowNum))
    .map((entry) => ({
      studentId: studentIdByRowNum.get(entry.rowNum) as string,
      workspaceId,
      phone: entry.phone as string,
      isPrimary: true,
    }));

  const phoneCreateByPhone = new Map<string, (typeof phonesFromRows)[number]>();
  phonesFromRows.forEach((row) => {
    if (!phoneCreateByPhone.has(row.phone)) phoneCreateByPhone.set(row.phone, row);
  });
  const uniquePhonesToCreate = Array.from(phoneCreateByPhone.values());
  const uniquePhones = uniquePhonesToCreate.map((p) => p.phone);
  const existingPhoneSet = new Set<string>(
    uniquePhones.length > 0
      ? (
          await prisma.studentPhone.findMany({
            where: { workspaceId, phone: { in: uniquePhones } },
            select: { phone: true },
          })
        ).map((p) => p.phone)
      : []
  );

  const studentPhoneCreates = uniquePhonesToCreate.filter((p) => !existingPhoneSet.has(p.phone));

  if (callListItemCreates.length > 0) {
    writeOps.push({
      name: 'callListItem.createMany',
      promise: prisma.callListItem.createMany({ data: callListItemCreates as any } as any),
      onSuccess: (result) => {
        stats.added += typeof result?.count === 'number' ? result.count : callListItemCreates.length;
      },
    });
  }

  if (groupId && studentIds.length > 0) {
    if (studentGroupStatusCreates.length > 0) {
      writeOps.push({
        name: 'studentGroupStatus.createMany',
        promise: prisma.studentGroupStatus.createMany({ data: studentGroupStatusCreates as any } as any),
      });
    }

    writeOps.push({
      name: 'enrollment.updateMany',
      promise: prisma.enrollment.updateMany({
        where: { studentId: { in: studentIds }, groupId, courseId: null, moduleId: null },
        data: { isActive: true },
      }),
    });

    if (enrollmentCreates.length > 0) {
      writeOps.push({
        name: 'enrollment.createMany',
        promise: prisma.enrollment.createMany({ data: enrollmentCreates as any } as any),
      });
    }
  }

  if (batchId && studentIds.length > 0 && studentBatchCreates.length > 0) {
    writeOps.push({
      name: 'studentBatch.createMany',
      promise: prisma.studentBatch.createMany({ data: studentBatchCreates as any } as any),
    });
  }

  if (studentPhoneCreates.length > 0) {
    writeOps.push({
      name: 'studentPhone.createMany',
      promise: prisma.studentPhone.createMany({ data: studentPhoneCreates as any } as any),
    });
  }

  const writeResults = await Promise.allSettled(writeOps.map((op) => op.promise));
  writeResults.forEach((result, index) => {
    const op = writeOps[index];
    if (result.status === 'fulfilled') {
      op.onSuccess?.(result.value);
      return;
    }

    stats.errors++;
    const message = `Batch write error (${op.name}): ${result.reason?.message || result.reason || 'Unknown error'}`;
    errors.push(message);
    stats.errorMessages = [...(stats.errorMessages || []), message].slice(0, 200);
  });

  const processedRows = nextIndex + slice.length;
  const updatedProgress = buildProgress(
    {
      phase: processedRows >= rows.length ? 'COMPLETED' : 'WRITING_RELATIONS',
      processedRows,
      matched: stats.matched,
      created: stats.created,
      added: stats.added,
      duplicates: stats.duplicates,
      errors: stats.errors,
    },
    totalRows
  );

  const resultMessage = `Import in progress: ${stats.matched} matched, ${stats.created} created, ${stats.added} added, ${stats.duplicates} duplicates, ${stats.errors} errors`;

  const nextStatus = processedRows >= rows.length ? 'COMPLETED' : 'IN_PROGRESS';
  await prisma.import.update({
    where: { id: importId },
    data: {
      status: nextStatus,
      successCount: stats.added,
      duplicateCount: stats.duplicates,
      errorCount: stats.errors,
      meta: {
        ...meta,
        cursor: { nextIndex: processedRows },
        progress: updatedProgress,
        stats,
        resultMessage,
      },
    },
  });

  if (nextStatus === 'COMPLETED') {
    return {
      importId,
      status: 'COMPLETED',
      progress: updatedProgress,
      result: { message: `Import completed: ${stats.matched} matched, ${stats.created} created, ${stats.added} added, ${stats.duplicates} duplicates, ${stats.errors} errors`, stats, errors: (stats.errorMessages || []).slice(0, 10) },
    };
  }

  return { importId, status: 'IN_PROGRESS', progress: updatedProgress };
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

