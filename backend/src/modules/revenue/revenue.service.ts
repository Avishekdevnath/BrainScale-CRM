import { prisma } from '../../db/client';
import { AppError } from '../../middleware/error-handler';
import {
  CreatePaymentInput,
  UpdatePaymentInput,
  ListPaymentsInput,
  RevenueStatsInput,
} from './revenue.schemas';

/**
 * Create a payment record
 */
export const createPayment = async (
  workspaceId: string,
  userId: string,
  data: CreatePaymentInput
) => {
  // Verify student belongs to workspace
  const student = await prisma.student.findFirst({
    where: {
      id: data.studentId,
      workspaceId,
      isDeleted: false,
    },
  });

  if (!student) {
    throw new AppError(404, 'Student not found');
  }

  // Verify group belongs to workspace
  const group = await prisma.group.findFirst({
    where: {
      id: data.groupId,
      workspaceId,
      isActive: true,
    },
    include: {
      batch: true,
    },
  });

  if (!group) {
    throw new AppError(404, 'Group not found');
  }

  // Use provided batchId or derive from group
  const batchId = data.batchId || group.batchId;

  // Verify batch if provided
  if (batchId) {
    const batch = await prisma.batch.findFirst({
      where: {
        id: batchId,
        workspaceId,
      },
    });

    if (!batch) {
      throw new AppError(404, 'Batch not found');
    }
  }

  // Parse payment date
  const paymentDate = data.paymentDate ? new Date(data.paymentDate) : new Date();

  const payment = await prisma.payment.create({
    data: {
      workspaceId,
      studentId: data.studentId,
      groupId: data.groupId,
      batchId: batchId || undefined,
      amount: data.amount,
      currency: data.currency || 'USD',
      paymentDate,
      paymentMethod: data.paymentMethod || undefined,
      status: data.status || 'PENDING',
      reference: data.reference || undefined,
      notes: data.notes || undefined,
      createdBy: userId,
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      group: {
        select: {
          id: true,
          name: true,
        },
      },
      batch: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return payment;
};

/**
 * List payments with filters
 */
export const listPayments = async (
  workspaceId: string,
  options: ListPaymentsInput
) => {
  // Build where clause
  const where: any = {
    workspaceId,
  };

  if (options.studentId) {
    where.studentId = options.studentId;
  }

  if (options.groupId) {
    where.groupId = options.groupId;
  }

  if (options.batchId) {
    where.batchId = options.batchId;
  }

  if (options.status) {
    where.status = options.status;
  }

  if (options.dateFrom || options.dateTo) {
    where.paymentDate = {};
    if (options.dateFrom) {
      where.paymentDate.gte = new Date(options.dateFrom);
    }
    if (options.dateTo) {
      where.paymentDate.lte = new Date(options.dateTo);
    }
  }

  // Calculate pagination
  const page = options.page || 1;
  const size = Math.min(options.size || 20, 100);
  const skip = (page - 1) * size;

  // Get payments with pagination
  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
        batch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
      skip,
      take: size,
    }),
    prisma.payment.count({ where }),
  ]);

  return {
    payments,
    pagination: {
      page,
      size,
      total,
      totalPages: Math.ceil(total / size),
    },
  };
};

/**
 * Get payment details
 */
export const getPayment = async (paymentId: string, workspaceId: string) => {
  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      workspaceId,
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      group: {
        select: {
          id: true,
          name: true,
        },
      },
      batch: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!payment) {
    throw new AppError(404, 'Payment not found');
  }

  return payment;
};

/**
 * Update a payment
 */
export const updatePayment = async (
  paymentId: string,
  workspaceId: string,
  data: UpdatePaymentInput
) => {
  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      workspaceId,
    },
  });

  if (!payment) {
    throw new AppError(404, 'Payment not found');
  }

  const updateData: any = {};
  if (data.amount !== undefined) updateData.amount = data.amount;
  if (data.currency !== undefined) updateData.currency = data.currency;
  if (data.paymentDate !== undefined) {
    updateData.paymentDate = new Date(data.paymentDate);
  }
  if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.reference !== undefined) updateData.reference = data.reference;
  if (data.notes !== undefined) updateData.notes = data.notes;

  const updated = await prisma.payment.update({
    where: { id: paymentId },
    data: updateData,
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      group: {
        select: {
          id: true,
          name: true,
        },
      },
      batch: {
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
 * Delete a payment
 */
export const deletePayment = async (paymentId: string, workspaceId: string) => {
  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      workspaceId,
    },
  });

  if (!payment) {
    throw new AppError(404, 'Payment not found');
  }

  await prisma.payment.delete({
    where: { id: paymentId },
  });

  return { message: 'Payment deleted successfully' };
};

