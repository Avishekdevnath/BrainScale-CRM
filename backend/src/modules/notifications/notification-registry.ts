/**
 * Single source of truth for all notification types.
 *
 * Adding a new notification type:
 *   1. Add an entry here.
 *   2. Add the prefKey field to NotificationPreference in schema.prisma.
 *   3. Add the prefKey field to UpdatePreferencesSchema in notification.schemas.ts.
 *   4. Run `npx prisma generate && npx prisma db push` in backend/.
 *   5. Add the type to NotificationType in frontend/web/src/types/notifications.types.ts.
 *   6. Add an entry to NOTIFICATION_DISPLAY in frontend/web/src/lib/notification-registry.ts.
 *   7. Add a row to PREFERENCE_ROWS in frontend/web/src/lib/notification-registry.ts.
 *   8. Fire createNotification() from the relevant service.
 */

export interface NotificationRegistryEntry {
  /** The string value stored in Notification.type */
  type: string;
  /**
   * The field name on NotificationPreference that controls this type.
   * null = always allowed (cannot be disabled by user).
   */
  prefKey: string | null;
  /** Value used when creating a NotificationPreference row for the first time. */
  defaultEnabled: boolean;
}

export const NOTIFICATION_REGISTRY: NotificationRegistryEntry[] = [
  // ─── Follow-ups ───────────────────────────────────────────────────────────
  { type: 'FOLLOWUP_ASSIGNED',       prefKey: 'followupAssigned',      defaultEnabled: true  },
  { type: 'FOLLOWUP_DUE_SOON',       prefKey: 'followupDueSoon',       defaultEnabled: true  },
  { type: 'FOLLOWUP_OVERDUE',        prefKey: 'followupOverdue',       defaultEnabled: true  },
  // ─── Call Logs ────────────────────────────────────────────────────────────
  { type: 'CALL_LOG_COMPLETED',      prefKey: 'callLogCompleted',      defaultEnabled: false },
  // ─── Tasks ───────────────────────────────────────────────────────────────
  { type: 'TASK_ASSIGNED',           prefKey: 'taskAssigned',          defaultEnabled: true  },
  { type: 'TASK_DUE_SOON',           prefKey: 'taskDueSoon',           defaultEnabled: true  },
  { type: 'TASK_ACCEPTED',           prefKey: 'taskUpdated',           defaultEnabled: true  },
  { type: 'TASK_STARTED',            prefKey: 'taskUpdated',           defaultEnabled: true  },
  { type: 'TASK_DECLINED',           prefKey: 'taskUpdated',           defaultEnabled: true  },
  { type: 'TASK_COMPLETED',          prefKey: 'taskUpdated',           defaultEnabled: true  },
  { type: 'TASK_CANCELLED',          prefKey: 'taskUpdated',           defaultEnabled: true  },
  // ─── Forms ───────────────────────────────────────────────────────────────
  { type: 'FORM_RESPONSE_RECEIVED',  prefKey: 'formResponseReceived',  defaultEnabled: true  },
  // ─── Feedback ─────────────────────────────────────────────────────────────
  { type: 'FEEDBACK_REPLY',          prefKey: null,                    defaultEnabled: true  },
  // ─── Platform ─────────────────────────────────────────────────────────────
  { type: 'PLATFORM_ANNOUNCEMENT',   prefKey: null,                    defaultEnabled: true  },
];

/** Fast O(1) lookup by type string. */
export const REGISTRY_BY_TYPE = new Map<string, NotificationRegistryEntry>(
  NOTIFICATION_REGISTRY.map((e) => [e.type, e])
);
