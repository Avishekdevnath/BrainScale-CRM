import { prisma } from '../../db/client';
import { AppError } from '../../middleware/error-handler';
import { ExportDataInput } from './export.schemas';
import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

/**
 * Export students to CSV/XLSX/PDF
 */
const exportStudents = async (
  workspaceId: string,
  format: 'csv' | 'xlsx' | 'pdf',
  filters?: { groupId?: string; batchId?: string; courseId?: string; status?: string }
) => {
  // Build where clause
  const where: any = {
    workspaceId,
    isDeleted: false,
  };

  if (filters?.groupId) {
    where.statuses = {
      some: {
        groupId: filters.groupId,
      },
    };
  }

  if (filters?.batchId) {
    where.studentBatches = {
      some: {
        batchId: filters.batchId,
      },
    };
  }

  // Fetch students
  const students = await prisma.student.findMany({
    where,
    include: {
      phones: true,
      statuses: {
        include: {
          group: true,
        },
      },
      enrollments: {
        include: {
          course: true,
          module: true,
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
  });

  // Transform data for export
  const rows = students.map((student) => ({
    Name: student.name,
    Email: student.email || '',
    'Phone (Primary)': student.phones.find((p) => p.isPrimary)?.phone || '',
    'All Phones': student.phones.map((p) => p.phone).join(', '),
    'Group Status': student.statuses[0]?.status || '',
    'Group Name': student.statuses[0]?.group.name || '',
    'Batch Names': student.studentBatches.map((sb) => sb.batch.name).join(', '),
    'Batch IDs': student.studentBatches.map((sb) => sb.batch.id).join(', '),
    Tags: student.tags.join(', '),
    'Created At': student.createdAt.toISOString(),
  }));

  return { rows, headers: Object.keys(rows[0] || {}) };
};

/**
 * Export calls to CSV/XLSX/PDF
 */
const exportCalls = async (
  workspaceId: string,
  format: 'csv' | 'xlsx' | 'pdf',
  filters?: { groupId?: string; batchId?: string; dateFrom?: string; dateTo?: string }
) => {
  // Build where clause
  const where: any = {
    workspaceId,
  };

  if (filters?.groupId) {
    where.groupId = filters.groupId;
  }

  if (filters?.batchId) {
    where.group = { batchId: filters.batchId };
  }

  if (filters?.dateFrom || filters?.dateTo) {
    where.callDate = {};
    if (filters.dateFrom) {
      where.callDate.gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      where.callDate.lte = new Date(filters.dateTo);
    }
  }

  // Fetch calls
  const calls = await prisma.call.findMany({
    where,
    include: {
      student: {
        select: {
          name: true,
          email: true,
        },
      },
      group: {
        select: {
          name: true,
          batch: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      callDate: 'desc',
    },
  });

  // Transform data for export
  const rows = calls.map((call) => ({
    Date: call.callDate.toISOString().split('T')[0],
    Time: call.callDate.toISOString().split('T')[1].split('.')[0],
    'Student Name': call.student.name,
    'Student Email': call.student.email || '',
    'Group Name': call.group.name,
    'Batch Name': call.group.batch?.name || '',
    Status: call.callStatus,
    Notes: call.notes || '',
  }));

  return { rows, headers: Object.keys(rows[0] || {}) };
};

/**
 * Export followups to CSV/XLSX/PDF
 */
const exportFollowups = async (
  workspaceId: string,
  format: 'csv' | 'xlsx' | 'pdf',
  filters?: { groupId?: string; batchId?: string; dateFrom?: string; dateTo?: string }
) => {
  // Build where clause
  const where: any = {
    workspaceId,
  };

  if (filters?.groupId) {
    where.groupId = filters.groupId;
  }

  if (filters?.batchId) {
    where.group = { batchId: filters.batchId };
  }

  if (filters?.dateFrom || filters?.dateTo) {
    where.dueAt = {};
    if (filters.dateFrom) {
      where.dueAt.gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      where.dueAt.lte = new Date(filters.dateTo);
    }
  }

  // Fetch followups
  const followups = await prisma.followup.findMany({
    where,
    include: {
      student: {
        select: {
          name: true,
          email: true,
        },
      },
      group: {
        select: {
          name: true,
          batch: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      dueAt: 'desc',
    },
  });

  // Fetch assigned users separately if needed
  const assignedUserIds = followups
    .map((f) => f.assignedTo)
    .filter((id): id is string => id !== null);
  const assignedUsers = await prisma.user.findMany({
    where: {
      id: { in: assignedUserIds },
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });
  const userMap = new Map(assignedUsers.map((u) => [u.id, u]));

  // Transform data for export
  const rows = followups.map((followup) => {
    const assignedUser = followup.assignedTo ? userMap.get(followup.assignedTo) : null;
    return {
      'Due Date': followup.dueAt.toISOString().split('T')[0],
      'Student Name': followup.student.name,
      'Student Email': followup.student.email || '',
      'Group Name': followup.group.name,
      'Batch Name': followup.group.batch?.name || '',
      'Assigned To': assignedUser?.name || '',
      'Assigned Email': assignedUser?.email || '',
      Status: followup.status,
      Notes: followup.notes || '',
    };
  });

  return { rows, headers: Object.keys(rows[0] || {}) };
};

/**
 * Export call lists to CSV/XLSX/PDF
 */
const exportCallLists = async (
  workspaceId: string,
  format: 'csv' | 'xlsx' | 'pdf'
) => {
  // Fetch call lists
  const callLists = await prisma.callList.findMany({
    where: {
      workspaceId,
    },
    include: {
      items: {
        include: {
          student: {
            select: {
              name: true,
              email: true,
            },
          },
          assignee: {
            select: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Transform data for export
  const rows = callLists.flatMap((list) =>
    list.items.map((item) => ({
      'List Name': list.name,
      'Student Name': item.student.name,
      'Student Email': item.student.email || '',
      'State': item.state,
      'Priority': item.priority,
      'Assigned To': item.assignee?.user.name || '',
      'Assigned Email': item.assignee?.user.email || '',
    }))
  );

  return { rows, headers: Object.keys(rows[0] || {}) };
};

/**
 * Export dashboard KPIs to CSV/XLSX/PDF
 */
const exportDashboard = async (
  workspaceId: string,
  format: 'csv' | 'xlsx' | 'pdf'
) => {
  // Fetch aggregated data
  const [totalStudents, totalCalls, totalFollowups, recentCalls] = await Promise.all([
    prisma.student.count({
      where: { workspaceId, isDeleted: false },
    }),
    prisma.call.count({
      where: { workspaceId },
    }),
    prisma.followup.count({
      where: { workspaceId },
    }),
    prisma.call.findMany({
      where: { workspaceId },
      take: 100,
      orderBy: { callDate: 'desc' },
      include: {
        student: { select: { name: true } },
        group: { select: { name: true } },
      },
    }),
  ]);

  // Create summary rows
  const rows = [
    { Metric: 'Total Students', Value: totalStudents.toString() },
    { Metric: 'Total Calls', Value: totalCalls.toString() },
    { Metric: 'Total Followups', Value: totalFollowups.toString() },
    { Metric: '', Value: '' }, // Separator
    ...recentCalls.map((call) => ({
      Metric: 'Recent Call',
      Value: `${call.student.name} - ${call.group.name} - ${call.callDate.toISOString().split('T')[0]}`,
    })),
  ];

  return { rows, headers: ['Metric', 'Value'] };
};

/**
 * Convert data to CSV string
 */
const toCSV = (rows: any[], headers: string[]): string => {
  if (rows.length === 0) {
    return headers.join(',');
  }

  const csvRows = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header] || '';
          // Escape quotes and wrap in quotes if contains comma or newline
          if (typeof value === 'string' && (value.includes(',') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(',')
    ),
  ];

  return csvRows.join('\n');
};

/**
 * Convert data to XLSX buffer
 */
const toXLSX = (rows: any[], headers: string[]): Buffer => {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  return Buffer.from(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }));
};

/**
 * Convert data to PDF stream
 */
const toPDF = (rows: any[], headers: string[], title: string): Readable => {
  const doc = new PDFDocument({ margin: 50 });
  const stream = new Readable();
  stream.push(null); // End stream

  // Title
  doc.fontSize(18).text(title, { align: 'center' });
  doc.moveDown();

  if (rows.length === 0) {
    doc.text('No data available');
    doc.end();
    return doc as any;
  }

  // Table
  const tableTop = doc.y;
  const rowHeight = 20;
  const colWidths = headers.map(() => 100);

  // Headers
  doc.fontSize(10).font('Helvetica-Bold');
  let x = 50;
  headers.forEach((header, i) => {
    doc.text(header, x, tableTop, { width: colWidths[i] });
    x += colWidths[i];
  });

  // Rows
  doc.font('Helvetica').fontSize(9);
  rows.slice(0, 50).forEach((row, rowIndex) => {
    const y = tableTop + (rowIndex + 1) * rowHeight;
    x = 50;
    headers.forEach((header, colIndex) => {
      const value = String(row[header] || '');
      doc.text(value.substring(0, 30), x, y, { width: colWidths[colIndex] });
      x += colWidths[colIndex];
    });
  });

  doc.end();
  return doc as any;
};

/**
 * Main export function
 */
export const exportData = async (
  workspaceId: string,
  data: ExportDataInput
): Promise<{ buffer: Buffer | Readable; filename: string; contentType: string }> => {
  let result: { rows: any[]; headers: string[] };
  let title = '';

  // Fetch data based on type
  switch (data.type) {
    case 'students':
      title = 'Students Export';
      result = await exportStudents(workspaceId, data.format, data.filters);
      break;
    case 'calls':
      title = 'Calls Export';
      result = await exportCalls(workspaceId, data.format, data.filters);
      break;
    case 'followups':
      title = 'Followups Export';
      result = await exportFollowups(workspaceId, data.format, data.filters);
      break;
    case 'call-lists':
      title = 'Call Lists Export';
      result = await exportCallLists(workspaceId, data.format);
      break;
    case 'dashboard':
      title = 'Dashboard Export';
      result = await exportDashboard(workspaceId, data.format);
      break;
    default:
      throw new AppError(400, 'Invalid export type');
  }

  // Convert to requested format
  const timestamp = new Date().toISOString().split('T')[0];
  let buffer: Buffer | Readable;
  let filename: string;
  let contentType: string;

  switch (data.format) {
    case 'csv':
      buffer = Buffer.from(toCSV(result.rows, result.headers), 'utf-8');
      filename = `${data.type}-${timestamp}.csv`;
      contentType = 'text/csv';
      break;
    case 'xlsx':
      buffer = toXLSX(result.rows, result.headers);
      filename = `${data.type}-${timestamp}.xlsx`;
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      break;
    case 'pdf':
      buffer = toPDF(result.rows, result.headers, title);
      filename = `${data.type}-${timestamp}.pdf`;
      contentType = 'application/pdf';
      break;
    default:
      throw new AppError(400, 'Invalid export format');
  }

  return { buffer, filename, contentType };
};

