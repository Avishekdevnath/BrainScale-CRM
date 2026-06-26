export const PLATFORM_FEATURES = ['ai', 'tasks', 'revenue'] as const;
export type PlatformFeature = (typeof PLATFORM_FEATURES)[number];

/** Maps a feature key to its per-workspace boolean column on Workspace. */
export const WORKSPACE_FIELD: Record<
  PlatformFeature,
  'aiFeaturesEnabled' | 'tasksEnabled' | 'revenueEnabled'
> = {
  ai: 'aiFeaturesEnabled',
  tasks: 'tasksEnabled',
  revenue: 'revenueEnabled',
};

export const FEATURE_LABEL: Record<PlatformFeature, string> = {
  ai: 'AI Features',
  tasks: 'Tasks',
  revenue: 'Revenue Tracking',
};

/** Type guard for untrusted input (route params/body). */
export function isPlatformFeature(x: unknown): x is PlatformFeature {
  return typeof x === 'string' && (PLATFORM_FEATURES as readonly string[]).includes(x);
}
