import { Router } from 'express';
import * as teamChatController from './team-chat.controller';
import { zodValidator } from '../../middleware/validate';
import { authGuard } from '../../middleware/auth-guard';
import { tenantGuard } from '../../middleware/tenant-guard';
import {
  createChannelSchema,
  sendMessageSchema,
  editMessageSchema,
  getMessagesSchema,
  sendDirectMessageSchema,
  getDirectMessagesQuerySchema,
  addReactionSchema,
  markAsReadSchema,
  setTypingStatusSchema,
  searchQuerySchema,
} from './team-chat.schemas';

const router = Router();

// ── Messages ──────────────────────────────────────────────────────────────────
// POST /api/v1/team-chat/messages/send - Send a message to a channel
router.post(
  '/messages/send',
  authGuard,
  tenantGuard,
  zodValidator(sendMessageSchema),
  teamChatController.handleSendMessage
);

// GET /api/v1/team-chat/messages - Get paginated messages from a channel
router.get(
  '/messages',
  authGuard,
  tenantGuard,
  zodValidator(getMessagesSchema, 'query'),
  teamChatController.handleGetChannelMessages
);

// PATCH /api/v1/team-chat/messages/read - Mark messages as read (must be before /:id)
router.patch(
  '/messages/read',
  authGuard,
  tenantGuard,
  zodValidator(markAsReadSchema),
  teamChatController.handleMarkMessagesAsRead
);

// PATCH /api/v1/team-chat/messages/:id - Edit a message
router.patch(
  '/messages/:id',
  authGuard,
  tenantGuard,
  zodValidator(editMessageSchema),
  teamChatController.handleEditMessage
);

// DELETE /api/v1/team-chat/messages/:id - Delete a message
router.delete(
  '/messages/:id',
  authGuard,
  tenantGuard,
  teamChatController.handleDeleteMessage
);

// ── Channels ──────────────────────────────────────────────────────────────────
// POST /api/v1/team-chat/channels - Create a channel
router.post(
  '/channels',
  authGuard,
  tenantGuard,
  zodValidator(createChannelSchema),
  teamChatController.handleCreateChannel
);

// GET /api/v1/team-chat/channels - Get all channels for workspace
router.get(
  '/channels',
  authGuard,
  tenantGuard,
  teamChatController.handleGetChannels
);

// PATCH /api/v1/team-chat/channels/:id/read - Mark channel as read
router.patch(
  '/channels/:id/read',
  authGuard,
  tenantGuard,
  teamChatController.handleMarkChannelAsRead
);

// ── Direct Messages ───────────────────────────────────────────────────────────
// POST /api/v1/team-chat/direct-messages/send - Send a direct message
router.post(
  '/direct-messages/send',
  authGuard,
  tenantGuard,
  zodValidator(sendDirectMessageSchema),
  teamChatController.handleSendDirectMessage
);

// GET /api/v1/team-chat/direct-messages/list - Get DM conversations list
router.get(
  '/direct-messages/list',
  authGuard,
  tenantGuard,
  teamChatController.handleGetDirectMessagesList
);

// DELETE /api/v1/team-chat/direct-messages/:id - Delete a direct message (must come before GET :userId)
router.delete(
  '/direct-messages/:id',
  authGuard,
  tenantGuard,
  teamChatController.handleDeleteDirectMessage
);

// GET /api/v1/team-chat/direct-messages/:userId - Get DMs with a user
router.get(
  '/direct-messages/:userId',
  authGuard,
  tenantGuard,
  zodValidator(getDirectMessagesQuerySchema, 'query'),
  teamChatController.handleGetDirectMessages
);

// ── Reactions ────────────────────────────────────────────────────────────────
// POST /api/v1/team-chat/messages/:id/react - Add reaction
router.post(
  '/messages/:id/react',
  authGuard,
  tenantGuard,
  zodValidator(addReactionSchema),
  teamChatController.handleAddReaction
);

// DELETE /api/v1/team-chat/messages/:id/react/:emoji - Remove reaction
router.delete(
  '/messages/:id/react/:emoji',
  authGuard,
  tenantGuard,
  teamChatController.handleRemoveReaction
);

// ── Typing ────────────────────────────────────────────────────────────────────
// POST /api/v1/team-chat/typing - Set typing status
router.post(
  '/typing',
  authGuard,
  tenantGuard,
  zodValidator(setTypingStatusSchema),
  teamChatController.handleSetTypingStatus
);

// GET /api/v1/team-chat/typing - Get typing status
router.get(
  '/typing',
  authGuard,
  tenantGuard,
  teamChatController.handleGetTypingStatus
);

// ── Search ────────────────────────────────────────────────────────────────────
// GET /api/v1/team-chat/search - Search messages and channels
router.get(
  '/search',
  authGuard,
  tenantGuard,
  zodValidator(searchQuerySchema, 'query'),
  teamChatController.handleSearch
);

// ── Notifications ────────────────────────────────────────────────────────────
// GET /api/v1/team-chat/notifications - Get all notifications
router.get(
  '/notifications',
  authGuard,
  tenantGuard,
  teamChatController.handleGetNotifications
);

// PATCH /api/v1/team-chat/notifications/:id/read - Mark notification as read
router.patch(
  '/notifications/:id/read',
  authGuard,
  tenantGuard,
  teamChatController.handleMarkNotificationAsRead
);

// PATCH /api/v1/team-chat/notifications/read-all - Mark all notifications as read
router.patch(
  '/notifications/read-all',
  authGuard,
  tenantGuard,
  teamChatController.handleMarkAllNotificationsAsRead
);

export default router;
