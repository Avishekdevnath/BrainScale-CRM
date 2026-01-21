import { Router } from 'express';
import * as callListController from './call-list.controller';
import { zodValidator } from '../../middleware/validate';
import { authGuard, requireRole } from '../../middleware/auth-guard';
import { tenantGuard } from '../../middleware/tenant-guard';
import { requirePermission } from '../../middleware/permission-guard';
import {
  CreateCallListSchema,
  UpdateCallListSchema,
  AddCallListItemsSchema,
  AssignCallListItemsSchema,
  UnassignCallListItemsSchema,
  RemoveCallListItemsSchema,
  UpdateCallListItemSchema,
  GetAvailableStudentsSchema,
  BulkPasteCallListSchema,
  CreateCallListFromFollowupsSchema,
  ListCallListsSchema,
  ListCallListItemsSchema,
} from './call-list.schemas';

const router = Router();

/**
 * @openapi
 * /call-lists:
 *   post:
 *     summary: Create a call list
 *     description: |
 *       Create a call list. Either groupId, batchId, studentIds, OR studentsData must be provided.
 *       - If groupId is provided, creates a group-specific call list
 *       - If batchId is provided, creates a workspace-level call list filtered by batch
 *       - If batchId + groupId: Group must belong to the specified batch
 *       - If studentIds is provided, creates a workspace-level call list and automatically adds students (must exist)
 *       - If studentsData is provided, creates a workspace-level call list and automatically creates/matches students
 *       - If batchId + studentIds: Filters students by batch
 *       - groupIds can be used to filter students when studentIds is provided
 *     tags: [Call Lists]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - source
 *             properties:
 *               groupId:
 *                 type: string
 *                 description: Optional - Group ID for group-specific call lists
 *               batchId:
 *                 type: string
 *                 description: |
 *                   Optional - Batch ID for filtering students by batch.
 *                   - If batchId alone: Creates workspace-level call list (students filtered by batch)
 *                   - If batchId + groupId: Group must belong to the specified batch
 *                   - If batchId + studentIds: Filters students by batch
 *               name:
 *                 type: string
 *                 minLength: 2
 *               source:
 *                 type: string
 *                 enum: [IMPORT, FILTER, MANUAL]
 *               description:
 *                 type: string
 *                 description: Optional description for the call list
 *               studentIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: |
 *                   Optional - Student IDs to add directly. If provided, students are automatically added to the call list (students must exist)
 *               studentsData:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - name
 *                   properties:
 *                     name:
 *                       type: string
 *                       minLength: 1
 *                     email:
 *                       type: string
 *                       format: email
 *                     phone:
 *                       type: string
 *                 description: |
 *                   Optional - Student data for auto-creation. Students are matched by email/phone first, then created if not found
 *               matchBy:
 *                 type: string
 *                 enum: [email, phone, email_or_phone, name]
 *                 default: email_or_phone
 *                 description: |
 *                   Optional - Matching strategy for studentsData (default: email_or_phone)
 *               skipDuplicates:
 *                 type: boolean
 *                 default: true
 *                 description: |
 *                   Optional - Skip duplicate students when using studentsData (default: true)
 *               groupIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: |
 *                   Optional - Filter students by these group IDs when studentIds is provided
 *               messages:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: |
 *                   Optional - Array of messages to convey during calls
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     question:
 *                       type: string
 *                     type:
 *                       type: string
 *                       enum: [text, yes_no, multiple_choice, number, date]
 *                     options:
 *                       type: array
 *                       items:
 *                         type: string
 *                     required:
 *                       type: boolean
 *                     order:
 *                       type: number
 *                 description: |
 *                   Optional - Array of questions to ask during calls
 *               meta:
 *                 type: object
 *                 description: Custom fields configuration (JSON)
 *     responses:
 *       201:
 *         description: Call list created
 *       400:
 *         description: Either groupId, batchId, studentIds, or studentsData must be provided, or group does not belong to batch, or both studentIds and studentsData provided
 */
router.post(
  '/',
  authGuard,
  tenantGuard,
  requirePermission('call_lists', 'create'),
  zodValidator(CreateCallListSchema),
  callListController.createCallList
);

