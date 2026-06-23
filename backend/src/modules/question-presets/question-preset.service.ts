import { prisma } from '../../db/client';
import { AppError } from '../../middleware/error-handler';
import { CreateQuestionPresetInput, UpdateQuestionPresetInput } from './question-preset.schemas';

const verifyMembership = async (workspaceId: string, userId: string) => {
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId },
  });
  if (!membership) throw new AppError(403, 'Access denied');
  return membership;
};

export const createQuestionPreset = async (
  workspaceId: string,
  userId: string,
  data: CreateQuestionPresetInput
) => {
  await verifyMembership(workspaceId, userId);

  const existing = await prisma.questionPreset.findUnique({
    where: { workspaceId_name: { workspaceId, name: data.name } },
  });
  if (existing) throw new AppError(409, 'A preset with this name already exists');

  const preset = await prisma.questionPreset.create({
    data: {
      workspaceId,
      name: data.name,
      description: data.description,
      questions: data.questions,
      createdBy: userId,
    },
  });

  return preset;
};

export const listQuestionPresets = async (workspaceId: string, userId: string) => {
  await verifyMembership(workspaceId, userId);

  const presets = await prisma.questionPreset.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
  });

  return { presets };
};

export const getQuestionPreset = async (
  workspaceId: string,
  userId: string,
  presetId: string
) => {
  await verifyMembership(workspaceId, userId);

  const preset = await prisma.questionPreset.findFirst({
    where: { id: presetId, workspaceId },
  });
  if (!preset) throw new AppError(404, 'Preset not found');

  return preset;
};

export const updateQuestionPreset = async (
  workspaceId: string,
  userId: string,
  presetId: string,
  data: UpdateQuestionPresetInput
) => {
  await verifyMembership(workspaceId, userId);

  const preset = await prisma.questionPreset.findFirst({
    where: { id: presetId, workspaceId },
  });
  if (!preset) throw new AppError(404, 'Preset not found');

  if (data.name && data.name !== preset.name) {
    const nameConflict = await prisma.questionPreset.findUnique({
      where: { workspaceId_name: { workspaceId, name: data.name } },
    });
    if (nameConflict) throw new AppError(409, 'A preset with this name already exists');
  }

  const updated = await prisma.questionPreset.update({
    where: { id: presetId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.questions !== undefined && { questions: data.questions }),
    },
  });

  return updated;
};

export const deleteQuestionPreset = async (
  workspaceId: string,
  userId: string,
  presetId: string
) => {
  await verifyMembership(workspaceId, userId);

  const preset = await prisma.questionPreset.findFirst({
    where: { id: presetId, workspaceId },
  });
  if (!preset) throw new AppError(404, 'Preset not found');

  await prisma.questionPreset.delete({ where: { id: presetId } });

  return { success: true };
};
