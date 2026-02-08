import { Router } from 'express';
import * as studentController from './student.controller';
import { zodValidator } from '../../middleware/validate';
import { authGuard } from '../../middleware/auth-guard';
import { tenantGuard } from '../../middleware/tenant-guard';
import { requirePermission } from '../../middleware/permission-guard';
import {
  CreateStudentSchema,
  UpdateStudentSchema,
  AddPhoneSchema,
  BulkPasteStudentsSchema,
  AddStudentToBatchSchema,
  SetStudentBatchesSchema,
  BulkDeleteStudentsSchema,
} from './student.schemas';

const router = Router();

/**
 * @openapi
 * /students:
 *   post:
 *     summary: Create a new student
 *     tags: [Students]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               phones:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     phone:
 *                       type: string
 *                     isPrimary:
 *                       type: boolean
 *     responses:
 *       201:
 *         description: Student created
 */
router.post(
  '/',
  authGuard,
  tenantGuard,
  requirePermission('students', 'create'),
  zodValidator(CreateStudentSchema),
  studentController.createStudent
);

/**
 * @openapi
 * /students:
 *   get:
 *     summary: Search and list students
 *     tags: [Students]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query (name, email, phone)
 *       - in: query
 *         name: groupId
 *         schema:
 *           type: string
 *       - in: query
 *         name: courseId
 *         schema:
 *           type: string
 *       - in: query
 *         name: moduleId
 *         schema:
 *           type: string
 *       - in: query
 *         name: batchId
 *         schema:
 *           type: string
 *         description: Filter by batch ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [NEW, IN_PROGRESS, FOLLOW_UP, CONVERTED, LOST]
 *     responses:
 *       200:
 *         description: Paginated list of students
 */
router.get(
  '/',
  authGuard,
  tenantGuard,
  requirePermission('students', 'read'),
  studentController.listStudents
);

// Fix Bangladesh phone numbers imported without '+' (e.g. 88018... -> 018...)
router.post(
  '/fix-bd-phones',
  authGuard,
  tenantGuard,
  requirePermission('students', 'update'),
  studentController.fixBangladeshPhones
);

// Merge duplicate students (by email) in this workspace
router.post(
  '/fix-duplicates',
  authGuard,
  tenantGuard,
  requirePermission('students', 'update'),
  studentController.fixDuplicateStudents
);

router.post(
  '/bulk-delete',
  authGuard,
  tenantGuard,
  requirePermission('students', 'delete'),
  zodValidator(BulkDeleteStudentsSchema),
  studentController.bulkDeleteStudents
);

/**
 * @openapi
 * /students/{studentId}:
 *   get:
 *     summary: Get student profile with timeline
 *     tags: [Students]
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Student profile
 */
router.get(
  '/:studentId',
  authGuard,
  tenantGuard,
  requirePermission('students', 'read'),
  studentController.getStudent
);

/**
 * @openapi
 * /students/{studentId}:
 *   patch:
 *     summary: Update student
 *     tags: [Students]
 *     parameters:
 *       - in: path
 *         name: studentId
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
 *               email:
 *                 type: string
 *                 format: email
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Student updated
 */
router.patch(
  '/:studentId',
  authGuard,
  tenantGuard,
  requirePermission('students', 'update'),
  zodValidator(UpdateStudentSchema),
  studentController.updateStudent
);

/**
 * @openapi
 * /students/{studentId}:
 *   delete:
 *     summary: Soft delete a student
 *     tags: [Students]
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Student deleted
 */
router.delete(
  '/:studentId',
  authGuard,
  tenantGuard,
  requirePermission('students', 'delete'),
  studentController.deleteStudent
);

/**
 * @openapi
 * /students/{studentId}/phones:
 *   post:
 *     summary: Add phone to student
 *     tags: [Students]
 *     parameters:
 *       - in: path
 *         name: studentId
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
 *               - phone
 *             properties:
 *               phone:
 *                 type: string
 *               isPrimary:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Phone added
 */
router.post(
  '/:studentId/phones',
  authGuard,
  tenantGuard,
  requirePermission('students', 'update'),
  zodValidator(AddPhoneSchema),
  studentController.addPhone
);

/**
 * @openapi
 * /students/{studentId}/phones/{phoneId}:
 *   delete:
 *     summary: Remove phone from student
 *     tags: [Students]
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: phoneId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Phone removed
 */
router.delete(
  '/:studentId/phones/:phoneId',
  authGuard,
  tenantGuard,
  requirePermission('students', 'update'),
  studentController.removePhone
);

