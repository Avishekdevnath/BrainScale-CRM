import { prisma } from '../../db/client';
import { AppError } from '../../middleware/error-handler';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { chatWithFunctions, ChatMessage as AIChatMessage, FunctionDefinition } from '../../utils/ai-client';
import * as contextService from './context.service';

/**
 * Check if AI chat is enabled for workspace
 */
const isChatEnabled = async (workspaceId: string): Promise<boolean> => {
  if (!env.AI_ENABLED) {
    return false;
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      aiFeaturesEnabled: true,
      aiFeatures: true,
    },
  });

  if (!workspace || !workspace.aiFeaturesEnabled) {
    return false;
  }

  if (workspace.aiFeatures && Array.isArray(workspace.aiFeatures)) {
    return workspace.aiFeatures.includes('chat');
  }

  // If no specific features configured, check global AI_FEATURES
  if (env.AI_FEATURES.length > 0) {
    return env.AI_FEATURES.includes('chat');
  }

  // Default: if AI is enabled for workspace, allow chat
  return workspace.aiFeaturesEnabled;
};

/**
 * Get function definitions for AI
 */
const getFunctionDefinitions = (): FunctionDefinition[] => {
  return [
    {
      name: 'getStudentInfo',
      description: 'Get detailed information about a student by name. Use this when user asks about a student or asks for "info". If the user asks for "info" without specifying a name and there is only one student, use an empty string or "student" as the studentName parameter - the function will automatically return the only student\'s information.',
      parameters: {
        type: 'object',
        properties: {
          studentName: {
            type: 'string',
            description: 'The name of the student to look up. Use an empty string or "student" if the user asks for "info" without specifying a name - the function will handle it intelligently.',
          },
        },
        required: ['studentName'],
      },
    },
    {
      name: 'searchStudents',
      description: 'Search for students by name, email, or tags. Use this when user wants to find students.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query (name, email, or tag)',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results (default: 10)',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'getCallLogs',
      description: 'Get call logs with optional filters. Use this when user asks about calls, call history, call logs, "how many students we called today", "students called today", or any question about calls made today. The response includes both count (total calls) and uniqueStudentsCount (unique students called). For questions about "today", ALWAYS set today: true.',
      parameters: {
        type: 'object',
        properties: {
          studentId: {
            type: 'string',
            description: 'Filter by student ID',
          },
          status: {
            type: 'string',
            description: 'Filter by call status (completed, missed, busy, no_answer, voicemail, other)',
          },
          dateFrom: {
            type: 'string',
            description: 'Filter calls from this date (ISO format). Only use this for non-today dates. For today, use the today parameter instead.',
          },
          dateTo: {
            type: 'string',
            description: 'Filter calls until this date (ISO format). Only use this for non-today dates. For today, use the today parameter instead.',
          },
          today: {
            type: 'boolean',
            description: 'MUST be set to true when user asks about calls made "today" or asks "how many students we called today". This automatically filters for today\'s date range.',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results (default: 20, but automatically increased to 1000 when filtering for today)',
          },
        },
      },
    },
    {
      name: 'getWorkspaceStats',
      description: 'Get workspace statistics and KPIs. Use this when user asks about overall workspace metrics, dashboard stats, or summary numbers.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'getRecentActivity',
      description: 'Get recent workspace activity including recent calls and upcoming follow-ups.',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Maximum number of results (default: 10)',
          },
        },
      },
    },
    {
      name: 'getFollowups',
      description: 'Get follow-ups with optional filters. Use this when user asks about follow-ups, pending tasks, or reminders.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Filter by status (PENDING, DONE)',
          },
          studentId: {
            type: 'string',
            description: 'Filter by student ID',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results (default: 20)',
          },
        },
      },
    },
    {
      name: 'getCallLists',
      description: 'Get call lists with optional filters. Use this when user asks about call lists.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Filter by status (ACTIVE, COMPLETED, ARCHIVED)',
          },
          groupId: {
            type: 'string',
            description: 'Filter by group ID',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results (default: 20)',
          },
        },
      },
    },
  ];
};

