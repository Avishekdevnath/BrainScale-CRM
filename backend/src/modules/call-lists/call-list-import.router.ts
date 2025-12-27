import { Router } from 'express';
import * as callListImportController from './call-list-import.controller';
import { zodValidator } from '../../middleware/validate';
import { authGuard } from '../../middleware/auth-guard';
import { tenantGuard } from '../../middleware/tenant-guard';
import { requirePermission } from '../../middleware/permission-guard';
// Rate limiters disabled for testing
// import { uploadLimiter } from '../../middleware/rate-limit';
import { upload } from '../../utils/upload';
import { CommitCallListImportSchema } from './call-list-import.schemas';

const router = Router({ mergeParams: true }); // mergeParams to access :listId from parent router

/**
 * @openapi
 * /call-lists/{listId}/import/preview:
 *   post:
 *     summary: Upload CSV/XLSX file and preview for call list import
 *     description: |
 *       Upload a file containing student data to import into a call list.
 *       The file will be parsed and a preview with column mapping suggestions will be returned.
 *       Students will be automatically matched or created and assigned to the call list's group and batch.
 *     tags: [Call Lists]
 *     parameters:
 *       - in: path
 *         name: listId
 *         required: true
 *         schema:
 *           type: string
 *         description: Call list ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV or XLSX file with student data (name, email, phone)
 *     responses:
 *       200:
 *         description: File parsed and preview generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 headers:
 *                   type: array
 *                   items:
 *                     type: string
 *                 previewRows:
 *                   type: array
 *                   items:
 *                     type: object
 *                 totalRows:
 *                   type: number
 *                 suggestions:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     phone:
 *                       type: string
 *                 matchingStats:
 *                   type: object
 *                   properties:
 *                     willMatch:
 *                       type: number
 *                     willCreate:
 *                       type: number
 *                     willSkip:
 *                       type: number
 *                 importId:
 *                   type: string
 *                   description: Import ID to use in commit request
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid file or file is empty
 *       404:
 *         description: Call list not found
 */
router.post(
  '/preview',
  authGuard,
  tenantGuard,
  requirePermission('call_lists', 'update'),
  /* uploadLimiter, */
  upload.single('file'),
  callListImportController.previewCallListImport
);

/**
 * @openapi
 * /call-lists/{listId}/import/commit:
 *   post:
 *     summary: Commit call list import (match/create students and add to call list)
 *     description: |
 *       Commit the import by matching or creating students from the preview data.
 *       Students will be automatically:
 *       - Matched by email, phone, or name (based on matchBy strategy)
 *       - Created if not found and createNewStudents is true
 *       - Assigned to the call list's group (if groupId exists)
 *       - Assigned to the call list's batch (if batchId exists)
 *       - Added to the call list
 *     tags: [Call Lists]
 *     parameters:
 *       - in: path
 *         name: listId
 *         required: true
 *         schema:
 *           type: string
 *         description: Call list ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - importId
 *               - columnMapping
 *             properties:
 *               importId:
 *                 type: string
 *                 description: Import ID from preview response
 *               columnMapping:
 *                 type: object
 *                 description: Map CSV columns to student fields
 *                 additionalProperties:
 *                   type: string
 *                 example:
 *                   name: "Full Name"
 *                   email: "Email Address"
 *                   phone: "Phone Number"
 *               matchBy:
 *                 type: string
 *                 enum: [email, phone, name, email_or_phone]
 *                 default: email_or_phone
 *                 description: Strategy for matching existing students
 *               createNewStudents:
 *                 type: boolean
 *                 default: true
 *                 description: Create new students if not found
 *               skipDuplicates:
 *                 type: boolean
 *                 default: true
 *                 description: Skip duplicate students in file
 *     responses:
 *       200:
 *         description: Import committed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 stats:
 *                   type: object
 *                   properties:
 *                     matched:
 *                       type: number
 *                       description: Students matched and added
 *                     created:
 *                       type: number
 *                       description: Students created and added
 *                     added:
 *                       type: number
 *                       description: Total students added to call list
 *                     duplicates:
 *                       type: number
 *                       description: Duplicate students skipped
 *                     errors:
 *                       type: number
 *                       description: Rows with errors
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Error messages (first 10)
 *       400:
 *         description: Invalid request or import data expired
 *       404:
 *         description: Call list not found
 */
router.post(
  '/commit',
  authGuard,
  tenantGuard,
  requirePermission('call_lists', 'update'),
  zodValidator(CommitCallListImportSchema),
  callListImportController.commitCallListImport
);

export default router;

