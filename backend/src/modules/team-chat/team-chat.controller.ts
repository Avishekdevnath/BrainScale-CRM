import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../../config/logger';
import {
  createChannelSchema,
  sendMessageSchema,
  editMessageSchema,
  getMessagesSchema,
  sendDirectMessageSchema,
  getDirectMessagesSchema,
  getChannelsSchema,
  addReactionSchema,
  markAsReadSchema,
  setTypingStatusSchema,
  searchQuerySchema,
} from './team-chat.schemas';
import {
  createChannel,
  sendMessage,
  editMessage,
  deleteMessage,
  deleteDirectMessage,
  getChannelMessages,
  sendDirectMessage,
  getDirectMessages,
  getWorkspaceChannels,
  markChannelAsRead,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getDirectMessagesList,
  addReaction,
  removeReaction,
  markMessagesAsRead,
  setTypingStatus,
  getTypingStatus,
  searchTeamChat,
} from './team-chat.service';

/**
 * POST /api/v1/team-chat/messages/send
 * Send a message to a channel
 */
export async function handleSendMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.sub;
    const channelId = req.body.channelId;
    const content = req.body.content;

    console.log(`[SEND-MESSAGE] POST /messages userId=${userId} channelId=${channelId}`);
    console.log(`[SEND-MESSAGE] Incoming content:`, JSON.stringify(content));

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const workspaceId = (req as any).user?.workspaceId;
    const validatedInput = sendMessageSchema.parse(req.body);
    const message = await sendMessage(userId, validatedInput, workspaceId);

    console.log(`[SEND-MESSAGE] SAVED: messageId=${message.id} channelId=${channelId}`);
    console.log(`[SEND-MESSAGE] Response content:`, JSON.stringify(message.content));
    return res.status(201).json(message);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.issues,
      });
    }

    if (error instanceof Error) {
      if (error.message.includes('not a member')) {
        return res.status(403).json({ error: error.message });
      }
    }

    console.log('[SEND-MESSAGE] ERROR:', error instanceof Error ? error.message : error);
    logger.error(error, 'Error in handleSendMessage');
    return res.status(500).json({ error: 'Failed to send message' });
  }
}

/**
 * GET /api/v1/team-chat/messages
 * Get messages from a channel with pagination
 */
export async function handleGetChannelMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.sub;
    const channelId = req.query.channelId as string;

    console.log(`[FETCH-MESSAGES] GET /messages channelId=${channelId} userId=${userId}`);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const validatedInput = getMessagesSchema.parse(req.query);
    const result = await getChannelMessages(userId, validatedInput);

    console.log(`[FETCH-MESSAGES] RESULT: Found ${result.items?.length || 0} messages in channel ${channelId}`);
    if (result.items && result.items.length > 0) {
      console.log(`[FETCH-MESSAGES] Response messages:`);
      result.items.slice(0, 3).forEach((m: any) => {
        console.log(`  - messageId=${m.id} userId=${m.userId} contentPlain="${m.contentPlain}" content=${JSON.stringify(m.content)}`);
      });
    }
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.issues,
      });
    }

    if (error instanceof Error) {
      if (error.message.includes('not a member')) {
        return res.status(403).json({ error: error.message });
      }
    }

    logger.error(error, 'Error in handleGetChannelMessages');
    return res.status(500).json({ error: 'Failed to get messages' });
  }
}

/**
 * PATCH /api/v1/team-chat/messages/:id
 * Edit a message
 */
export async function handleEditMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const workspaceId = (req as any).user?.workspaceId;
    const { id: messageId } = req.params;
    const validatedInput = editMessageSchema.parse(req.body);

    const message = await editMessage(messageId, userId, validatedInput, workspaceId);

    return res.status(200).json(message);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.issues,
      });
    }

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: 'Message not found' });
      }
      if (error.message.includes('Only message author')) {
        return res.status(403).json({ error: error.message });
      }
    }

    logger.error(error, 'Error in handleEditMessage');
    return res.status(500).json({ error: 'Failed to edit message' });
  }
}

/**
 * DELETE /api/v1/team-chat/messages/:id
 * Delete a message
 */
export async function handleDeleteMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id: messageId } = req.params;
    const message = await deleteMessage(messageId, userId);

    return res.status(200).json(message);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: 'Message not found' });
      }
      if (error.message.includes('Only message author')) {
        return res.status(403).json({ error: error.message });
      }
    }

    logger.error(error, 'Error in handleDeleteMessage');
    return res.status(500).json({ error: 'Failed to delete message' });
  }
}