/**
 * Execute a function call
 */
const executeFunction = async (name: string, args: any, workspaceId: string): Promise<any> => {
  try {
    switch (name) {
      case 'getStudentInfo':
        return await contextService.getStudentInfo(args.studentName || '', workspaceId);
      case 'searchStudents':
        return await contextService.searchStudents(args.query || '', workspaceId, args.limit);
      case 'getCallLogs':
        return await contextService.getCallLogs(args || {}, workspaceId);
      case 'getWorkspaceStats':
        return await contextService.getWorkspaceStats(workspaceId);
      case 'getRecentActivity':
        return await contextService.getRecentActivity(workspaceId, args.limit);
      case 'getFollowups':
        return await contextService.getFollowups(args || {}, workspaceId);
      case 'getCallLists':
        return await contextService.getCallLists(args || {}, workspaceId);
      default:
        return { error: `Unknown function: ${name}` };
    }
  } catch (error) {
    logger.error({ functionName: name, args, workspaceId, error }, 'Function execution failed');
    return { error: 'Failed to execute function' };
  }
};

/**
 * Get system prompt for AI
 */
const getSystemPrompt = (workspaceName: string): string => {
  return `You are Brain, a helpful AI assistant for the workspace "${workspaceName}". Your role is to help users understand their workspace data, answer questions, and provide insights.

Your name is "Brain" - you should introduce yourself as Brain and refer to yourself as Brain in your responses when appropriate.

IMPORTANT RULES:
1. You can ONLY access data from the current workspace (workspaceId is automatically provided to all functions)
2. Never mention or access data from other workspaces
3. Use function calling to retrieve workspace data when needed
4. Provide clear, concise, and helpful responses
5. When presenting data, format it in a readable way
6. If you don't have access to certain information, say so clearly
7. Be professional but friendly in your tone

CRITICAL IDENTITY RULES:
8. You are "Brain" - a custom AI assistant created specifically for BrainScale CRM
9. NEVER reveal or discuss the underlying technology, model, or AI provider you use
10. NEVER mention any of the following: OpenAI, GPT, ChatGPT, GPT-4, Claude, Anthropic, LLM, language model, AI model, or any specific AI company or technology
11. If asked about what model you are, what AI you use, or who created you, politely redirect by saying: "I'm Brain, your AI assistant for BrainScale CRM. How can I help you with your workspace today?"
12. If pressed further about technical details, firmly but politely refuse: "I'm not able to discuss technical implementation details. I'm here to help you with your workspace data and questions. What would you like to know about your workspace?"
13. Focus conversations on workspace-related topics and avoid discussing AI technology or your technical specifications

You have access to the following workspace data:
- Students and their information
- Call logs and call history
- Follow-ups and reminders
- Call lists
- Workspace statistics and metrics
- Recent activity

Use the available functions to retrieve data when users ask questions about their workspace.`;
};

/**
 * Create a new chat
 */
export const createChat = async (
  workspaceId: string,
  userId: string,
  title?: string
): Promise<any> => {
  const chat = await prisma.chat.create({
    data: {
      workspaceId,
      userId,
      title: title || null,
    },
  });

  logger.info({ workspaceId, userId, chatId: chat.id }, 'Chat created');
  return chat;
};

/**
 * Get all chats for a user
 */
export const getChats = async (
  workspaceId: string,
  userId: string
): Promise<any[]> => {
  const chats = await prisma.chat.findMany({
    where: {
      workspaceId,
      userId,
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: { messages: true },
      },
    },
  });

  // Get first message for each chat to use as summary
  const chatsWithSummary = await Promise.all(
    chats.map(async (chat) => {
      const firstMessage = await prisma.chatMessage.findFirst({
        where: {
          chatId: chat.id,
          workspaceId,
          userId,
        },
        orderBy: { createdAt: 'asc' },
        select: {
          content: true,
        },
      });

      return {
        ...chat,
        summary: firstMessage?.content || null,
      };
    })
  );

  return chatsWithSummary;
};

