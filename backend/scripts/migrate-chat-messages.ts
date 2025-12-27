/**
 * Migration script to create default Chat records and assign existing ChatMessages to them
 * 
 * IMPORTANT: This script should be run AFTER:
 * 1. Updating the Prisma schema to add Chat model
 * 2. Making chatId nullable in ChatMessage temporarily (or using raw MongoDB operations)
 * 3. Running `npx prisma generate`
 * 4. Running `npx prisma db push` or applying migrations
 * 
 * Then run this script, and finally make chatId required in the schema.
 * 
 * Usage:
 *   npx tsx scripts/migrate-chat-messages.ts
 * 
 * This script is idempotent - it can be run multiple times safely.
 */

import { prisma } from '../src/db/client';

async function migrateChatMessages() {
  console.log('Starting chat messages migration...\n');

  try {
    // Get all ChatMessage records to find unique user-workspace combinations
    // Note: This assumes chatId might be null/undefined initially
    const allMessages = await prisma.chatMessage.findMany({
      select: {
        id: true,
        workspaceId: true,
        userId: true,
        chatId: true,
        content: true,
        createdAt: true,
      },
    });

    // Group messages by (workspaceId, userId) and filter out those that already have chatId
    const messagesByUser = new Map<string, typeof allMessages>();
    
    for (const message of allMessages) {
      const key = `${message.workspaceId}:${message.userId}`;
      if (!messagesByUser.has(key)) {
        messagesByUser.set(key, []);
      }
      // Only include messages without chatId (or with null/undefined chatId)
      if (!message.chatId) {
        messagesByUser.get(key)!.push(message);
      }
    }

    console.log(`Found ${messagesByUser.size} unique user-workspace combinations with messages to migrate`);

    let chatsCreated = 0;
    let messagesUpdated = 0;
    let errors = 0;

    for (const [key, messages] of messagesByUser.entries()) {
      if (messages.length === 0) continue;

      const [workspaceId, userId] = key.split(':');
      
      try {
        // Check if a default chat already exists for this user-workspace
        let chat = await prisma.chat.findFirst({
          where: {
            workspaceId,
            userId,
          },
          orderBy: { createdAt: 'asc' }, // Get oldest chat if multiple exist
        });

        // If no chat exists, create one
        if (!chat) {
          // Try to get the first message to use as title
          const firstMessage = messages.sort((a, b) => 
            a.createdAt.getTime() - b.createdAt.getTime()
          )[0];

          const title = firstMessage?.content
            ? firstMessage.content.length > 50
              ? firstMessage.content.substring(0, 47) + '...'
              : firstMessage.content
            : 'Chat 1';

          chat = await prisma.chat.create({
            data: {
              workspaceId,
              userId,
              title,
            },
          });
          chatsCreated++;
          console.log(`Created chat ${chat.id} for user ${userId} in workspace ${workspaceId} (${messages.length} messages)`);
        } else {
          console.log(`Using existing chat ${chat.id} for user ${userId} in workspace ${workspaceId} (${messages.length} messages)`);
        }

        // Update all messages for this user-workspace to reference the chat
        const messageIds = messages.map(m => m.id);
        
        // Update messages one by one to handle potential type issues
        for (const messageId of messageIds) {
          try {
            await prisma.chatMessage.update({
              where: { id: messageId },
              data: { chatId: chat.id },
            });
            messagesUpdated++;
          } catch (updateError: any) {
            // If update fails (e.g., chatId is required and can't be updated), try raw MongoDB
            if (updateError.code === 'P2002' || updateError.message?.includes('chatId')) {
              console.warn(`Could not update message ${messageId} using Prisma, might need manual fix`);
            } else {
              throw updateError;
            }
          }
        }

        if (messages.length > 0) {
          console.log(`  ✓ Updated ${messages.length} messages`);
        }
      } catch (error) {
        console.error(`Error migrating messages for user ${userId} in workspace ${workspaceId}:`, error);
        errors++;
      }
    }

    console.log('\n✅ Migration completed!');
    console.log(`   Chats created: ${chatsCreated}`);
    console.log(`   Messages updated: ${messagesUpdated}`);
    console.log(`   Errors: ${errors}`);

    if (errors > 0) {
      console.warn('\n⚠️  Some errors occurred during migration. Please review the logs above.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateChatMessages();

