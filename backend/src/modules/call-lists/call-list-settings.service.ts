import { prisma } from '../../db/client';
import { AppError } from '../../middleware/error-handler';
import { DEFAULT_CALL_STATUSES, CreateCallStatusOptionInput, UpdateCallStatusOptionInput } from './call-list-settings.schemas';

// Colors cycled when auto-assigning to new per-list status options
const PRESET_COLORS = [
  '#22c55e', '#ef4444', '#f59e0b', '#6b7280',
  '#3b82f6', '#f97316', '#a855f7', '#ec4899',
];

// Per-call-list status options stored in callList.meta.statusOptions
export type CallListStatusOptionEntry = { value: string; label: string; color: string };

const getCallListMeta = async (listId: string, workspaceId: string) => {
  const callList = await prisma.callList.findFirst({ where: { id: listId, workspaceId } });
  if (!callList) throw new AppError(404, 'Call list not found');
  return { callList, meta: ((callList.meta as any) || {}) as Record<string, any> };
};

export const listCallListStatusOptions = async (listId: string, workspaceId: string): Promise<CallListStatusOptionEntry[]> => {
  const { meta } = await getCallListMeta(listId, workspaceId);
  return (meta.statusOptions as CallListStatusOptionEntry[]) || [];
};

export const addCallListStatusOption = async (
  listId: string,
  workspaceId: string,
  label: string,
): Promise<CallListStatusOptionEntry> => {
  const { callList, meta } = await getCallListMeta(listId, workspaceId);

  const value = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  if (!value) throw new AppError(400, 'Label produces an invalid slug');

  const existing: CallListStatusOptionEntry[] = meta.statusOptions || [];
  if (existing.some((s) => s.value === value)) throw new AppError(409, 'Status already exists');

  const color = PRESET_COLORS[existing.length % PRESET_COLORS.length];
  const newOption: CallListStatusOptionEntry = { value, label, color };
  const updated = [...existing, newOption];

  await prisma.callList.update({
    where: { id: callList.id },
    data: { meta: { ...meta, statusOptions: updated } },
  });

  return newOption;
};

export const removeCallListStatusOption = async (
  listId: string,
  workspaceId: string,
  value: string,
): Promise<{ message: string }> => {
  const { callList, meta } = await getCallListMeta(listId, workspaceId);

  const existing: CallListStatusOptionEntry[] = meta.statusOptions || [];
  const next = existing.filter((s) => s.value !== value);
  if (next.length === existing.length) throw new AppError(404, 'Status option not found');

  await prisma.callList.update({
    where: { id: callList.id },
    data: { meta: { ...meta, statusOptions: next } },
  });

  return { message: 'Status option removed' };
};

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

// ── Per-call-list custom columns (stored in callList.meta.columns) ──────────

export type CustomColumnType = 'text' | 'number' | 'date' | 'select';

export interface CustomColumnDef {
  key: string;
  label: string;
  shortLabel?: string;
  type: CustomColumnType;
  options?: string[];
}

export const listCallListColumns = async (listId: string, workspaceId: string): Promise<CustomColumnDef[]> => {
  const { meta } = await getCallListMeta(listId, workspaceId);
  return (meta.columns as CustomColumnDef[]) || [];
};

export const addCallListColumn = async (
  listId: string,
  workspaceId: string,
  payload: { label: string; shortLabel?: string; type: CustomColumnType; options?: string[] },
): Promise<CustomColumnDef> => {
  const { callList, meta } = await getCallListMeta(listId, workspaceId);

  const key = payload.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  if (!key) throw new AppError(400, 'Label produces an invalid key');

  const existing: CustomColumnDef[] = meta.columns || [];
  if (existing.some((c) => c.key === key)) throw new AppError(409, 'Column with this name already exists');

  const newCol: CustomColumnDef = { key, label: payload.label, type: payload.type };
  if (payload.shortLabel?.trim()) newCol.shortLabel = payload.shortLabel.trim();
  if (payload.type === 'select' && payload.options?.length) newCol.options = payload.options;

  await prisma.callList.update({
    where: { id: callList.id },
    data: { meta: { ...meta, columns: [...existing, newCol] } as any },
  });

  return newCol;
};

export const updateCallListColumn = async (
  listId: string,
  workspaceId: string,
  key: string,
  payload: { label?: string; options?: string[] },
): Promise<CustomColumnDef> => {
  const { callList, meta } = await getCallListMeta(listId, workspaceId);

  const existing: CustomColumnDef[] = meta.columns || [];
  const idx = existing.findIndex((c) => c.key === key);
  if (idx === -1) throw new AppError(404, 'Column not found');

  const updated = { ...existing[idx] };
  if (payload.label !== undefined) updated.label = payload.label;
  if (payload.options !== undefined) updated.options = payload.options;

  const next = [...existing];
  next[idx] = updated;

  await prisma.callList.update({
    where: { id: callList.id },
    data: { meta: { ...meta, columns: next } as any },
  });

  return updated;
};

export const removeCallListColumn = async (
  listId: string,
  workspaceId: string,
  key: string,
): Promise<{ message: string }> => {
  const { callList, meta } = await getCallListMeta(listId, workspaceId);

  const existing: CustomColumnDef[] = meta.columns || [];
  const next = existing.filter((c) => c.key !== key);
  if (next.length === existing.length) throw new AppError(404, 'Column not found');

  await prisma.callList.update({
    where: { id: callList.id },
    data: { meta: { ...meta, columns: next } as any },
  });

  return { message: 'Column removed' };
};

export const updateCallListItemCustom = async (
  listId: string,
  itemId: string,
  workspaceId: string,
  fields: Record<string, any>,
): Promise<{ message: string }> => {
  const item = await prisma.callListItem.findFirst({ where: { id: itemId, callListId: listId, workspaceId } });
  if (!item) throw new AppError(404, 'Call list item not found');

  const current = (item.custom as Record<string, any>) || {};
  await prisma.callListItem.update({
    where: { id: itemId },
    data: { custom: { ...current, ...fields } },
  });

  return { message: 'Custom fields updated' };
};