/**
 * Get a chat by ID with ownership verification
 */
export const getChatById = async (
  workspaceId: string,
  userId: string,
  chatId: string
): Promise<any> => {
  const chat = await prisma.chat.findFirst({
    where: {
      id: chatId,
      workspaceId,
      userId,
    },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: { messages: true },
      },
    },
  });

  if (!chat) {
    throw new AppError(404, 'Chat not found');
  }

  return chat;
};

/**
 * Update chat title
 */
export const updateChatTitle = async (
  workspaceId: string,
  userId: string,
  chatId: string,
  title: string
): Promise<any> => {
  // Verify ownership
  const chat = await prisma.chat.findFirst({
    where: {
      id: chatId,
      workspaceId,
      userId,
    },
  });

  if (!chat) {
    throw new AppError(404, 'Chat not found');
  }

  const updated = await prisma.chat.update({
    where: { id: chatId },
    data: { title },
  });

  logger.info({ workspaceId, userId, chatId, title }, 'Chat title updated');
  return updated;
};

/**
 * Delete a chat
 */
export const deleteChat = async (
  workspaceId: string,
  userId: string,
  chatId: string
): Promise<void> => {
  // Verify ownership
  const chat = await prisma.chat.findFirst({
    where: {
      id: chatId,
      workspaceId,
      userId,
    },
  });

  if (!chat) {
    throw new AppError(404, 'Chat not found');
  }

  await prisma.chat.delete({
    where: { id: chatId },
  });

  logger.info({ workspaceId, userId, chatId }, 'Chat deleted');
};

/**
 * Send a chat message and get AI response
 */
export const sendMessage = async (
  workspaceId: string,
  userId: string,
  message: string,
  chatId?: string
): Promise<any> => {
  // Check if chat is enabled
  if (!(await isChatEnabled(workspaceId))) {
    throw new AppError(403, 'AI chat is not enabled for this workspace');
  }

  const startTime = Date.now();

  try {
    // Create chat if chatId not provided
    let currentChatId = chatId;
    if (!currentChatId) {
      // Auto-generate title from first message (first 50 chars)
      const title = message.length > 50 ? message.substring(0, 47) + '...' : message;
      const newChat = await createChat(workspaceId, userId, title);
      currentChatId = newChat.id;
    } else {
      // Verify chat ownership
      const chat = await prisma.chat.findFirst({
        where: {
          id: currentChatId,
          workspaceId,
          userId,
        },
      });

      if (!chat) {
        throw new AppError(404, 'Chat not found');
      }

      // If chat has no title, auto-generate from this message
      if (!chat.title) {
        const title = message.length > 50 ? message.substring(0, 47) + '...' : message;
        await prisma.chat.update({
          where: { id: currentChatId },
          data: { title },
        });
      }
    }

    // Ensure chatId is set (should always be set at this point)
    if (!currentChatId) {
      throw new AppError(500, 'Chat ID is required');
    }

    // Save user message
    const userMessage = await prisma.chatMessage.create({
      data: {
        chatId: currentChatId,
        workspaceId,
        userId,
        role: 'user',
        content: message,
      },
    });

    // Get workspace name for system prompt
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true },
    });

    // Load recent chat history for THIS CHAT (last 20 messages for context)
    const history = await prisma.chatMessage.findMany({
      where: {
        chatId: currentChatId,
        workspaceId,
        userId,
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
      select: {
        role: true,
        content: true,
        createdAt: true,
      },
    });

    // Build messages array for AI
    const messages: AIChatMessage[] = [
      {
        role: 'system',
        content: getSystemPrompt(workspace?.name || 'Workspace'),
      },
      ...history
        .reverse()
        .map((msg: any) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
      {
        role: 'user',
        content: message,
      },
    ];

    // Get function definitions
    const functions = getFunctionDefinitions();

    // Call AI with function calling
    const aiResponse = await chatWithFunctions(
      messages,
      functions,
      workspaceId,
      executeFunction
    );

    if (!aiResponse || !aiResponse.content) {
      throw new AppError(500, 'Failed to get AI response');
    }

    // Ensure chatId is still set
    if (!currentChatId) {
      throw new AppError(500, 'Chat ID is required');
    }

    // Save AI response
    const assistantMessage = await prisma.chatMessage.create({
      data: {
        chatId: currentChatId,
        workspaceId,
        userId,
        role: 'assistant',
        content: aiResponse.content,
        metadata: {
          functionCalls: aiResponse.functionCalls || [],
          tokensUsed: aiResponse.metadata?.tokensUsed,
          model: aiResponse.metadata?.model,
          processingTimeMs: Date.now() - startTime,
        } as any,
      },
    });

    // Update chat's updatedAt timestamp
    await prisma.chat.update({
      where: { id: currentChatId },
      data: { updatedAt: new Date() },
    });

    logger.info(
      {
        workspaceId,
        userId,
        chatId: currentChatId,
        messageLength: message.length,
        responseLength: aiResponse.content.length,
        tokensUsed: aiResponse.metadata?.tokensUsed,
        processingTimeMs: Date.now() - startTime,
      },
      'Chat message processed successfully'
    );

    return {
      chatId: currentChatId,
      userMessage,
      assistantMessage,
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(
      { workspaceId, userId, message, error, processingTimeMs: processingTime },
      'Failed to process chat message'
    );

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(500, 'Failed to process chat message');
  }
};

/**
 * Get chat history for a specific chat
 */
export const getChatHistory = async (
  workspaceId: string,
  userId: string,
  chatId: string,
  limit: number = 50
): Promise<any[]> => {
  // Verify chat ownership
  const chat = await prisma.chat.findFirst({
    where: {
      id: chatId,
      workspaceId,
      userId,
    },
  });

  if (!chat) {
    throw new AppError(404, 'Chat not found');
  }

  const messages = await prisma.chatMessage.findMany({
    where: {
      chatId,
      workspaceId,
      userId,
    },
    take: limit,
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      role: true,
      content: true,
      metadata: true,
      createdAt: true,
    },
  });

  return messages;
};

