import { Router } from 'express';
import * as aiChatController from './ai-chat.controller';
import { zodValidator } from '../../middleware/validate';
import { authGuard } from '../../middleware/auth-guard';
import { tenantGuard } from '../../middleware/tenant-guard';
import { 
  CreateChatSchema, 
  UpdateChatSchema, 
  ChatIdParamSchema,
  SendMessageSchema, 
  GetChatHistorySchema, 
  ExportChatHistorySchema, 
  ExportAIDataSchema 
} from './ai-chat.schemas';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting: 20 messages per minute per user
const chatRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per window
  message: 'Too many chat messages, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Chat CRUD routes
/**
 * @openapi
 * /ai-chat/chats:
 *   post:
 *     summary: Create a new chat
 *     tags: [AI Chat]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 200
 *     responses:
 *       201:
 *         description: Chat created
 */
router.post(
  '/chats',
  authGuard,
  tenantGuard,
  zodValidator(CreateChatSchema),
  aiChatController.createChat
);

/**
 * @openapi
 * /ai-chat/chats:
 *   get:
 *     summary: Get all chats for the current user
 *     tags: [AI Chat]
 *     responses:
 *       200:
 *         description: List of chats
 */
router.get(
  '/chats',
  authGuard,
  tenantGuard,
  aiChatController.getChats
);

/**
 * @openapi
 * /ai-chat/chats/{chatId}:
 *   get:
 *     summary: Get a specific chat by ID
 *     tags: [AI Chat]
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chat details
 *       404:
 *         description: Chat not found
 */
router.get(
  '/chats/:chatId',
  authGuard,
  tenantGuard,
  zodValidator(ChatIdParamSchema, 'params'),
  aiChatController.getChatById
);

/**
 * @openapi
 * /ai-chat/chats/{chatId}:
 *   patch:
 *     summary: Update chat title
 *     tags: [AI Chat]
 *     parameters:
 *       - in: path
 *         name: chatId
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
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 200
 *     responses:
 *       200:
 *         description: Chat updated
 *       404:
 *         description: Chat not found
 */
router.patch(
  '/chats/:chatId',
  authGuard,
  tenantGuard,
  zodValidator(ChatIdParamSchema, 'params'),
  zodValidator(UpdateChatSchema),
  aiChatController.updateChat
);

/**
 * @openapi
 * /ai-chat/chats/{chatId}:
 *   delete:
 *     summary: Delete a chat
 *     tags: [AI Chat]
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Chat deleted
 *       404:
 *         description: Chat not found
 */
router.delete(
  '/chats/:chatId',
  authGuard,
  tenantGuard,
  zodValidator(ChatIdParamSchema, 'params'),
  aiChatController.deleteChat
);

// Message routes (now chat-specific)
/**
 * @openapi
 * /ai-chat/messages:
 *   post:
 *     summary: Send a chat message to AI
 *     tags: [AI Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 5000
 *               chatId:
 *                 type: string
 *                 description: Optional chatId. If not provided, a new chat will be created.
 *     responses:
 *       201:
 *         description: Message sent and AI response received
 *       403:
 *         description: AI chat not enabled for workspace
 */
router.post(
  '/messages',
  authGuard,
  tenantGuard,
  chatRateLimit,
  zodValidator(SendMessageSchema),
  aiChatController.sendMessage
);

/**
 * @openapi
 * /ai-chat/chats/{chatId}/messages:
 *   get:
 *     summary: Get chat history for a specific chat
 *     tags: [AI Chat]
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *     responses:
 *       200:
 *         description: Chat history
 *       404:
 *         description: Chat not found
 */
router.get(
  '/chats/:chatId/messages',
  authGuard,
  tenantGuard,
  zodValidator(ChatIdParamSchema, 'params'),
  zodValidator(GetChatHistorySchema, 'query'),
  aiChatController.getChatHistory
);

/**
 * @openapi
 * /ai-chat/chats/{chatId}/messages:
 *   delete:
 *     summary: Clear chat history for a specific chat
 *     tags: [AI Chat]
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Chat history cleared
 *       404:
 *         description: Chat not found
 */
router.delete(
  '/chats/:chatId/messages',
  authGuard,
  tenantGuard,
  zodValidator(ChatIdParamSchema, 'params'),
  aiChatController.clearChatHistory
);

/**
 * @openapi
 * /ai-chat/chats/{chatId}/export/history:
 *   get:
 *     summary: Export chat history as CSV for a specific chat
 *     tags: [AI Chat]
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, assistant]
 *     responses:
 *       200:
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *       404:
 *         description: Chat not found
 */
router.get(
  '/chats/:chatId/export/history',
  authGuard,
  tenantGuard,
  zodValidator(ChatIdParamSchema, 'params'),
  zodValidator(ExportChatHistorySchema, 'query'),
  aiChatController.exportChatHistory
);

/**
 * @openapi
 * /ai-chat/export/data:
 *   post:
 *     summary: Export AI-retrieved data as CSV
 *     tags: [AI Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dataType
 *             properties:
 *               dataType:
 *                 type: string
 *                 enum: [students, callLogs, followups, callLists, stats]
 *               filters:
 *                 type: object
 *     responses:
 *       200:
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 */
router.post(
  '/export/data',
  authGuard,
  tenantGuard,
  zodValidator(ExportAIDataSchema),
  aiChatController.exportAIData
);

export default router;