/**
 * @openapi
 * /call-lists/bulk-paste:
 *   post:
 *     summary: Create call list from bulk pasted data
 *     description: |
 *       Create a call list by pasting CSV/text data. 
 *       No batch or group dependencies required.
 *       Students are created/matched and added to the call list.
 *       
 *       Column mapping supports two formats:
 *       1. Old format (backward compatible): { name: "Full Name", email: "Email", phone: "Phone" }
 *       2. New flexible format (like student import): 
 *          { "student.name": "Full Name", "student.email": "Email", "phone.0": "Phone", "phone.1": "Mobile" }
 *       
 *       Flexible format supports:
 *       - student.name, student.email, student.discordId, student.tags
 *       - phone.0, phone.1, phone.2 (indexed phones, first is primary)
 *       - phone.primary, phone.secondary, phone.alternate (named phones)
 *     tags: [Call Lists]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - data
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               data:
 *                 type: string
 *                 description: CSV or tab-separated text data
 *               columnMapping:
 *                 oneOf:
 *                   - type: object
 *                     description: Old format (backward compatible)
 *                     properties:
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       phone:
 *                         type: string
 *                   - type: object
 *                     description: New flexible format (like student import)
 *                     additionalProperties:
 *                       type: string
 *                     example:
 *                       "student.name": "Full Name"
 *                       "student.email": "Email"
 *                       "phone.0": "Phone"
 *                       "phone.1": "Mobile"
 *               matchBy:
 *                 type: string
 *                 enum: [email, phone, email_or_phone, name]
 *                 default: email_or_phone
 *               createNewStudents:
 *                 type: boolean
 *                 default: true
 *               skipDuplicates:
 *                 type: boolean
 *                 default: true
 *               messages:
 *                 type: array
 *                 items:
 *                   type: string
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Call list created with students
 */
router.post(
  '/bulk-paste',
  authGuard,
  tenantGuard,
  requirePermission('call_lists', 'create'),
  zodValidator(BulkPasteCallListSchema),
  callListController.createFromBulkPaste
);

/**
 * @openapi
 * /call-lists/from-followups:
 *   post:
 *     summary: Create call list from selected follow-ups
 *     description: |
 *       Admin-only feature. Creates a new call list with items from selected follow-ups.
 *       Each call list item preserves the follow-up's note in the custom field.
 *       Uses messages and questions from the first follow-up's call list (or provided).
 *     tags: [Call Lists]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - followupIds
 *               - name
 *             properties:
 *               followupIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of follow-up IDs to include
 *               name:
 *                 type: string
 *                 minLength: 2
 *               source:
 *                 type: string
 *                 enum: [IMPORT, FILTER, MANUAL]
 *                 default: FILTER
 *               description:
 *                 type: string
 *               messages:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Optional - Messages to convey. If not provided, uses first follow-up's call list messages.
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: Optional - Questions to ask. If not provided, uses first follow-up's call list questions.
 *               meta:
 *                 type: object
 *                 description: Custom fields configuration (JSON)
 *     responses:
 *       201:
 *         description: Call list created from follow-ups
 *       403:
 *         description: Only admins can create call lists from follow-ups
 *       404:
 *         description: One or more follow-ups not found
 *       400:
 *         description: Invalid request (e.g., non-PENDING follow-ups, missing call lists)
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/from-followups',
  authGuard,
  tenantGuard,
  requirePermission('call_lists', 'create'),
  zodValidator(CreateCallListFromFollowupsSchema),
  callListController.createCallListFromFollowups
);

/**
 * @openapi
 * /call-lists:
 *   get:
 *     summary: List call lists
 *     tags: [Call Lists]
 *     parameters:
 *       - in: query
 *         name: groupId
 *         schema:
 *           type: string
 *       - in: query
 *         name: batchId
 *         schema:
 *           type: string
 *         description: Filter call lists by batch (via group's batchId)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, COMPLETED, ARCHIVED]
 *         description: Filter call lists by status (defaults to ACTIVE if not specified)
 *     responses:
 *       200:
 *         description: List of call lists
 */
router.get(
  '/',
  authGuard,
  tenantGuard,
  requirePermission('call_lists', 'read'),
  zodValidator(ListCallListsSchema, 'query'),
  callListController.listCallLists
);

/**
 * @openapi
 * /call-lists/{listId}:
 *   get:
 *     summary: Get call list details
 *     tags: [Call Lists]
 *     parameters:
 *       - in: path
 *         name: listId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Call list details
 */
router.get(
  '/:listId',
  authGuard,
  tenantGuard,
  requirePermission('call_lists', 'read'),
  callListController.getCallList
);

/**
 * @openapi
 * /call-lists/{listId}:
 *   patch:
 *     summary: Update a call list
 *     tags: [Call Lists]
 *     parameters:
 *       - in: path
 *         name: listId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               messages:
 *                 type: array
 *                 items:
 *                   type: string
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *               meta:
 *                 type: object
 *     responses:
 *       200:
 *         description: Call list updated
 */
