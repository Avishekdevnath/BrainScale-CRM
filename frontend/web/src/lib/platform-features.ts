export const PLATFORM_FEATURES = ['ai', 'tasks', 'revenue'] as const;
export type PlatformFeature = (typeof PLATFORM_FEATURES)[number];

export const FEATURE_LABEL: Record<PlatformFeature, string> = {
  ai: 'AI Features',
  tasks: 'Tasks',
  revenue: 'Revenue Tracking',
};

/** Per-workspace settings field name for each feature. */
export const WORKSPACE_FIELD: Record<PlatformFeature, 'aiFeaturesEnabled' | 'tasksEnabled' | 'revenueEnabled'> = {
  ai: 'aiFeaturesEnabled',
  tasks: 'tasksEnabled',
  revenue: 'revenueEnabled',
};
