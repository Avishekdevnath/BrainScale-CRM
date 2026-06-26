import { z } from 'zod';
import { PLATFORM_FEATURES, PlatformFeature } from '../../config/platform-features';

// z.enum needs a mutable non-empty tuple; PLATFORM_FEATURES is readonly (`as const`).
export const PatchFeatureBody = z.object({
  feature: z.enum(PLATFORM_FEATURES as unknown as [PlatformFeature, ...PlatformFeature[]]),
  enabled: z.boolean(),
});

export const ListFeatureWorkspacesQuery = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
});

export type PatchFeatureBodyInput = z.infer<typeof PatchFeatureBody>;
export type ListFeatureWorkspacesQueryInput = z.infer<typeof ListFeatureWorkspacesQuery>;
