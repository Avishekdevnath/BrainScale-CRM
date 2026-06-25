import { prisma } from '../../db/client';
import { logger } from '../../config/logger';
import { sendTeamChatMentionEmail, sendTeamChatDirectMessageEmail } from '../../utils/email';
import { createNotification } from '../notifications/notification.service';
import type { CreateChannelInput, SendMessageInput, EditMessageInput, GetMessagesInput, SendDirectMessageInput, GetDirectMessagesInput } from './team-chat.schemas';

/**
 * Extract plain text from Tiptap JSON format
 * Used for search indexing and notifications
 */
export function extractPlainText(tiptapJson: any): string {
  if (!tiptapJson || !tiptapJson.content || !Array.isArray(tiptapJson.content)) {
    return '';
  }

  const parts: string[] = [];

  const traverse = (nodes: any[]): void => {
    for (const node of nodes) {
      if (node.type === 'text' && node.text) {
        parts.push(node.text);
      } else if (node.type === 'paragraph' && node.content) {
        traverse(node.content);
      } else if (node.type === 'bulletList' && node.content) {
        traverse(node.content);
      } else if (node.type === 'orderedList' && node.content) {
        traverse(node.content);
      } else if (node.type === 'listItem' && node.content) {
        traverse(node.content);
      } else if (node.type === 'codeBlock' && node.content) {
        traverse(node.content);
      }
    }
  };

  traverse(tiptapJson.content);
  return parts.join(' ').trim();
}

/**
 * Create a new channel in the workspace
 */
export async function createChannel(userId: string, input: CreateChannelInput, workspaceId?: string) {
  try {
    // Create the channel
    const channel = await prisma.channel.create({
      data: {
        workspaceId: workspaceId || '',
        name: input.name,
        description: input.description || '',
        createdBy: userId,
      },
    });

    // Add creator as member
    await prisma.userChannel.create({
      data: {
        userId,
        channelId: channel.id,
      },
    });

    return channel;
  } catch (error) {
    logger.error({ error, userId, channelName: input.name }, 'Failed to create channel');
    throw error;
  }
}

/**
 * Send a message to a channel
 */