router.patch(
  '/:listId',
  authGuard,
  tenantGuard,
  requirePermission('call_lists', 'update'),
  zodValidator(UpdateCallListSchema),
  callListController.updateCallList
);

/**
 * @openapi
 * /call-lists/{listId}/complete:
 *   patch:
 *     summary: Mark call list as complete (Admin only)
 *     tags: [Call Lists]
 *     parameters:
 *       - in: path
 *         name: listId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Call list marked as complete
 *       403:
 *         description: Only admins can mark call lists as complete
 *       404:
 *         description: Call list not found
 */
router.patch(
  '/:listId/complete',
  authGuard,
  tenantGuard,
  requirePermission('call_lists', 'update'),
  callListController.markCallListComplete
);

/**
 * @openapi
 * /call-lists/{listId}/reopen:
 *   patch:
 *     summary: Mark call list as active (reopen) - Admin only
 *     tags: [Call Lists]
 *     parameters:
 *       - in: path
 *         name: listId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Call list reopened
 *       403:
 *         description: Only admins can reopen call lists
 *       404:
 *         description: Call list not found
 */
router.patch(
  '/:listId/reopen',
  authGuard,
  tenantGuard,
  requirePermission('call_lists', 'update'),
  callListController.markCallListActive
);

/**
 * @openapi
 * /call-lists/{listId}/items/unassign:
 *   patch:
 *     summary: Unassign call list items
 *     tags: [Call Lists]
 *     parameters:
 *       - in: path
 *         name: listId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - itemIds
 *             properties:
 *               itemIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Items unassigned
 */
router.patch(
  '/:listId/items/unassign',
  authGuard,
  tenantGuard,
  requirePermission('call_lists', 'update'),
  zodValidator(UnassignCallListItemsSchema),
  callListController.unassignCallListItems
);

/**
 * @openapi
 * /call-lists/{listId}/items/remove:
 *   post:
 *     summary: Remove call list items (bulk delete)
 *     tags: [Call Lists]
 *     parameters:
 *       - in: path
 *         name: listId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - itemIds
 *             properties:
 *               itemIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Items removed
 */
router.post(
  '/:listId/items/remove',
  authGuard,
  tenantGuard,
  requirePermission('call_lists', 'update'),
  zodValidator(RemoveCallListItemsSchema),
  callListController.removeCallListItems
);

/**
 * @openapi
 * /call-lists/{listId}:
 *   delete:
 *     summary: Delete a call list
 *     tags: [Call Lists]
 *     parameters:
 *       - in: path
 *         name: listId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Call list deleted
 */
router.delete(
  '/:listId',
  authGuard,
  tenantGuard,
  requirePermission('call_lists', 'delete'),
  callListController.deleteCallList
);

/**
 * @openapi
 * /call-lists/{listId}/available-students:
 *   get:
 *     summary: Get available students for a call list
 *     description: |
 *       Returns students that can be added to the call list.
 *       - Excludes students already in the call list
 *       - Automatically filters by call list's group (if it has one)
 *       - Supports search and additional filters
 *     tags: [Call Lists]
 *     parameters:
 *       - in: path
 *         name: listId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query (name, email, phone)
 *       - in: query
 *         name: batchId
 *         schema:
 *           type: string
 *         description: Additional batch filter
 *       - in: query
 *         name: courseId
 *         schema:
 *           type: string
 *       - in: query
 *         name: moduleId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [NEW, IN_PROGRESS, FOLLOW_UP, CONVERTED, LOST]
 *     responses:
 *       200:
 *         description: Paginated list of available students
 *       404:
 *         description: Call list not found
 */
router.get(
  '/:listId/available-students',
  authGuard,
  tenantGuard,
  requirePermission('call_lists', 'update'),
  zodValidator(GetAvailableStudentsSchema, 'query'),
  callListController.getAvailableStudents
);

/**
 * @openapi
 * /call-lists/{listId}/items:
 *   post:
 *     summary: Add students to call list (bulk)
 *     tags: [Call Lists]
 *     parameters:
 *       - in: path
 *         name: listId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentIds
 *             properties:
 *               studentIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Items added
 */
router.post(
  '/:listId/items',
  authGuard,
  tenantGuard,
  requirePermission('call_lists', 'update'),
  zodValidator(AddCallListItemsSchema),
  callListController.addCallListItems
);

