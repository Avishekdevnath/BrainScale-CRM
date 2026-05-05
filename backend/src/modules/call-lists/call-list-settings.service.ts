import { prisma } from '../../db/client';
import { AppError } from '../../middleware/error-handler';
import { DEFAULT_CALL_STATUSES, CreateCallStatusOptionInput, UpdateCallStatusOptionInput } from './call-list-settings.schemas';

export const seedDefaultStatusOptions = async (workspaceId: string) => {
  for (const status of DEFAULT_CALL_STATUSES) {
    await prisma.callStatusOption.upsert({
      where: { workspaceId_value: { workspaceId, value: status.value } },
      update: {},
      create: { workspaceId, ...status, isDefault: true },
    });
  }
};

export const listCallStatusOptions = async (workspaceId: string) => {
  const options = await prisma.callStatusOption.findMany({
    where: { workspaceId },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  });

  // Auto-seed defaults if workspace has none yet
  if (options.length === 0) {
    await seedDefaultStatusOptions(workspaceId);
    return prisma.callStatusOption.findMany({
      where: { workspaceId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  return options;
};

export const createCallStatusOption = async (workspaceId: string, data: CreateCallStatusOptionInput) => {
  const value = data.label
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');

  if (!value) throw new AppError(400, 'Label produces an invalid slug');

  const existing = await prisma.callStatusOption.findUnique({
    where: { workspaceId_value: { workspaceId, value } },
  });
  if (existing) throw new AppError(409, 'A status with this name already exists');

  const maxOrderResult = await (prisma.callStatusOption as any).aggregate({
    where: { workspaceId },
    _max: { order: true },
  });
  const nextOrder = (maxOrderResult._max?.order ?? -1) + 1;

  return prisma.callStatusOption.create({
    data: {
      workspaceId,
      value,
      label: data.label,
      color: data.color ?? '#6b7280',
      isDefault: false,
      order: nextOrder,
    },
  });
};

export const updateCallStatusOption = async (
  optionId: string,
  workspaceId: string,
  data: UpdateCallStatusOptionInput
) => {
  const option = await prisma.callStatusOption.findFirst({
    where: { id: optionId, workspaceId },
  });
  if (!option) throw new AppError(404, 'Status option not found');

  return prisma.callStatusOption.update({
    where: { id: optionId },
    data: {
      ...(data.label !== undefined && { label: data.label }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.order !== undefined && { order: data.order }),
    },
  });
};

export const deleteCallStatusOption = async (optionId: string, workspaceId: string) => {
  const option = await prisma.callStatusOption.findFirst({
    where: { id: optionId, workspaceId },
  });
  if (!option) throw new AppError(404, 'Status option not found');
  if (option.isDefault) throw new AppError(400, 'Cannot delete a default status option');

  await prisma.callStatusOption.delete({ where: { id: optionId } });
  return { message: 'Status option deleted' };
};
