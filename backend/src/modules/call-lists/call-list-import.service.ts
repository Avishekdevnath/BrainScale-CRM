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

const updateIncludeCallerNotes = async (
  listId: string,
  workspaceId: string,
  settings: CommitCallListImportInput | undefined
) => {
  if (!settings || settings.includeCallerNotes === undefined || !listId) return;
  const callList = await prisma.callList.findFirst({ where: { id: listId, workspaceId } });
  if (!callList) return;
  const currentMeta = (callList.meta as Record<string, any>) || {};
  await prisma.callList.update({
    where: { id: listId },
    data: { meta: { ...currentMeta, includeCallerNotes: settings.includeCallerNotes } },
  });
};

const chunkArray = <T,>(items: T[], size: number): T[][] => {
  if (size <= 0) return [items];
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const normalizeColumnKey = (key: string) => key.trim().toLowerCase();

const extractMappedField = (row: Record<string, any>, columnName?: string): string | null => {
  if (!columnName) return null;

  const direct = row[columnName];
  if (direct !== undefined && direct !== null) {
    return typeof direct === 'string' ? direct.trim() : direct.toString().trim();
  }

  // Fallback for small header formatting differences (extra spaces/case changes).
  const normalizedTarget = normalizeColumnKey(columnName);
  const matchedKey = Object.keys(row).find((key) => normalizeColumnKey(key) === normalizedTarget);
  if (!matchedKey) return null;

  const fallback = row[matchedKey];
  if (fallback === undefined || fallback === null) return null;
  return typeof fallback === 'string' ? fallback.trim() : fallback.toString().trim();
};

const selectBestStudentCandidate = (candidates: any[], preferredPhone?: string | null) => {
  if (!candidates || candidates.length === 0) return undefined;
  if (preferredPhone) {
    const byExactPhone = candidates.find((candidate) =>
      (candidate.phones || []).some((p: any) => p.phone === preferredPhone)
    );
    if (byExactPhone) return byExactPhone;
  }

  const withAnyPhone = candidates.find((candidate) => (candidate.phones || []).length > 0);
  if (withAnyPhone) return withAnyPhone;

  return candidates[0];
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
  const startedAt = Date.now();
  console.info('[callListImport.preview] service:start', {
    listId,
    workspaceId,
    userId,
    filename,
    fileBytes: fileBuffer?.length ?? 0,
  });
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

  console.info('[callListImport.preview] service:callList', { ms: Date.now() - startedAt });

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

  console.info('[callListImport.preview] service:membership', { ms: Date.now() - startedAt });

  // Workspace membership is sufficient for call list create/update operations.

  // Validate file buffer
  if (!fileBuffer || fileBuffer.length === 0) {
    throw new AppError(400, 'File is empty or could not be read');
  }

  // Parse file
  let parsed: ParseResult;
  try {
    const parseAt = Date.now();
    parsed = await parseFile(fileBuffer, filename);
    console.info('[callListImport.preview] service:parsed', {
      ms: Date.now() - parseAt,
      totalRows: parsed.totalRows,
      headers: parsed.headers.length,
    });
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

  console.info('[callListImport.preview] service:matched', { ms: Date.now() - startedAt });

  // Only check duplicates-in-call-list for students that appear in the preview sample.
  // Loading all callListItem rows for large call lists makes preview feel "stuck".
  const candidateMatchedStudentIds = Array.from(
    new Set<string>([...emailToStudentId.values(), ...phoneToStudentId.values()])
  );
  const existingMatchedIds = candidateMatchedStudentIds.length
    ? await prisma.callListItem.findMany({
        where: { callListId: listId, studentId: { in: candidateMatchedStudentIds } },
        select: { studentId: true },
      })
    : [];
  const existingMatchedStudentIds = new Set(existingMatchedIds.map((i) => i.studentId));

  console.info('[callListImport.preview] service:dedupeCheck', { ms: Date.now() - startedAt });

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
      if (existingMatchedStudentIds.has(matchedStudentId)) willSkip++;
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

  // Return all rows for the preview table (user wants to inspect full data)
  const previewRows = parsed.rows;
  
  console.info('[callListImport.preview] service:done', { ms: Date.now() - startedAt });
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
  chunkSize = 500
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
    
    await updateIncludeCallerNotes(listId, workspaceId, meta.commitSettings as CommitCallListImportInput | undefined);

    return {
      importId,
      status: 'COMPLETED',
      progress: completedProgress,
      result: { message: meta.resultMessage ?? 'Import completed', stats, errors: (stats.errorMessages || []).slice(0, 10) },
    };
  }

  const rowEntries = slice.map((row, index) => {
    const rowNum = nextIndex + index + 2;
    const name = extractMappedField(row, commitSettings.columnMapping.name);
    const emailRaw = extractMappedField(row, commitSettings.columnMapping.email);
    const phoneRaw = extractMappedField(row, commitSettings.columnMapping.phone);
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

  const [studentsByEmail, studentPhones, studentsByName, callListStudentsByEmail, callListStudentsByName] = await Promise.all([
    emails.length > 0 && (commitSettings.matchBy === 'email_or_phone' || commitSettings.matchBy === 'email')
      ? prisma.student.findMany({
          where: { workspaceId, email: { in: emails }, isDeleted: false },
          include: { phones: { select: { phone: true, isPrimary: true } } },
        })
      : Promise.resolve([]),
    phones.length > 0 && (commitSettings.matchBy === 'email_or_phone' || commitSettings.matchBy === 'phone')
      ? prisma.studentPhone.findMany({ where: { workspaceId, phone: { in: phones }, student: { workspaceId, isDeleted: false } }, include: { student: true } })
      : Promise.resolve([]),
    commitSettings.matchBy === 'name'
      ? prisma.student.findMany({
          where: { workspaceId, isDeleted: false, name: { in: Array.from(new Set(validRows.map((entry) => entry.name as string))) } },
          include: { phones: { select: { phone: true, isPrimary: true } } },
        })
      : Promise.resolve([]),
    emails.length > 0
      ? prisma.callListItem.findMany({
          where: { callListId: listId, student: { workspaceId, isDeleted: false, email: { in: emails } } },
          select: { student: { include: { phones: { select: { phone: true, isPrimary: true } } } } },
        })
      : Promise.resolve([]),
    commitSettings.matchBy === 'name'
      ? prisma.callListItem.findMany({
          where: {
            callListId: listId,
            student: {
              workspaceId,
              isDeleted: false,
              name: { in: Array.from(new Set(validRows.map((entry) => (entry.name as string) || ''))) },
            },
          },
          select: { student: { include: { phones: { select: { phone: true, isPrimary: true } } } } },
        })
      : Promise.resolve([]),
  ]);

  const emailMap = new Map<string, any[]>();
  studentsByEmail.forEach((student) => {
    if (!student.email) return;
    const key = student.email.toLowerCase();
    const bucket = emailMap.get(key) || [];
    bucket.push(student);
    emailMap.set(key, bucket);
  });

  const phoneMap = new Map<string, any>();
  studentPhones.forEach((studentPhone) => phoneMap.set(studentPhone.phone, studentPhone.student));

  const nameMap = new Map<string, any[]>();
  studentsByName.forEach((student) => {
    const key = student.name.toLowerCase();
    const bucket = nameMap.get(key) || [];
    bucket.push(student);
    nameMap.set(key, bucket);
  });

  const callListEmailMap = new Map<string, any[]>();
  callListStudentsByEmail.forEach((item) => {
    const student = (item as any).student;
    if (!student?.email) return;
    const key = student.email.toLowerCase();
    const bucket = callListEmailMap.get(key) || [];
    bucket.push(student);
    callListEmailMap.set(key, bucket);
  });

  const callListNameMap = new Map<string, any[]>();
  callListStudentsByName.forEach((item) => {
    const student = (item as any).student;
    if (!student?.name) return;
    const key = student.name.toLowerCase();
    const bucket = callListNameMap.get(key) || [];
    bucket.push(student);
    callListNameMap.set(key, bucket);
  });

  const resolveMatchedStudent = (entry: { email: string | null; phone: string | null; name: string | null }) => {
    // Prefer students already present in the target call list.
    if (entry.email) {
      const callListCandidates = callListEmailMap.get(entry.email) || [];
      const selected = selectBestStudentCandidate(callListCandidates, entry.phone);
      if (selected) return selected;
    }

    if (entry.name) {
      const callListCandidates = callListNameMap.get(entry.name.toLowerCase()) || [];
      const selected = selectBestStudentCandidate(callListCandidates, entry.phone);
      if (selected) return selected;
    }

    if (entry.email && (commitSettings.matchBy === 'email_or_phone' || commitSettings.matchBy === 'email')) {
      const candidates = emailMap.get(entry.email);
      const selected = selectBestStudentCandidate(candidates || [], entry.phone);
      if (selected) return selected;
    }

    if (entry.phone && (commitSettings.matchBy === 'email_or_phone' || commitSettings.matchBy === 'phone')) {
      const selected = phoneMap.get(entry.phone);
      if (selected) return selected;
    }

    if (entry.name && commitSettings.matchBy === 'name') {
      const candidates = nameMap.get(entry.name.toLowerCase()) || [];
      const selected = selectBestStudentCandidate(candidates, entry.phone);
      if (selected) return selected;
    }

    return undefined;
  };

  // Determine call list context only once per chunk
  const callList = await prisma.callList.findFirst({ where: { id: listId, workspaceId }, include: { group: { select: { batchId: true } } } });
  if (!callList) throw new AppError(404, 'Call list not found');

  const batchId = (callList.meta as any)?.batchId || callList.group?.batchId || null;
  const groupId = callList.groupId;

  // Process matches + create new students in this chunk
  const studentsToCreate = validRows
    .filter((entry) => {
      if (!commitSettings.createNewStudents) return false;
      return !resolveMatchedStudent(entry as any);
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
      if (!student.email) return;
      const key = student.email.toLowerCase();
      const bucket = emailMap.get(key) || [];
      bucket.push(student);
      emailMap.set(key, bucket);
    });
  }

  // Count matched = pre-existing students found (not newly created ones)
  const createdStudentIds = new Set(createdStudents.map((s) => s.id));
  validRows.forEach((entry) => {
    const student = resolveMatchedStudent(entry as any);
    if (student && !createdStudentIds.has(student.id)) stats.matched++;
  });

  // Resolve studentId per row
  const studentIdByRowNum = new Map<number, string>();
  validRows.forEach((entry) => {
    const student = resolveMatchedStudent(entry as any);
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
      email: entry.email || null,
    }));

  const phoneCreateByPhone = new Map<string, (typeof phonesFromRows)[number]>();
  phonesFromRows.forEach((row) => {
    if (!phoneCreateByPhone.has(row.phone)) phoneCreateByPhone.set(row.phone, row);
  });
  const uniquePhonesToCreate = Array.from(phoneCreateByPhone.values());
  const uniquePhones = uniquePhonesToCreate.map((p) => p.phone);
  const existingPhoneRows =
    uniquePhones.length > 0
      ? await prisma.studentPhone.findMany({
          where: { workspaceId, phone: { in: uniquePhones } },
          select: {
            id: true,
            phone: true,
            studentId: true,
            student: {
              select: {
                email: true,
              },
            },
          },
        })
      : [];

  const existingPhoneSet = new Set<string>(existingPhoneRows.map((p) => p.phone));
  const phoneReassignUpdates: Array<{ id: string; studentId: string }> = [];
  existingPhoneRows.forEach((existing) => {
    const target = phoneCreateByPhone.get(existing.phone);
    if (!target) return;
    if (existing.studentId === target.studentId) return;

    // Safe reassignment rule: same email means duplicate student records.
    const targetEmail = target.email?.toLowerCase();
    const ownerEmail = existing.student?.email?.toLowerCase();
    if (targetEmail && ownerEmail && targetEmail === ownerEmail) {
      phoneReassignUpdates.push({ id: existing.id, studentId: target.studentId });
    }
  });

  const studentPhoneCreates = uniquePhonesToCreate
    .filter((p) => !existingPhoneSet.has(p.phone))
    .map(({ email: _email, ...rest }) => rest); // strip email — not a StudentPhone field

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

  if (phoneReassignUpdates.length > 0) {
    writeOps.push({
      name: 'studentPhone.reassign',
      promise: Promise.all(
        phoneReassignUpdates.map((update) =>
          prisma.studentPhone.update({
            where: { id: update.id },
            data: { studentId: update.studentId },
          })
        )
      ),
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
    await updateIncludeCallerNotes(listId, workspaceId, meta.commitSettings as CommitCallListImportInput | undefined);

    return {
      importId,
      status: 'COMPLETED',
      progress: updatedProgress,
      result: { message: `Import completed: ${stats.matched} matched, ${stats.created} created, ${stats.added} added, ${stats.duplicates} duplicates, ${stats.errors} errors`, stats, errors: (stats.errorMessages || []).slice(0, 10) },
    };
  }

  return { importId, status: 'IN_PROGRESS', progress: updatedProgress };
};