export async function sendMessage(userId: string, input: SendMessageInput, workspaceId?: string) {
  try {
    console.log(`[SERVICE-SEND] Creating message in channel: ${input.channelId} by user: ${userId}`);
    console.log(`[SERVICE-SEND] Message content:`, JSON.stringify(input.content));
    console.log(`[SERVICE-SEND] Content plain text:`, extractPlainText(input.content));

    // Verify channel exists
    const channel = await prisma.channel.findUnique({
      where: { id: input.channelId },
    });

    if (!channel) {
      console.log(`[SERVICE-SEND] ERROR: Channel not found: ${input.channelId}`);
      throw new Error('Channel not found');
    }

    console.log(`[SERVICE-SEND] Channel verified: ${channel.id} (${channel.name})`);

    // Create the message
    const message = await prisma.message.create({
      data: {
        channelId: input.channelId,
        userId,
        content: input.content,
        contentPlain: extractPlainText(input.content),
        mentionedUsers: input.mentionedUsers || [],
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    console.log(`[SERVICE-SEND] DB-SAVED: messageId=${message.id} channelId=${input.channelId}`);
    console.log(`[SERVICE-SEND] Saved content:`, JSON.stringify(message.content));

    // Create notifications and send emails for mentioned users
    if (input.mentionedUsers && input.mentionedUsers.length > 0) {
      const channel = await prisma.channel.findUnique({
        where: { id: input.channelId },
      });

      const wsId = workspaceId || channel?.workspaceId || '';
      await prisma.notification.createMany({
        data: input.mentionedUsers.map((mentionedUserId) => ({
          workspaceId: wsId,
          userId: mentionedUserId,
          type: 'mention',
          title: 'New mention',
          body: `${message.sender.name} mentioned you in #${channel?.name || 'a channel'}`,
          meta: { messageId: message.id, channelId: input.channelId },
        })),
      });

      // Send email notifications to mentioned users
      const mentionedUsers = await prisma.user.findMany({
        where: { id: { in: input.mentionedUsers } },
        select: { email: true, id: true },
      });

      for (const mentionedUser of mentionedUsers) {
        try {
          await sendTeamChatMentionEmail(
            mentionedUser.email,
            message.sender.name || 'Someone',
            channel?.name || 'a channel',
            (message.contentPlain || '').substring(0, 200),
            {
              userId: mentionedUser.id,
            }
          );
        } catch (error) {
          logger.warn(
            { error, mentionedUserId: mentionedUser.id, messageId: message.id },
            'Failed to send mention email notification'
          );
        }
      }
    }

    return message;
  } catch (error) {
    logger.error({ error, userId, channelId: input.channelId }, 'Failed to send message');
    throw error;
  }
}

/**
 * Edit an existing message
 */
export async function editMessage(messageId: string, userId: string, input: EditMessageInput, workspaceId?: string) {
  try {
    // Verify user is the message author
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.userId !== userId) {
      throw new Error('Only message author can edit');
    }

    // Update message
    const updated = await prisma.message.update({
      where: { id: messageId },
      data: {
        content: input.content,
        contentPlain: extractPlainText(input.content),
        mentionedUsers: input.mentionedUsers || [],
        editedAt: new Date(),
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Update notifications for newly mentioned users
    const previousMentions = new Set(message.mentionedUsers);
    const newMentions = new Set(input.mentionedUsers || []);
    const addedMentions = Array.from(newMentions).filter((id) => !previousMentions.has(id));

    if (addedMentions.length > 0) {
      const channel = await prisma.channel.findUnique({
        where: { id: message.channelId },
      });

      const wsId = workspaceId || channel?.workspaceId || '';
      await prisma.notification.createMany({
        data: addedMentions.map((mentionedUserId) => ({
          workspaceId: wsId,
          userId: mentionedUserId,
          type: 'mention',
          title: 'New mention',
          body: `${updated.sender.name} mentioned you in #${channel?.name || 'a channel'}`,
          meta: { messageId: message.id, channelId: message.channelId },
        })),
      });
    }

    return updated;
  } catch (error) {
    logger.error({ error, messageId, userId }, 'Failed to edit message');
    throw error;
  }
}

/**
 * Delete a message (hard delete)
 */
export async function deleteMessage(messageId: string, userId: string) {
  try {
    // Verify user is the message author
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.userId !== userId) {
      throw new Error('Only message author can delete');
    }

    // Hard delete
    await prisma.message.delete({
      where: { id: messageId },
    });

    return { success: true, id: messageId };
  } catch (error) {
    logger.error({ error, messageId, userId }, 'Failed to delete message');
    throw error;
  }
}

/**
 * Get paginated messages from a channel
 * Uses (createdAt, id) ordering to handle MongoDB clock skew
 */
export async function getChannelMessages(userId: string, input: GetMessagesInput) {
  try {
    console.log(`[SERVICE-FETCH] Getting messages from channel: ${input.channelId}`);

    // Verify channel exists
    const channel = await prisma.channel.findUnique({
      where: { id: input.channelId },
    });

    if (!channel) {
      console.log(`[SERVICE-FETCH] ERROR: Channel not found: ${input.channelId}`);
      throw new Error('Channel not found');
    }

    const limit = parseInt(input.limit as any) || 50;

    // Fetch messages
    const messages = await prisma.message.findMany({
      where: {
        channelId: input.channelId,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
    });

    console.log(`[SERVICE-FETCH] DB-RESULT: Found ${messages.length} messages in channel ${input.channelId}`);
    if (messages.length > 0) {
      console.log(`[SERVICE-FETCH] Latest messages:`);
      messages.slice(0, 3).forEach((m) => {
        console.log(`  - messageId=${m.id} userId=${m.userId} contentPlain="${m.contentPlain}" content=${JSON.stringify(m.content)}`);
      });
    }

    return {
      items: messages.reverse(), // Return in ascending order for display
      hasMore: false,
      nextCursor: null,
    };
  } catch (error) {
    console.log(`[SERVICE-FETCH] ERROR:`, error instanceof Error ? error.message : error);
    logger.error({ error, userId, channelId: input.channelId }, 'Failed to get channel messages');
    throw error;
  }
}

/**
 * Send a direct message to another user
 */
export async function sendDirectMessage(senderId: string, workspaceId: string, input: SendDirectMessageInput) {
  try {
    console.log(`[SERVICE-SEND-DM] Creating DM from user: ${senderId} to user: ${input.recipientId}`);

    // Verify recipient is a member of this workspace (DMs are workspace-scoped).
    const recipientMember = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: input.recipientId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (!recipientMember) {
      console.log(`[SERVICE-SEND-DM] ERROR: Recipient not in workspace: ${input.recipientId}`);
      throw new Error('Recipient not found');
    }

    // Create the DM
    const dm = await prisma.directMessage.create({
      data: {
        senderId,
        recipientId: input.recipientId,
        content: input.content,
        contentPlain: extractPlainText(input.content),
        mentionedUsers: input.mentionedUsers || [],
      },
      include: {
        sender: { select: { id: true, name: true, email: true } },
        recipient: { select: { id: true, name: true, email: true } },
      },
    });

    console.log(`[SERVICE-SEND-DM] DB-SAVED: messageId=${dm.id}`);

    const senderName = dm.sender?.name || 'Someone';
    const body = dm.contentPlain ?? '';

    // Workspace-scoped in-app notification (respects user preferences).
    await createNotification({
      workspaceId,
      userId: input.recipientId,
      type: 'TEAM_CHAT_DIRECT_MESSAGE',
      title: `New direct message from ${senderName}`,
      body,
      meta: { messageId: dm.id, senderId },
    });

    // Email notification to the recipient.
    await sendTeamChatDirectMessageEmail(
      dm.recipient.email,
      senderName,
      body,
      { userId: input.recipientId }
    );

    return dm;
  } catch (error) {
    logger.error({ error, senderId, recipientId: input.recipientId }, 'Failed to send direct message');
    throw error;
  }
}

/**
 * Get paginated direct messages with another user
 */
export async function getDirectMessages(userId: string, input: GetDirectMessagesInput) {
  try {
    console.log(`[SERVICE-FETCH-DM] Getting messages between user: ${userId} and user: ${input.userId}`);
    const limit = parseInt(input.limit as any) || 50;

    // Get messages where user is either sender or recipient
    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: userId, recipientId: input.userId },
          { senderId: input.userId, recipientId: userId },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        recipient: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
    });

    console.log(`[SERVICE-FETCH-DM] DB-RESULT: Found ${messages.length} messages`);
    if (messages.length > 0) {
      console.log(`[SERVICE-FETCH-DM] Latest messages:`);
      messages.slice(0, 3).forEach((m) => {
        console.log(`  - messageId=${m.id} from=${m.senderId} to=${m.recipientId} contentPlain="${m.contentPlain}" content=${JSON.stringify(m.content)}`);
      });
    }

    return {
      items: messages.reverse(),
      hasMore: false,
      nextCursor: null,
    };
  } catch (error) {
    console.log(`[SERVICE-FETCH-DM] ERROR:`, error instanceof Error ? error.message : error);
    logger.error({ error, userId, otherUserId: input.userId }, 'Failed to get direct messages');
    throw error;
  }
}

/**
 * Get all channels for a workspace (that user is member of)
 */
export async function getWorkspaceChannels(userId: string, workspaceId: string) {
  try {
    const channels = await prisma.channel.findMany({
      where: {
        workspaceId,
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
          },
        },
        members: {
          where: { userId },
          select: { lastReadAt: true },
        },
      },
    });

    return channels;
  } catch (error) {
    logger.error({ error, userId, workspaceId }, 'Failed to get workspace channels');
    throw error;
  }
}