export async function handleDeleteDirectMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id: messageId } = req.params;
    const message = await deleteDirectMessage(messageId, userId);

    return res.status(200).json(message);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: 'Message not found' });
      }
      if (error.message.includes('Only message author')) {
        return res.status(403).json({ error: error.message });
      }
    }

    logger.error(error, 'Error in handleDeleteDirectMessage');
    return res.status(500).json({ error: 'Failed to delete message' });
  }
}

/**
 * POST /api/v1/team-chat/direct-messages/send
 * Send a direct message to another user
 */
export async function handleSendDirectMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const workspaceId = (req as any).user?.workspaceId;
    const validatedInput = sendDirectMessageSchema.parse(req.body);
    const dm = await sendDirectMessage(userId, validatedInput, workspaceId);

    return res.status(201).json(dm);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.issues,
      });
    }

    if (error instanceof Error) {
      if (error.message.includes('Recipient not found')) {
        return res.status(404).json({ error: error.message });
      }
    }

    logger.error(error, 'Error in handleSendDirectMessage');
    return res.status(500).json({ error: 'Failed to send direct message' });
  }
}

/**
 * GET /api/v1/team-chat/direct-messages/:userId
 * Get direct messages with another user
 */
export async function handleGetDirectMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.sub;
    const otherUserId = req.params.userId;

    console.log(`[FETCH-DM] GET /direct-messages/${otherUserId} currentUserId=${userId}`);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const validatedInput = getDirectMessagesSchema.parse({
      userId: otherUserId,
      ...req.query,
    });

    const result = await getDirectMessages(userId, validatedInput);

    console.log(`[FETCH-DM] RESULT: Found ${result.items?.length || 0} messages`);
    if (result.items && result.items.length > 0) {
      console.log(`[FETCH-DM] Response sample (first 3):`);
      result.items.slice(0, 3).forEach((m: any) => {
        console.log(`  - messageId=${m.id} senderId=${m.senderId} recipientId=${m.recipientId} contentPlain="${m.contentPlain}"`);
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.issues,
      });
    }

    logger.error(error, 'Error in handleGetDirectMessages');
    return res.status(500).json({ error: 'Failed to get direct messages' });
  }
}

/**
 * POST /api/v1/team-chat/channels
 * Create a new channel in the workspace
 */
export async function handleCreateChannel(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const workspaceId = (req as any).user?.workspaceId;
    const validatedInput = createChannelSchema.parse(req.body);
    const channel = await createChannel(userId, validatedInput, workspaceId);

    return res.status(201).json(channel);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.issues,
      });
    }

    logger.error(error, 'Error in handleCreateChannel');
    return res.status(500).json({ error: 'Failed to create channel' });
  }
}

/**
 * GET /api/v1/team-chat/channels
 * Get all channels for the user's current workspace
 */
export async function handleGetChannels(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const workspaceId = (req as any).user?.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace ID required' });
    }

    const channels = await getWorkspaceChannels(userId, workspaceId);

    return res.status(200).json(channels);
  } catch (error) {
    logger.error(error, 'Error in handleGetChannels');
    return res.status(500).json({ error: 'Failed to get channels' });
  }
}

/**
 * PATCH /api/v1/team-chat/channels/:id/read
 * Mark a channel as read for the user
 */
export async function handleMarkChannelAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id: channelId } = req.params;
    const result = await markChannelAsRead(userId, channelId);

    return res.status(200).json(result);
  } catch (error) {
    logger.error(error, 'Error in handleMarkChannelAsRead');
    return res.status(500).json({ error: 'Failed to mark channel as read' });
  }
}

/**
 * GET /api/v1/team-chat/notifications
 * Get all notifications for the user
 */
export async function handleGetNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const notifications = await getUserNotifications(userId, limit);

    return res.status(200).json(notifications);
  } catch (error) {
    logger.error(error, 'Error in handleGetNotifications');
    return res.status(500).json({ error: 'Failed to get notifications' });
  }
}

/**
 * PATCH /api/v1/team-chat/notifications/:id/read
 * Mark a notification as read
 */
export async function handleMarkNotificationAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id: notificationId } = req.params;
    const notification = await markNotificationAsRead(notificationId, userId);

    return res.status(200).json(notification);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      if (error.message.includes('does not belong')) {
        return res.status(403).json({ error: error.message });
      }
    }

    logger.error(error, 'Error in handleMarkNotificationAsRead');
    return res.status(500).json({ error: 'Failed to mark notification as read' });
  }
}