/**
 * Get revenue statistics by batch
 */
export const getRevenueByBatch = async (
  workspaceId: string,
  options: RevenueStatsInput
) => {
  const where: any = {
    workspaceId,
    status: 'COMPLETED', // Only count completed payments
  };

  if (options.batchId) {
    where.batchId = options.batchId;
  }

  if (options.dateFrom || options.dateTo) {
    where.paymentDate = {};
    if (options.dateFrom) {
      where.paymentDate.gte = new Date(options.dateFrom);
    }
    if (options.dateTo) {
      where.paymentDate.lte = new Date(options.dateTo);
    }
  }

  // Get all payments matching criteria
  const payments = await prisma.payment.findMany({
    where,
    include: {
      batch: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Group by batch
  const revenueByBatch = payments.reduce((acc: any, payment) => {
    const batchId = payment.batchId || 'no-batch';
    const batchName = payment.batch?.name || 'No Batch';

    if (!acc[batchId]) {
      acc[batchId] = {
        batchId: batchId === 'no-batch' ? null : batchId,
        batchName,
        totalRevenue: 0,
        paymentCount: 0,
        currency: payment.currency || 'USD',
      };
    }

    acc[batchId].totalRevenue += payment.amount;
    acc[batchId].paymentCount += 1;

    return acc;
  }, {});

  return Object.values(revenueByBatch);
};

/**
 * Get revenue statistics by group
 */
export const getRevenueByGroup = async (
  workspaceId: string,
  options: RevenueStatsInput
) => {
  const where: any = {
    workspaceId,
    status: 'COMPLETED',
  };

  if (options.groupId) {
    where.groupId = options.groupId;
  }

  if (options.batchId) {
    where.batchId = options.batchId;
  }

  if (options.dateFrom || options.dateTo) {
    where.paymentDate = {};
    if (options.dateFrom) {
      where.paymentDate.gte = new Date(options.dateFrom);
    }
    if (options.dateTo) {
      where.paymentDate.lte = new Date(options.dateTo);
    }
  }

  // Get all payments matching criteria
  const payments = await prisma.payment.findMany({
    where,
    include: {
      group: {
        select: {
          id: true,
          name: true,
        },
      },
      batch: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Group by group
  const revenueByGroup = payments.reduce((acc: any, payment) => {
    const groupId = payment.groupId;

    if (!acc[groupId]) {
      acc[groupId] = {
        groupId,
        groupName: payment.group.name,
        batchId: payment.batchId,
        batchName: payment.batch?.name || null,
        totalRevenue: 0,
        paymentCount: 0,
        currency: payment.currency || 'USD',
      };
    }

    acc[groupId].totalRevenue += payment.amount;
    acc[groupId].paymentCount += 1;

    return acc;
  }, {});

  return Object.values(revenueByGroup);
};

/**
 * Get combined revenue statistics (batch + group)
 */
export const getRevenueStats = async (
  workspaceId: string,
  options: RevenueStatsInput
) => {
  const where: any = {
    workspaceId,
    status: 'COMPLETED',
  };

  if (options.batchId) {
    where.batchId = options.batchId;
  }

  if (options.groupId) {
    where.groupId = options.groupId;
  }

  if (options.dateFrom || options.dateTo) {
    where.paymentDate = {};
    if (options.dateFrom) {
      where.paymentDate.gte = new Date(options.dateFrom);
    }
    if (options.dateTo) {
      where.paymentDate.lte = new Date(options.dateTo);
    }
  }

  // Get aggregated stats
  const [totalRevenue, totalPayments, payments] = await Promise.all([
    prisma.payment.aggregate({
      where,
      _sum: {
        amount: true,
      },
    }),
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      select: {
        currency: true,
      },
      distinct: ['currency'],
    }),
  ]);

  const currency = payments[0]?.currency || 'USD';

  return {
    totalRevenue: totalRevenue._sum.amount || 0,
    totalPayments,
    currency,
    byBatch: await getRevenueByBatch(workspaceId, options),
    byGroup: await getRevenueByGroup(workspaceId, options),
  };
};