/**
 * Mark channel as read for a user
 */
export async function markChannelAsRead(userId: string, channelId: string) {
  try {
    const updated = await prisma.userChannel.update({
      where: {
        userId_channelId: {
          userId,
          channelId,
        },
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    return updated;
  } catch (error) {
    logger.error({ error, userId, channelId }, 'Failed to mark channel as read');
    throw error;
  }
}

/**
 * Get all notifications for a user
 */
export async function getUserNotifications(userId: string, limit: number = 50) {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return notifications;
  } catch (error) {
    logger.error({ error, userId }, 'Failed to get notifications');
    throw error;
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string, userId: string) {
  try {
    // Verify the notification belongs to the user
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new Error('Notification does not belong to this user');
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
      },
    });

    return updated;
  } catch (error) {
    logger.error({ error, notificationId, userId }, 'Failed to mark notification as read');
    throw error;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string) {
  try {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return result;
  } catch (error) {
    logger.error({ error, userId }, 'Failed to mark all notifications as read');
    throw error;
  }
}

/**
 * Get list of DM conversations for a user (unique partners, latest message each)
 */
export async function getDirectMessagesList(userId: string) {
  try {
    const dms = await prisma.directMessage.findMany({
      where: {
        OR: [{ senderId: userId }, { recipientId: userId }],
      },
      include: {
        sender: { select: { id: true, name: true, email: true } },
        recipient: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const conversations = new Map<string, any>();

    dms.forEach((dm) => {
      const otherUserId = dm.senderId === userId ? dm.recipientId : dm.senderId;
      const otherUser = dm.senderId === userId ? dm.recipient : dm.sender;

      if (!conversations.has(otherUserId)) {
        conversations.set(otherUserId, {
          userId: otherUserId,
          user: otherUser,
          latestMessage: {
            ...dm,
            content: undefined, // don't send full tiptap JSON
            contentPlain: dm.contentPlain || '',
          },
          lastMessageAt: dm.createdAt.toISOString(),
        });
      }
    });

    return Array.from(conversations.values()).sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
  } catch (error) {
    logger.error({ error, userId }, 'Failed to get DM list');
    throw error;
  }
}

/**
 * Delete a direct message
 */
export async function deleteDirectMessage(messageId: string, userId: string) {
  try {
    const message = await prisma.directMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.senderId !== userId) {
      throw new Error('Only message author can delete');
    }

    // Hard delete
    await prisma.directMessage.delete({
      where: { id: messageId },
    });

    return { success: true, id: messageId };
  } catch (error) {
    logger.error({ error, messageId, userId }, 'Failed to delete direct message');
    throw error;
  }
}

/**
 * Add a reaction to a message
 */
export async function addReaction(userId: string, messageId: string, emoji: string) {
  try {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) throw new Error('Message not found');

    const membership = await prisma.userChannel.findUnique({
      where: { userId_channelId: { userId, channelId: message.channelId } },
    });

    if (!membership) throw new Error('User is not a member of this channel');

    const reaction = await prisma.messageReaction.upsert({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
      create: { messageId, userId, emoji },
      update: { updatedAt: new Date() },
      include: { user: { select: { id: true, name: true } } },
    });

    return reaction;
  } catch (error) {
    logger.error({ error, userId, messageId, emoji }, 'Failed to add reaction');
    throw error;
  }
}

/**
 * Remove a reaction from a message
 */
export async function removeReaction(userId: string, messageId: string, emoji: string) {
  try {
    await prisma.messageReaction.delete({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
    });

    return { success: true };
  } catch (error) {
    logger.error({ error, userId, messageId, emoji }, 'Failed to remove reaction');
    throw error;
  }
}

/**
 * Mark messages as read by the user
 */
export async function markMessagesAsRead(userId: string, messageIds: string[]) {
  try {
    await prisma.readReceipt.createMany({
      data: messageIds.map((messageId) => ({ messageId, userId })),
    });

    return { success: true };
  } catch (error) {
    logger.error({ error, userId, messageIds }, 'Failed to mark messages as read');
    throw error;
  }
}

/**
 * Set typing status for a user in a channel or DM
 */
export async function setTypingStatus(
  userId: string,
  input: { channelId?: string; dmUserId?: string }
) {
  try {
    const expiresAt = new Date(Date.now() + 5000); // 5s TTL

    // Remove expired entries
    await prisma.typingStatus.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    // Remove old entry for this user in this context
    await prisma.typingStatus.deleteMany({
      where: {
        userId,
        ...(input.channelId ? { channelId: input.channelId } : {}),
        ...(input.dmUserId ? { dmUserId: input.dmUserId } : {}),
      },
    });

    const status = await prisma.typingStatus.create({
      data: {
        userId,
        channelId: input.channelId,
        dmUserId: input.dmUserId,
        expiresAt,
      },
      include: { typingUser: { select: { id: true, name: true } } },
    });

    return status;
  } catch (error) {
    logger.error({ error, userId, input }, 'Failed to set typing status');
    throw error;
  }
}

/**
 * Get current typing users in a channel or DM
 */
export async function getTypingStatus(input: { channelId?: string; dmUserId?: string }) {
  try {
    await prisma.typingStatus.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    const statuses = await prisma.typingStatus.findMany({
      where: {
        ...(input.channelId ? { channelId: input.channelId } : {}),
        ...(input.dmUserId ? { dmUserId: input.dmUserId } : {}),
      },
      include: { typingUser: { select: { id: true, name: true } } },
    });

    return statuses.map((s) => ({ userId: s.typingUser.id, userName: s.typingUser.name }));
  } catch (error) {
    logger.error({ error, input }, 'Failed to get typing status');
    throw error;
  }
}

/**
 * Search messages and channels
 */
export async function searchTeamChat(
  userId: string,
  workspaceId: string,
  query: string,
  limit = 20
) {
  try {
    const userChannels = await prisma.userChannel.findMany({
      where: { userId },
      select: { channelId: true },
    });

    const channelIds = userChannels.map((uc) => uc.channelId);

    const [messages, channels] = await Promise.all([
      prisma.message.findMany({
        where: {
          channelId: { in: channelIds },
          contentPlain: { contains: query, mode: 'insensitive' },
          deletedAt: null,
        },
        include: {
          sender: { select: { id: true, name: true } },
          channel: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.channel.findMany({
        where: {
          id: { in: channelIds },
          name: { contains: query, mode: 'insensitive' },
        },
        select: { id: true, name: true, description: true },
        take: 10,
      }),
    ]);

    return { messages, channels };
  } catch (error) {
    logger.error({ error, userId, query }, 'Failed to search team chat');
    throw error;
  }
}