/**
 * PATCH /api/v1/team-chat/notifications/read-all
 * Mark all notifications as read for the user
 */
export async function handleMarkAllNotificationsAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await markAllNotificationsAsRead(userId);

    return res.status(200).json({
      success: true,
      updatedCount: result.count,
    });
  } catch (error) {
    logger.error(error, 'Error in handleMarkAllNotificationsAsRead');
    return res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
}

/**
 * GET /api/v1/team-chat/direct-messages/list
 * Get list of DM conversations for the current user
 */
export async function handleGetDirectMessagesList(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.sub;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const list = await getDirectMessagesList(userId);
    return res.status(200).json(list);
  } catch (error) {
    logger.error(error, 'Error in handleGetDirectMessagesList');
    return res.status(500).json({ error: 'Failed to get DM list' });
  }
}

/**
 * POST /api/v1/team-chat/messages/:id/react
 * Add reaction to a message
 */
export async function handleAddReaction(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.sub;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id: messageId } = req.params;
    const { emoji } = addReactionSchema.parse(req.body);
    const reaction = await addReaction(userId, messageId, emoji);
    return res.status(201).json(reaction);
  } catch (error) {
    if (error instanceof ZodError) return res.status(400).json({ error: 'Validation error', details: error.issues });
    if (error instanceof Error && error.message.includes('not found')) return res.status(404).json({ error: error.message });
    if (error instanceof Error && error.message.includes('not a member')) return res.status(403).json({ error: error.message });
    logger.error(error, 'Error in handleAddReaction');
    return res.status(500).json({ error: 'Failed to add reaction' });
  }
}

/**
 * DELETE /api/v1/team-chat/messages/:id/react/:emoji
 * Remove a reaction from a message
 */
export async function handleRemoveReaction(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.sub;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id: messageId, emoji } = req.params;
    await removeReaction(userId, messageId, decodeURIComponent(emoji));
    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error(error, 'Error in handleRemoveReaction');
    return res.status(500).json({ error: 'Failed to remove reaction' });
  }
}

/**
 * PATCH /api/v1/team-chat/messages/read
 * Mark messages as read
 */
export async function handleMarkMessagesAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.sub;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { messageIds } = markAsReadSchema.parse(req.body);
    await markMessagesAsRead(userId, messageIds);
    return res.status(200).json({ success: true });
  } catch (error) {
    if (error instanceof ZodError) return res.status(400).json({ error: 'Validation error', details: error.issues });
    logger.error(error, 'Error in handleMarkMessagesAsRead');
    return res.status(500).json({ error: 'Failed to mark messages as read' });
  }
}

/**
 * POST /api/v1/team-chat/typing
 * Set typing status
 */
export async function handleSetTypingStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.sub;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const input = setTypingStatusSchema.parse(req.body);
    await setTypingStatus(userId, input);
    return res.status(200).json({ success: true });
  } catch (error) {
    if (error instanceof ZodError) return res.status(400).json({ error: 'Validation error', details: error.issues });
    logger.error(error, 'Error in handleSetTypingStatus');
    return res.status(500).json({ error: 'Failed to set typing status' });
  }
}

/**
 * GET /api/v1/team-chat/typing
 * Get typing status for a channel or DM
 */
export async function handleGetTypingStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.sub;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const channelId = req.query.channelId as string | undefined;
    const dmUserId = req.query.dmUserId as string | undefined;

    const statuses = await getTypingStatus({ channelId, dmUserId });
    // Exclude the requesting user from the list
    const filtered = statuses.filter((s) => s.userId !== userId);
    return res.status(200).json(filtered);
  } catch (error) {
    logger.error(error, 'Error in handleGetTypingStatus');
    return res.status(500).json({ error: 'Failed to get typing status' });
  }
}

/**
 * GET /api/v1/team-chat/search
 * Search messages and channels
 */
export async function handleSearch(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.sub;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const workspaceId = (req as any).user?.workspaceId;
    if (!workspaceId) return res.status(400).json({ error: 'Workspace ID required' });

    const { q, limit } = searchQuerySchema.parse(req.query);
    const results = await searchTeamChat(userId, workspaceId, q, limit);
    return res.status(200).json(results);
  } catch (error) {
    if (error instanceof ZodError) return res.status(400).json({ error: 'Validation error', details: error.issues });
    logger.error(error, 'Error in handleSearch');
    return res.status(500).json({ error: 'Failed to search' });
  }
}
