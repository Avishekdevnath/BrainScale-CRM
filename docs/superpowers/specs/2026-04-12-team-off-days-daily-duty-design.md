# Team Off Days and Daily Duty Scheduling (Weekly Template)

## Summary
Add a weekly schedule template per workspace that repeats every week. The schedule is a grid by day-of-week and batch, with slots grouped under headings (e.g., Support Session, Group Monitoring). Members can be assigned to duty per slot. Off days and swaps are handled by per-date exceptions. Only active batches (`Batch.isActive=true`) appear in the grid.

## Goals
- Provide a reusable weekly schedule that matches the table format shared.
- Allow all workspace users to manage the schedule for now.
- Support batch add/archive; archived batches are hidden in the schedule.
- Allow per-date off days and per-slot overrides without changing the base template.

## Non-Goals (for now)
- Complex auto-rostering or fair rotation logic.
- Cross-workspace scheduling.
- Public sharing.

## Data Model
Reuse existing `Batch` for row grouping; only active batches are shown in the schedule.

New models (Prisma):

- `WeeklyScheduleTemplate`
  - `id`
  - `workspaceId`
  - `name` (string, default "Default Schedule")
  - `isActive` (bool, default true)
  - `createdAt`, `updatedAt`

- `ScheduleSlot`
  - `id`
  - `templateId`
  - `dayOfWeek` (int 0-6, Sunday=0)
  - `batchId` (nullable; supports future non-batch rows)
  - `slotGroup` (string: "Support Session", "Group Monitoring")
  - `slotLabel` (string: "Morning (11-1)")
  - `startTime` (string "HH:mm")
  - `endTime` (string "HH:mm")
  - `order` (int, for stable column order)

- `ScheduleAssignment`
  - `id`
  - `slotId`
  - `memberId`
  - `roleLabel` (optional string, e.g., "Lead")
  - Unique on (`slotId`, `memberId`) to prevent duplicates.

- `ScheduleException`
  - `id`
  - `workspaceId`
  - `date` (date only, stored as UTC date)
  - `memberId` (nullable; null when exception is slot-level only)
  - `type` ("OFF_DAY" | "SLOT_OVERRIDE")
  - `slotId` (nullable, required for SLOT_OVERRIDE)
  - `overrideMemberId` (nullable, required for SLOT_OVERRIDE)
  - `note` (optional)
  - `createdAt`

Indexes:
- `ScheduleSlot`: (`templateId`, `dayOfWeek`, `batchId`)
- `ScheduleAssignment`: (`slotId`)
- `ScheduleException`: (`workspaceId`, `date`, `memberId`)

## Business Rules
- Base weekly schedule repeats every week.
- Only `Batch.isActive=true` appear in the schedule grid.
- Off day exception:
  - `ScheduleException(type=OFF_DAY, memberId, date)` excludes that member from duty for that date.
- Slot override exception:
  - `ScheduleException(type=SLOT_OVERRIDE, slotId, date, overrideMemberId)` replaces the base assignment for that slot on that date.
- If both exist:
  - Slot override takes precedence for that slot/date.
  - Off day excludes member unless explicitly overridden in a slot override.

## API Surface (backend)
All endpoints under `api/v1/schedule`:

- `GET /template`
  - Returns active template, slots, assignments, and active batches.
- `PUT /template`
  - Bulk replace template slots + assignments from the grid.
  - Validation: dayOfWeek 0-6; time format HH:mm; only active batches allowed.
- `GET /exceptions?date=YYYY-MM-DD`
  - Returns exceptions for a date.
- `POST /exceptions`
  - Creates OFF_DAY or SLOT_OVERRIDE.
- `DELETE /exceptions/:id`
  - Removes exception.

Permissions:
- For now, any workspace member can read/write schedule and exceptions.

## UI/UX
- Weekly grid matching provided screenshot:
  - Rows: Day + Batch (only active batches).
  - Columns grouped by slotGroup.
  - Each cell shows assigned member(s).
  - Click cell to edit assignment(s).
- Exceptions panel:
  - Date picker.
  - Add member off day.
  - Add slot override (pick slot + override member).

## Validation and Error Handling
- Prevent assignments to non-members.
- Prevent slot overrides without slotId/date/overrideMemberId.
- Reject template updates that include inactive batch IDs.
- Allow empty slots (no assignment).

## Notifications (optional, later)
- If needed, can add in-app notifications for duty changes.

## Migration/Seed
- Create a default template for each workspace on first use.
- Seed a common set of slots (Support Session + Group Monitoring) configurable by admin later.

## Testing
- Unit: schedule service validations.
- Integration: template save/load, exception apply logic.

