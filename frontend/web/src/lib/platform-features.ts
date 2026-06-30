export const PLATFORM_FEATURES = [
  'ai',
  'tasks',
  'revenue',
  'calls',
  'followups',
  'groups',
  'learning',
  'teamChat',
  'forms',
] as const;
export type PlatformFeature = (typeof PLATFORM_FEATURES)[number];

export const FEATURE_LABEL: Record<PlatformFeature, string> = {
  ai: 'AI Features',
  tasks: 'Tasks',
  revenue: 'Revenue Tracking',
  calls: 'Calls & Call Lists',
  followups: 'Follow-ups',
  groups: 'Groups',
  learning: 'Courses & Learning',
  teamChat: 'Team Chat',
  forms: 'Forms',
};

/** Per-workspace settings field name for each feature. */
export const WORKSPACE_FIELD: Record<PlatformFeature, string> = {
  ai: 'aiFeaturesEnabled',
  tasks: 'tasksEnabled',
  revenue: 'revenueEnabled',
  calls: 'callsEnabled',
  followups: 'followupsEnabled',
  groups: 'groupsEnabled',
  learning: 'learningEnabled',
  teamChat: 'teamChatEnabled',
  forms: 'formsEnabled',
};