/**
 * @openapi
 * /students/bulk-paste:
 *   post:
 *     summary: Bulk import students from pasted CSV data with flexible column mapping
 *     tags: [Students]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rows
 *               - mapping
 *             properties:
 *               rows:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: Parsed rows from pasted CSV (header row included in keys)
 *               mapping:
 *                 oneOf:
 *                   - type: object
 *                     description: Old format (backward compatible)
 *                     required:
 *                       - name
 *                     properties:
 *                       name:
 *                         type: string
 *                         description: Column name for full name (required)
 *                       email:
 *                         type: string
 *                         description: Column name for email
 *                       phone:
 *                         type: string
 *                         description: Column name for primary phone
 *                       tags:
 *                         type: string
 *                         description: Column name for comma-separated tags
 *                   - type: object
 *                     description: New flexible format with field paths
 *                     additionalProperties:
 *                       type: string
 *                     example:
 *                       student.name: "Full Name"
 *                       student.email: "Email Address"
 *                       phone.0: "Primary Phone"
 *                       phone.1: "Secondary Phone"
 *                       student.tags: "Tags"
 *                       enrollment.groupName: "Group"
 *                       enrollment.courseName: "Course"
 *                       enrollment.status: "Status"
 *               groupId:
 *                 type: string
 *                 description: "Optional group ID to assign all imported students to. If provided, students will be enrolled in this group after creation. Note: If enrollment.groupName is provided in CSV, it takes precedence per row."
 *     responses:
 *       200:
 *         description: Bulk import result summary
 *       400:
 *         description: Validation error or group not found
 *       403:
 *         description: Access denied to the specified group
 */
router.post(
  '/bulk-paste',
  authGuard,
  tenantGuard,
  requirePermission('students', 'create'),
  zodValidator(BulkPasteStudentsSchema),
  studentController.bulkImportFromPaste
);

/**
 * @openapi
 * /students/export/csv:
 *   get:
 *     summary: Export students as a CSV file with flexible column selection
 *     tags: [Students]
 *     parameters:
 *       - in: query
 *         name: groupId
 *         schema:
 *           type: string
 *         description: Optional group ID to filter students. If provided, only exports students enrolled in this group.
 *       - in: query
 *         name: batchId
 *         schema:
 *           type: string
 *         description: Optional batch ID to filter students. If provided, only exports students associated with this batch.
 *       - in: query
 *         name: columns
 *         schema:
 *           type: string
 *         description: "Comma-separated list of field paths to export. Default: student.name,student.email,phone.0,student.tags. Available fields: student.name, student.email, student.tags, phone.0, phone.1, phone.primary, enrollment.groupName, enrollment.courseName, enrollment.status, batch.names, batch.ids"
 *         example: "student.name,student.email,phone.0,phone.1,enrollment.groupName,enrollment.status,batch.names"
 *     responses:
 *       200:
 *         description: CSV export of students
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Validation error or group not found
 *       403:
 *         description: Access denied to the specified group
 */
router.get(
  '/export/csv',
  authGuard,
  tenantGuard,
  requirePermission('students', 'read'),
  studentController.exportStudentsCsv
);

/**
 * @openapi
 * /students/{studentId}/batches:
 *   post:
 *     summary: Add student to a batch
 *     tags: [Students]
 *     parameters:
 *       - in: path
 *         name: studentId
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
 *               - batchId
 *             properties:
 *               batchId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Student added to batch
 */
router.post(
  '/:studentId/batches',
  authGuard,
  tenantGuard,
  requirePermission('students', 'update'),
  zodValidator(AddStudentToBatchSchema),
  studentController.addStudentToBatch
);

/**
 * @openapi
 * /students/{studentId}/batches:
 *   get:
 *     summary: List all batches for a student
 *     tags: [Students]
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of batches for the student
 */
router.get(
  '/:studentId/batches',
  authGuard,
  tenantGuard,
  requirePermission('students', 'read'),
  studentController.getStudentBatches
);

/**
 * @openapi
 * /students/{studentId}/batches:
 *   put:
 *     summary: Replace all batches for a student
 *     tags: [Students]
 *     parameters:
 *       - in: path
 *         name: studentId
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
 *               - batchIds
 *             properties:
 *               batchIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Batches updated
 */
router.put(
  '/:studentId/batches',
  authGuard,
  tenantGuard,
  requirePermission('students', 'update'),
  zodValidator(SetStudentBatchesSchema),
  studentController.setStudentBatches
);

/**
 * @openapi
 * /students/{studentId}/batches/{batchId}:
 *   delete:
 *     summary: Remove student from a batch
 *     tags: [Students]
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Student removed from batch
 */
router.delete(
  '/:studentId/batches/:batchId',
  authGuard,
  tenantGuard,
  requirePermission('students', 'update'),
  studentController.removeStudentFromBatch
);

/**
 * @openapi
 * /students/{studentId}/stats:
 *   get:
 *     summary: Get student statistics
 *     tags: [Students]
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Student statistics
 */
router.get(
  '/:studentId/stats',
  authGuard,
  tenantGuard,
  requirePermission('students', 'read'),
  studentController.getStudentStats
);

export default router;