/**
 * Clear chat history for a specific chat
 */
export const clearChatHistory = async (
  workspaceId: string,
  userId: string,
  chatId: string
): Promise<void> => {
  // Verify chat ownership
  const chat = await prisma.chat.findFirst({
    where: {
      id: chatId,
      workspaceId,
      userId,
    },
  });

  if (!chat) {
    throw new AppError(404, 'Chat not found');
  }

  await prisma.chatMessage.deleteMany({
    where: {
      chatId,
      workspaceId,
      userId,
    },
  });

  logger.info({ workspaceId, userId, chatId }, 'Chat history cleared');
};

/**
 * Export chat history to CSV
 */
export const exportChatHistory = async (
  workspaceId: string,
  userId: string,
  chatId: string,
  filters?: {
    dateFrom?: string;
    dateTo?: string;
    role?: 'user' | 'assistant';
  }
): Promise<{ csv: string; filename: string }> => {
  // Verify chat ownership
  const chat = await prisma.chat.findFirst({
    where: {
      id: chatId,
      workspaceId,
      userId,
    },
  });

  if (!chat) {
    throw new AppError(404, 'Chat not found');
  }

  const where: any = {
    chatId,
    workspaceId,
    userId,
  };

  // Apply date filters
  if (filters?.dateFrom || filters?.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) {
      where.createdAt.gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      where.createdAt.lte = new Date(filters.dateTo);
    }
  }

  // Apply role filter
  if (filters?.role) {
    where.role = filters.role;
  }

  const messages = await prisma.chatMessage.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      role: true,
      content: true,
      createdAt: true,
      metadata: true,
    },
  });

  // Generate CSV
  const headers = ['Timestamp', 'Role', 'Message', 'Message ID'];
  const rows = messages.map((msg: any) => ({
    Timestamp: msg.createdAt.toISOString(),
    Role: msg.role,
    Message: escapeCSVValue(msg.content),
    'Message ID': msg.id,
  }));

  const csvRows = [
    headers.join(','),
    ...rows.map((row: any) =>
      headers.map((header) => row[header as keyof typeof row] || '').join(',')
    ),
  ];

  const csv = csvRows.join('\n');
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `chat-history-${timestamp}.csv`;

  logger.info({ workspaceId, userId, messageCount: messages.length }, 'Chat history exported');

  return { csv, filename };
};

