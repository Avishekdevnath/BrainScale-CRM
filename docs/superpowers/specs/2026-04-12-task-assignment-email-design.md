# Task Assignment Email Design

**Date:** 2026-04-12  
**Status:** Approved

---

## Overview

Add an outbound email notification for newly created tasks. The email is sent only to the assignee and includes the full task details needed to act on the task without first opening the app.

This applies to both:
- tasks assigned to another workspace member
- self-assigned tasks

The creator must not receive a copy of this email unless they are also the assignee.

---

## Goal

Whenever a task is created, send a task-assignment email to the assignee with the task details.

The email must:
- go only to the assignee
- be sent for self-assigned tasks too
- include the important task fields
- not block task creation if email delivery fails

---

## Existing Context

The codebase already has:
- in-app task notifications in `backend/src/modules/tasks/task.service.ts`
- follow-up assignment emails in `backend/src/modules/emails/email.service.ts`
- shared email templates in `backend/src/utils/email-templates.ts`
- shared provider and queue handling in `backend/src/utils/email.ts`

The new task email flow should follow the same pattern as follow-up assignment emails:
- service-level helper builds and sends the email
- task creation calls that helper
- failures are logged and treated as non-fatal

For this feature, delivery should use the existing provider-aware direct email path rather than the queue worker. This avoids the current queue-worker dependency on Resend-specific sending behavior.

---

## Requirements

### Recipient Rules

- Send the email only to the assignee.
- Do not send the email to the creator unless the creator and assignee are the same person.
- For self-assigned tasks, still send the email to that user.

### Trigger Rule

- Send the email immediately after successful task creation.
- The trigger happens for every new task created through the task creation flow.

### Email Content

The email must include:
- task title
- description, when present
- due date
- priority
- current status
- task type, when present
- assigner name
- assignee name
- referred-by member name or referred-by free text, when present
- linked entity type and ID, when present
- a CTA link back to the tasks area in the frontend

For self-assigned tasks, the content should still read naturally. The assigner and assignee may be the same user.

### Failure Behavior

- If email delivery fails, task creation still succeeds.
- Failure is logged with enough context to debug the issue.
- In-app notification behavior remains unchanged.

---

## Non-Goals

This change does not include:
- email notifications for task accept, start, decline, complete, cancel, or due-soon events
- new notification preference flags for task emails
- sending task emails to creators, admins, or watchers
- digest aggregation for tasks

---

## Architecture

### Recommended Flow

1. `createTask()` creates the task record.
2. `createTask()` continues creating the existing in-app notification for non-self-assigned tasks.
3. `createTask()` also calls a new `sendTaskAssignmentEmail(taskId)` helper.
4. The helper loads the task with the related assignee, assigner, and task type data.
5. The helper builds an HTML email from a new task email template.
6. The helper sends the email through the existing provider-aware direct email abstraction.
7. Any email error is logged and swallowed.

### Why This Design

- It matches the existing follow-up email pattern already used in the backend.
- It keeps email formatting and delivery logic out of the task service.
- It avoids broad changes to the notification subsystem.
- It keeps the behavior easy to test and easy to extend later for additional task email events.

---

## Files

### Modify

- `backend/src/utils/email-templates.ts`
  Add a task-assignment email template.

- `backend/src/modules/emails/email.service.ts`
  Add a `sendTaskAssignmentEmail(taskId: string)` helper that loads task data, builds the template, and sends the email using existing email utilities.

- `backend/src/modules/tasks/task.service.ts`
  Call `sendTaskAssignmentEmail(task.id)` after task creation for all tasks, including self-assigned tasks.

### Test

- `backend/src/modules/emails/__tests__/email.service.test.ts` or the closest existing email service test file
  Add coverage for task-assignment email sending logic.

- `backend/src/modules/tasks/__tests__/task.service.test.ts` if present
  Add coverage to verify task creation triggers the email helper for both normal assignment and self-assignment.

If those test files do not exist yet, create focused tests in the nearest existing module test location rather than broad integration tests.

---

## Template Design

### Subject

Use a clear assignment subject that works for both normal and self-assigned tasks.

Recommended subject shape:
- `New Task Assigned: <task title>`

This subject is acceptable for self-assigned tasks as well because the recipient is still receiving a newly created task assignment.

### Body Structure

The email body should contain:
- heading: new task assigned
- a short intro line
- a details card with the task fields
- a primary CTA button linking to the tasks page

The details card should include only fields with values. Optional fields should not render empty placeholders.

### Date Formatting

Use the same `toLocaleDateString('en-US', ...)` style already used in existing email templates for consistency.

---

## Data Requirements

The task email helper needs enough data to render the email without extra ad hoc lookups in the template:
- task core fields
- assignee user name and email
- assigner user name
- task type name and color is optional, but at minimum task type name when present

If `referredByMemberId` is present, resolve the member name for display.
If `referredByName` is present and no member reference is available, display that text.

---

## Error Handling

The task service must not fail the request because email delivery failed.

Expected behavior:
- task creation succeeds
- response returns the created task
- email failure is logged with task ID and recipient context

The new helper should follow the same non-fatal logging style used by the follow-up email flow.

---

## Testing

### Behavior Tests

Add tests for:
- sending a task-assignment email to a different assignee
- sending a task-assignment email for a self-assigned task
- not sending the email to the creator separately
- not failing task creation when the email helper throws

### Template/Data Tests

Verify the helper includes:
- title
- due date
- priority
- description when present
- task type when present
- assigner identity

### Regression Focus

Confirm existing behavior is preserved:
- self-assigned tasks still start as `IN_PROGRESS`
- non-self-assigned tasks still create in-app `TASK_ASSIGNED` notifications
- task creation API response shape does not change

---

## Operational Notes

- The email delivery path should use the existing direct provider selection in `sendEmail()`.
- No new environment variables are required.
- This feature depends on the existing email provider setup being valid.

---

## Open Decisions Resolved

- Recipient: assignee only
- Self-assigned tasks: email still sent
- Creator copy: not sent
- Delivery failure: non-fatal
