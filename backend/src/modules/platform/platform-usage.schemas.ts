import { z } from 'zod';

export const UsageListQuery = z.object({
  windowDays: z.coerce.number().int().min(1).max(90).optional(),
  lowOnly: z
    .union([z.boolean(), z.string()])
    .transform((v) => v === true || v === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(200).default(50),
});

export const UpdateUsageSettingsBody = z.object({
  thresholdMinutes: z.number().int().min(1).max(10_080).optional(),
  windowDays: z.number().int().min(1).max(90).optional(),
  cooldownDays: z.number().int().min(1).max(365).optional(),
});

export const SendNudgeBody = z.object({
  userIds: z.array(z.string().min(1)).min(1).max(500),
  subject: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(10_000).optional(),
});
