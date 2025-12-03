import { prisma } from '../../db/client';
import { AppError } from '../../middleware/error-handler';
import { parseFile, ParseResult } from '../../utils/file-parser';
import { CommitImportInput } from './import.schemas';

/**
 * Preview import file (parse and return data with column mapping suggestions)
 */
export const previewImport = async (
  workspaceId: string,
  fileBuffer: Buffer,
  filename: string
) => {
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

  // Return preview data (first 10 rows for preview)
  const previewRows = parsed.rows.slice(0, 10);

  return {
    headers,
    previewRows,
    totalRows: parsed.totalRows,
    suggestions,
    parsedData: parsed, // Store full parsed data for commit
    message: 'File parsed successfully. Review the preview and column mapping before committing.',
  };
};

/**
 * Commit import (create students from parsed data)
 */
export const commitImport = async (
  workspaceId: string,
  userId: string,
  importId: string,
  data: CommitImportInput
) => {
  // Get import record
  const importRecord = await prisma.import.findFirst({
    where: {
      id: importId,
      workspaceId,
      status: 'PENDING',
    },
  });

  if (!importRecord) {
    throw new AppError(404, 'Import not found or already processed');
  }

  // Verify group belongs to workspace
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

  // Verify batches belong to workspace if provided
  if (data.batchIds && data.batchIds.length > 0) {
    const batches = await prisma.batch.findMany({
      where: {
        id: { in: data.batchIds },
        workspaceId,
        isActive: true,
      },
    });

    if (batches.length !== data.batchIds.length) {
      throw new AppError(404, 'One or more batches not found');
    }
  }

  // Get parsed data from meta
  const meta = (importRecord as any).meta as { headers: string[]; rows: Record<string, any>[] } | null;
  if (!meta || !meta.rows || !Array.isArray(meta.rows)) {
    throw new AppError(400, 'Import data not found. Please re-upload the file.');
  }

  // Update import status to PROCESSING
  await prisma.import.update({
    where: { id: importId },
    data: {
      status: 'PROCESSING',
    },
  });

  const stats = { success: 0, duplicates: 0, errors: 0 };
  const errors: string[] = [];

  const extractField = (row: Record<string, any>, columnName?: string): string | null => {
    if (!columnName) return null;
    const value = row[columnName];
    return typeof value === 'string' ? value.trim() : null;
  };

  for (let idx = 0; idx < meta.rows.length; idx++) {
    const row = meta.rows[idx] as Record<string, any>;
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

      const student = await prisma.student.create({
        data: {
          workspaceId,
          name,
          email: email?.toLowerCase() || null,
        },
      });

      await prisma.studentGroupStatus.upsert({
        where: { studentId_groupId: { studentId: student.id, groupId: data.groupId } },
        create: { studentId: student.id, groupId: data.groupId, status: 'NEW' },
        update: {},
      });

      if (phone) {
        await prisma.studentPhone.create({
          data: { studentId: student.id, workspaceId, phone, isPrimary: true },
        });
      }

      // Assign student to batches if provided
      if (data.batchIds && data.batchIds.length > 0) {
        await Promise.all(
          data.batchIds.map((batchId) =>
            prisma.studentBatch.upsert({
              where: {
                studentId_batchId: {
                  studentId: student.id,
                  batchId,
                },
              },
              create: {
                studentId: student.id,
                batchId,
              },
              update: {},
            })
          )
        );
      }

      stats.success++;
    } catch (error: any) {
      stats.errors++;
      errors.push(`Row ${rowNum}: ${error.message || 'Unknown error'}`);
    }
  }

  const status = stats.errors > 0 && stats.success === 0 ? 'FAILED' : 'COMPLETED';
  
  await (prisma.import.update as any)({
    where: { id: importId },
    data: {
      status,
      successCount: stats.success,
      duplicateCount: stats.duplicates,
      errorCount: stats.errors,
      meta: { ...meta, errors: errors.slice(0, 100) },
    },
  });

  return {
    importId,
    message: `Import completed: ${stats.success} successful, ${stats.duplicates} duplicates, ${stats.errors} errors`,
    stats,
    errors: errors.slice(0, 10),
  };
};

/**
 * List import history
 */
export const listImports = async (workspaceId: string) => {
  const imports = await prisma.import.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    take: 50, // Last 50 imports
  });

  return imports;
};

/**
 * Get import details
 */
export const getImport = async (importId: string, workspaceId: string) => {
  const importRecord = await prisma.import.findFirst({
    where: {
      id: importId,
      workspaceId,
    },
  });

  if (!importRecord) {
    throw new AppError(404, 'Import not found');
  }

  return importRecord;
};