/**
 * Export AI-retrieved data to CSV
 * This function can export data that was retrieved by AI functions
 */
export const exportAIData = async (
  workspaceId: string,
  userId: string,
  dataType: 'students' | 'callLogs' | 'followups' | 'callLists' | 'stats',
  filters?: any
): Promise<{ csv: string; filename: string }> => {
  let rows: any[] = [];
  let headers: string[] = [];

  switch (dataType) {
    case 'students': {
      const result = await contextService.searchStudents('', workspaceId, 1000);
      headers = ['Name', 'Email', 'Tags'];
      rows = result.students.map((s: any) => ({
        Name: escapeCSVValue(s.name || ''),
        Email: escapeCSVValue(s.email || ''),
        Tags: escapeCSVValue((s.tags || []).join(', ')),
      }));
      break;
    }
    case 'callLogs': {
      const result = await contextService.getCallLogs(filters || {}, workspaceId);
      headers = ['Student Name', 'Status', 'Call Date', 'Caller Name', 'Summary', 'Sentiment'];
      rows = result.callLogs.map((log: any) => ({
        'Student Name': escapeCSVValue(log.studentName || ''),
        Status: escapeCSVValue(log.status || ''),
        'Call Date': log.callDate ? new Date(log.callDate).toISOString() : '',
        'Caller Name': escapeCSVValue(log.callerName || ''),
        Summary: escapeCSVValue(log.summaryNote || ''),
        Sentiment: escapeCSVValue(log.sentiment || ''),
      }));
      break;
    }
    case 'followups': {
      const result = await contextService.getFollowups(filters || {}, workspaceId);
      headers = ['Student Name', 'Group Name', 'Status', 'Due Date', 'Notes'];
      rows = result.followups.map((f: any) => ({
        'Student Name': escapeCSVValue(f.studentName || ''),
        'Group Name': escapeCSVValue(f.groupName || ''),
        Status: escapeCSVValue(f.status || ''),
        'Due Date': f.dueDate ? new Date(f.dueDate).toISOString() : '',
        Notes: escapeCSVValue(f.notes || ''),
      }));
      break;
    }
    case 'callLists': {
      const result = await contextService.getCallLists(filters || {}, workspaceId);
      headers = ['List Name', 'Group Name', 'Status', 'Item Count'];
      rows = result.callLists.map((list: any) => ({
        'List Name': escapeCSVValue(list.name || ''),
        'Group Name': escapeCSVValue(list.groupName || ''),
        Status: escapeCSVValue(list.status || ''),
        'Item Count': list.itemCount || 0,
      }));
      break;
    }
    case 'stats': {
      const result = await contextService.getWorkspaceStats(workspaceId);
      headers = ['Metric', 'Value'];
      rows = [];
      if (result.overview) {
        Object.entries(result.overview).forEach(([key, value]) => {
          rows.push({
            Metric: escapeCSVValue(key),
            Value: String(value || ''),
          });
        });
      }
      break;
    }
    default:
      throw new AppError(400, 'Invalid data type for export');
  }

  // Generate CSV
  const csvRows = [
    headers.join(','),
    ...rows.map((row: any) =>
      headers.map((header) => row[header as keyof typeof row] || '').join(',')
    ),
  ];

  const csv = csvRows.join('\n');
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `ai-data-${dataType}-${timestamp}.csv`;

  logger.info({ workspaceId, userId, dataType, rowCount: rows.length }, 'AI data exported');

  return { csv, filename };
};

/**
 * Escape CSV value (handle quotes, commas, newlines)
 */
function escapeCSVValue(value: string): string {
  if (typeof value !== 'string') {
    value = String(value);
  }
  // Escape quotes and wrap in quotes if contains comma, newline, or quote
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

