// Composition point for the modular API client.
// Each domain lives in its own <domain>.api.ts file backed by the shared
// `http` core (token refresh, headers, error parsing). `apiClient` merges
// them so existing `apiClient.method()` call sites keep working; new code
// may import the domain objects directly.
import { authApi } from "./auth.api";
import { platformApi } from "./platform.api";
import { dashboardApi } from "./dashboard.api";
import { workspacesApi } from "./workspaces.api";
import { membersApi } from "./members.api";
import { groupsApi } from "./groups.api";
import { coursesApi } from "./courses.api";
import { batchesApi } from "./batches.api";
import { callListsApi } from "./call-lists.api";
import { callsApi } from "./calls.api";
import { followupsApi } from "./followups.api";
import { studentsApi } from "./students.api";
import { rolesApi } from "./roles.api";
import { aiChatApi } from "./ai-chat.api";
import { formsApi } from "./forms.api";
import { notificationsApi } from "./notifications.api";
import { tasksApi } from "./tasks.api";
import { scheduleApi } from "./schedule.api";
import { teamChatApi } from "./team-chat.api";
import { miscApi } from "./misc.api";

export const apiClient = {
  ...authApi,
  ...platformApi,
  ...dashboardApi,
  ...workspacesApi,
  ...membersApi,
  ...groupsApi,
  ...coursesApi,
  ...batchesApi,
  ...callListsApi,
  ...callsApi,
  ...followupsApi,
  ...studentsApi,
  ...rolesApi,
  ...aiChatApi,
  ...formsApi,
  ...notificationsApi,
  ...tasksApi,
  ...scheduleApi,
  ...teamChatApi,
  ...miscApi,
};

export type ApiClient = typeof apiClient;

export {
  authApi,
  platformApi,
  dashboardApi,
  workspacesApi,
  membersApi,
  groupsApi,
  coursesApi,
  batchesApi,
  callListsApi,
  callsApi,
  followupsApi,
  studentsApi,
  rolesApi,
  aiChatApi,
  formsApi,
  notificationsApi,
  tasksApi,
  scheduleApi,
  teamChatApi,
  miscApi,
};
export { AuthExpiredError, http } from "./http";
