import { Router } from 'express';
import * as taskController from './task.controller';
import * as taskTypeController from './task-type.controller';
import { zodValidator } from '../../middleware/validate';
import { authGuard } from '../../middleware/auth-guard';
import { tenantGuard } from '../../middleware/tenant-guard';
import { requirePermission } from '../../middleware/permission-guard';
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  CompleteTaskSchema,
  DeclineTaskSchema,
  ListTasksSchema,
} from './task.schemas';
import {
  CreateTaskTypeSchema,
  UpdateTaskTypeSchema,
} from './task-type.schemas';

const router = Router();

// ── Task Types (all authenticated workspace members) ──────────────────────────
router.get('/types', authGuard, tenantGuard, taskTypeController.listTaskTypes);
router.post('/types', authGuard, tenantGuard, zodValidator(CreateTaskTypeSchema), taskTypeController.createTaskType);
router.patch('/types/:typeId', authGuard, tenantGuard, zodValidator(UpdateTaskTypeSchema), taskTypeController.updateTaskType);
router.delete('/types/:typeId', authGuard, tenantGuard, taskTypeController.deleteTaskType);

// GET /tasks/kpi — MUST come before /:taskId to avoid Express matching "kpi" as a taskId
router.get(
  '/kpi',
  authGuard,
  tenantGuard,
  requirePermission('tasks', 'read'),
  taskController.getTaskKpi
);

router.post(
  '/',
  authGuard,
  tenantGuard,
  requirePermission('tasks', 'create'),
  zodValidator(CreateTaskSchema),
  taskController.createTask
);

router.get(
  '/',
  authGuard,
  tenantGuard,
  requirePermission('tasks', 'read'),
  zodValidator(ListTasksSchema, 'query'),
  taskController.listTasks
);

router.get(
  '/:taskId',
  authGuard,
  tenantGuard,
  requirePermission('tasks', 'read'),
  taskController.getTask
);

router.patch(
  '/:taskId',
  authGuard,
  tenantGuard,
  requirePermission('tasks', 'update'),
  zodValidator(UpdateTaskSchema),
  taskController.updateTask
);

router.patch(
  '/:taskId/accept',
  authGuard,
  tenantGuard,
  requirePermission('tasks', 'update'),
  taskController.acceptTask
);

router.patch(
  '/:taskId/start',
  authGuard,
  tenantGuard,
  requirePermission('tasks', 'update'),
  taskController.startTask
);

router.patch(
  '/:taskId/decline',
  authGuard,
  tenantGuard,
  requirePermission('tasks', 'update'),
  zodValidator(DeclineTaskSchema),
  taskController.declineTask
);

router.patch(
  '/:taskId/complete',
  authGuard,
  tenantGuard,
  requirePermission('tasks', 'update'),
  zodValidator(CompleteTaskSchema),
  taskController.completeTask
);

router.delete(
  '/:taskId',
  authGuard,
  tenantGuard,
  requirePermission('tasks', 'delete'),
  taskController.deleteTask
);

export default router;