/**
 * @openapi
 * /call-lists/{listId}/items:
 *   get:
 *     summary: List call list items
 *     description: |
 *       Returns paginated list of call list items with optional filtering.
 *       Includes call log data (summary note, follow-up date, status) when available.
 *     tags: [Call Lists]
 *     parameters:
 *       - in: path
 *         name: listId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *           enum: [QUEUED, CALLING, DONE, SKIPPED]
 *         description: Filter by call list item state
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
 *         description: Filter by assigned workspace member ID
 *       - in: query
 *         name: callLogStatus
 *         schema:
 *           type: string
 *           enum: [completed, missed, busy, no_answer, voicemail, other]
 *         description: Filter by call log status (only items with call logs)
 *       - in: query
 *         name: followUpRequired
 *         schema:
 *           type: boolean
 *         description: Filter by follow-up required (true/false, only items with call logs)
 *     responses:
 *       200:
 *         description: Paginated list of items with call log data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       callListId:
 *                         type: string
 *                       studentId:
 *                         type: string
 *                       assignedTo:
 *                         type: string
 *                         nullable: true
 *                       callLogId:
 *                         type: string
 *                         nullable: true
 *                       state:
 *                         type: string
 *                         enum: [QUEUED, CALLING, DONE, SKIPPED]
 *                       priority:
 *                         type: number
 *                       custom:
 *                         type: object
 *                         nullable: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                       student:
 *                         type: object
 *                       assignee:
 *                         type: object
 *                         nullable: true
 *                       callLog:
 *                         type: object
 *                         nullable: true
 *                         description: Call log data (null if no call log exists)
 *                         properties:
 *                           id:
 *                             type: string
 *                           status:
 *                             type: string
 *                             enum: [completed, missed, busy, no_answer, voicemail, other]
 *                           summaryNote:
 *                             type: string
 *                             nullable: true
 *                             description: AI-generated summary note
 *                           followUpDate:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                           followUpRequired:
 *                             type: boolean
 *                           callerNote:
 *                             type: string
 *                             nullable: true
 *                             description: Caller's manual notes
 *                           notes:
 *                             type: string
 *                             nullable: true
 *                           callDate:
 *                             type: string
 *                             format: date-time
 *                           callDuration:
 *                             type: number
 *                             nullable: true
 *                             description: Duration in seconds
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: number
 *                     size:
 *                       type: number
 *                     total:
 *                       type: number
 *                     totalPages:
 *                       type: number
 */
router.get(
  '/:listId/items',
  authGuard,
  tenantGuard,
  requirePermission('call_lists', 'read'),
  zodValidator(ListCallListItemsSchema, 'query'),
  callListController.listCallListItems
);

/**
 * @openapi
 * /call-lists/{listId}/items/assign:
 *   patch:
 *     summary: Assign call list items (bulk)
 *     tags: [Call Lists]
 *     parameters:
 *       - in: path
 *         name: listId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - itemIds
 *             properties:
 *               itemIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               assignedTo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Items assigned
 */
router.patch(
  '/:listId/items/assign',
  authGuard,
  tenantGuard,
  requirePermission('call_lists', 'update'),
  zodValidator(AssignCallListItemsSchema),
  callListController.assignCallListItems
);

// Import router for call list imports
import callListImportRouter from './call-list-import.router';
router.use('/:listId/import', callListImportRouter);

export default router;

// Separate router for call list items (mounted at /call-list-items)
export const callListItemRouter = Router();

/**
 * @openapi
 * /call-list-items/{itemId}:
 *   patch:
 *     summary: Update a call list item
 *     tags: [Call Lists]
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               state:
 *                 type: string
 *                 enum: [QUEUED, CALLING, DONE, SKIPPED]
 *               priority:
 *                 type: integer
 *               custom:
 *                 type: object
 *     responses:
 *       200:
 *         description: Item updated
 */
callListItemRouter.patch(
  '/:itemId',
  authGuard,
  tenantGuard,
  requirePermission('call_lists', 'update'),
  zodValidator(UpdateCallListItemSchema),
  callListController.updateCallListItem
);

/**
 * @openapi
 * /call-list-items/{itemId}:
 *   delete:
 *     summary: Delete a call list item (remove student from call list)
 *     tags: [Call Lists]
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item deleted successfully
 *       404:
 *         description: Item not found
 */
callListItemRouter.delete(
  '/:itemId',
  authGuard,
  tenantGuard,
  requirePermission('call_lists', 'update'),
  callListController.deleteCallListItem
);

