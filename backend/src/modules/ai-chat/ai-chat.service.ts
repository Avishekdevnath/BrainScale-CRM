import { prisma } from '../../db/client';
import { AppError } from '../../middleware/error-handler';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { chatWithFunctions, ChatMessage as AIChatMessage, FunctionDefinition } from '../../utils/ai-client';
import * as contextService from './context.service';
import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';

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
      description: 'Get call logs with optional filters. Use this when user asks about calls, call history, or call logs for a specific date range. The response includes "total" (the REAL total count from the database matching the filters), "count" (number of records returned, limited by the limit param), and "uniqueStudentsCount". For "how many calls" questions without a date filter, prefer getWorkspaceStats which has totalCallsAllTime. For questions about "today", ALWAYS set today: true.',
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
      description: 'Get workspace statistics and KPIs. ALWAYS use this when user asks "how many students", "how many calls", "total students", "total calls", or any aggregate count question about the workspace. Returns "studentCount" (exact total students), "totalCallsAllTime" (exact total call logs ever), plus overview, activity, followups, and metrics.',
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
    {
      name: 'getGroups',
      description: 'Get all active groups (classes/batches) in the workspace. Use this when user asks "how many groups", "list groups", "which groups exist", or any question about groups. Returns each group\'s name, student count, and call list count.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'getCallerPerformance',
      description: 'Get performance statistics for each caller/counselor. Use this when user asks "who called the most", "top callers", "counselor performance", "caller stats", or any question comparing how many calls each team member made. Returns totalCalls, completed, missed, noAnswer, voicemail, and completionRate per caller.',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Number of top callers to return (default: 10)',
          },
          dateFrom: {
            type: 'string',
            description: 'Filter calls from this date (ISO format)',
          },
          dateTo: {
            type: 'string',
            description: 'Filter calls until this date (ISO format)',
          },
        },
      },
    },
    {
      name: 'getCallTrends',
      description: 'Get day-by-day call volume trends for a date range. Use this when user asks about "call trends", "calls this week vs last week", "call volume over time", "how many calls per day", "show me calls for [month]", or any time-series question about call activity. Returns a list of daily call counts with completed/missed/noAnswer breakdown and the peak day.',
      parameters: {
        type: 'object',
        properties: {
          dateFrom: {
            type: 'string',
            description: 'Start date for the trend (ISO format, e.g. "2026-02-01"). Calculate based on current date for relative periods like "this week" or "last month".',
          },
          dateTo: {
            type: 'string',
            description: 'End date for the trend (ISO format, e.g. "2026-02-28"). For "this week" use today as dateTo.',
          },
        },
        required: ['dateFrom', 'dateTo'],
      },
    },
    {
      name: 'createCallList',
      description: 'Create a new call list with a set of students. Use this when the user asks to create or make a call list. IMPORTANT: You MUST have groupId before calling this — call getGroups() first if you do not know the group, then confirm with the user which group to use. Gather studentIds via searchStudents or getFollowups before calling this function. Never call this without confirmed groupId and studentIds.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name for the call list (e.g. "Overdue Follow-ups March 2026")',
          },
          groupId: {
            type: 'string',
            description: 'ID of the group the call list belongs to (required)',
          },
          studentIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of student IDs to add to the call list',
          },
          description: {
            type: 'string',
            description: 'Optional description for the call list',
          },
        },
        required: ['name', 'groupId', 'studentIds'],
      },
    },
  ];
};

/**
 * Execute a function call
 */
const executeFunction = async (name: string, args: any, workspaceId: string, userId: string): Promise<any> => {
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
      case 'getGroups':
        return await contextService.getGroups(workspaceId);
      case 'getCallerPerformance':
        return await contextService.getCallerPerformance(workspaceId, args.limit, args.dateFrom, args.dateTo);
      case 'getCallTrends':
        return await contextService.getCallTrends({ dateFrom: args.dateFrom, dateTo: args.dateTo }, workspaceId);
      case 'createCallList':
        return await contextService.createCallListForAI(workspaceId, userId, args);
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
const getSystemPrompt = (workspaceName: string, workspaceAlerts?: string): string => {
  const now = new Date();
  const todayDate = now.toISOString().split('T')[0];
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const monthYear = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return `You are Brain, a helpful AI assistant for the workspace "${workspaceName}". Your role is to help users understand their workspace data, answer questions, and provide insights.

Your name is "Brain" - you should introduce yourself as Brain and refer to yourself as Brain in your responses when appropriate.

CURRENT DATE & TIME:
- Today: ${todayDate} (${dayName})
- Month: ${monthYear}
Use this to correctly interpret relative date queries like "today", "this week", "last month", "yesterday".

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
- Groups (classes/batches)
- Workspace statistics and metrics
- Caller/counselor performance
- Recent activity

DATA RETRIEVAL RULES:
- For "how many students" or "total students" → ALWAYS call getWorkspaceStats and use the "studentCount" field
- For "how many calls" or "total calls" (all time) → ALWAYS call getWorkspaceStats and use "totalCallsAllTime"
- For "which group has most students" or "top student tags" → call getWorkspaceStats (it now includes "topGroups" and "topTags")
- For "how many calls today" → call getCallLogs with today: true and use the "total" field
- For date-filtered call counts → call getCallLogs with dateFrom/dateTo and use the "total" field (NOT count — count is just the page size)
- For "how many groups" or group list → ALWAYS call getGroups
- For "who called the most", "top callers", "counselor performance" → ALWAYS call getCallerPerformance
- For "call trends", "calls this week vs last week", "call volume over time", "show me February calls" → ALWAYS call getCallTrends with the appropriate dateFrom and dateTo
- For "create a call list" or "make a call list" → (1) call getGroups to show available groups, (2) ask the user to confirm which group, (3) gather studentIds via searchStudents or getFollowups, (4) call createCallList with name + groupId + studentIds
- NEVER guess or invent numbers; always call a function to get real data
- If a function returns data, cite the exact numbers from it in your response

RESPONSE FORMATTING RULES:
- Always use **bold** for key numbers and names (e.g. **42 students**, **John Smith**)
- Use bullet lists for listing multiple items (3 or more)
- Use a markdown table when comparing data across multiple callers, groups, or time periods
- Keep responses concise — lead with the direct answer, then add context
- For performance comparisons, always show the top result first
- For trend data, describe the peak day and overall direction (increasing/decreasing)
${workspaceAlerts ? `\nWORKSPACE ALERTS (auto-detected — mention these proactively if the user asks about follow-ups or workspace status):\n${workspaceAlerts}` : ''}`;
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

    // Get workspace name + alerts in parallel
    const [workspace, overdueFollowupCount, activeCallListCount] = await Promise.all([
      prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } }),
      prisma.followup.count({
        where: { workspaceId, status: 'PENDING', dueAt: { lt: new Date() } },
      }),
      prisma.callList.count({ where: { workspaceId, status: 'active' } }),
    ]);

    const alertParts: string[] = [];
    if (overdueFollowupCount > 0) {
      alertParts.push(`- ${overdueFollowupCount} follow-up${overdueFollowupCount !== 1 ? 's' : ''} are overdue (past due date)`);
    }
    if (activeCallListCount > 0) {
      alertParts.push(`- ${activeCallListCount} call list${activeCallListCount !== 1 ? 's' : ''} are currently active`);
    }
    const workspaceAlerts = alertParts.length > 0 ? alertParts.join('\n') : undefined;

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
        content: getSystemPrompt(workspace?.name || 'Workspace', workspaceAlerts),
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
      (name, args, wId) => executeFunction(name, args, wId, userId)
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
 * Build an export in the requested format from headers + rows
 */
function buildExport(
  headers: string[],
  rows: string[][],
  title: string,
  exportFormat: 'csv' | 'excel' | 'markdown' | 'pdf',
  baseFilename: string
): Promise<{ data: Buffer | string; filename: string; contentType: string }> {
  const timestamp = new Date().toISOString().split('T')[0];

  if (exportFormat === 'excel') {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Export');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    return Promise.resolve({
      data: buffer,
      filename: `${baseFilename}-${timestamp}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }

  if (exportFormat === 'markdown') {
    const sep = headers.map(() => '---').join(' | ');
    const headerRow = headers.join(' | ');
    const dataRows = rows.map(row => row.join(' | '));
    const md = [`# ${title}`, '', headerRow, sep, ...dataRows].join('\n');
    return Promise.resolve({
      data: md,
      filename: `${baseFilename}-${timestamp}.md`,
      contentType: 'text/markdown; charset=utf-8',
    });
  }

  if (exportFormat === 'pdf') {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve({
        data: Buffer.concat(chunks),
        filename: `${baseFilename}-${timestamp}.pdf`,
        contentType: 'application/pdf',
      }));
      doc.on('error', reject);

      // Title
      doc.fontSize(16).font('Helvetica-Bold').text(title, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(9).font('Helvetica').text(`Exported: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(1);

      // Calculate column widths
      const pageWidth = doc.page.width - 80;
      const colWidth = Math.floor(pageWidth / headers.length);

      // Header row
      doc.fontSize(9).font('Helvetica-Bold');
      let x = 40;
      headers.forEach((h) => {
        doc.text(h, x, doc.y, { width: colWidth, ellipsis: true, continued: false, lineBreak: false });
        x += colWidth;
      });
      doc.moveDown(0.3);
      doc.moveTo(40, doc.y).lineTo(40 + pageWidth, doc.y).stroke();
      doc.moveDown(0.3);

      // Data rows
      doc.font('Helvetica').fontSize(8);
      rows.forEach((row) => {
        const rowY = doc.y;
        // Add new page if needed
        if (rowY > doc.page.height - 60) {
          doc.addPage();
        }
        let rx = 40;
        row.forEach((cell) => {
          doc.text(String(cell ?? ''), rx, doc.y, { width: colWidth, ellipsis: true, continued: false, lineBreak: false });
          rx += colWidth;
        });
        doc.moveDown(0.4);
      });

      doc.end();
    });
  }

  // Default: CSV
  const csvRows = [
    headers.join(','),
    ...rows.map(row => row.map(v => escapeCSVValue(String(v ?? ''))).join(',')),
  ];
  return Promise.resolve({
    data: csvRows.join('\n'),
    filename: `${baseFilename}-${timestamp}.csv`,
    contentType: 'text/csv; charset=utf-8',
  });
}

/**
 * Export chat history
 */
export const exportChatHistory = async (
  workspaceId: string,
  userId: string,
  chatId: string,
  filters?: {
    dateFrom?: string;
    dateTo?: string;
    role?: 'user' | 'assistant';
    format?: 'csv' | 'excel' | 'markdown' | 'pdf';
  }
): Promise<{ data: Buffer | string; filename: string; contentType: string }> => {
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

  const exportFormat = filters?.format ?? 'csv';
  const headers = ['Timestamp', 'Role', 'Message', 'Message ID'];
  const rows = messages.map((msg: any) => [
    msg.createdAt.toISOString(),
    msg.role,
    msg.content,
    msg.id,
  ]);

  logger.info({ workspaceId, userId, messageCount: messages.length, exportFormat }, 'Chat history exported');

  return buildExport(headers, rows, 'Chat History Export', exportFormat, 'chat-history');
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
): Promise<{ data: Buffer | string; filename: string; contentType: string }> => {
  const exportFormat: 'csv' | 'excel' | 'markdown' | 'pdf' = filters?.format ?? 'csv';
  let rawRows: any[] = [];
  let headers: string[] = [];

  switch (dataType) {
    case 'students': {
      const result = await contextService.searchStudents('', workspaceId, 1000);
      headers = ['Name', 'Email', 'Tags'];
      rawRows = result.students.map((s: any) => [
        s.name || '',
        s.email || '',
        (s.tags || []).join(', '),
      ]);
      break;
    }
    case 'callLogs': {
      const result = await contextService.getCallLogs(filters || {}, workspaceId);
      headers = ['Student Name', 'Status', 'Call Date', 'Caller Name', 'Summary', 'Sentiment'];
      rawRows = result.callLogs.map((log: any) => [
        log.studentName || '',
        log.status || '',
        log.callDate ? new Date(log.callDate).toISOString() : '',
        log.callerName || '',
        log.summaryNote || '',
        log.sentiment || '',
      ]);
      break;
    }
    case 'followups': {
      const result = await contextService.getFollowups(filters || {}, workspaceId);
      headers = ['Student Name', 'Group Name', 'Status', 'Due Date', 'Notes'];
      rawRows = result.followups.map((f: any) => [
        f.studentName || '',
        f.groupName || '',
        f.status || '',
        f.dueDate ? new Date(f.dueDate).toISOString() : '',
        f.notes || '',
      ]);
      break;
    }
    case 'callLists': {
      const result = await contextService.getCallLists(filters || {}, workspaceId);
      headers = ['List Name', 'Group Name', 'Status', 'Item Count'];
      rawRows = result.callLists.map((list: any) => [
        list.name || '',
        list.groupName || '',
        list.status || '',
        String(list.itemCount || 0),
      ]);
      break;
    }
    case 'stats': {
      const result = await contextService.getWorkspaceStats(workspaceId);
      headers = ['Metric', 'Value'];
      rawRows = [];
      if (result.overview) {
        Object.entries(result.overview).forEach(([key, value]) => {
          rawRows.push([key, String(value ?? '')]);
        });
      }
      break;
    }
    default:
      throw new AppError(400, 'Invalid data type for export');
  }

  logger.info({ workspaceId, userId, dataType, rowCount: rawRows.length, exportFormat }, 'AI data exported');

  return buildExport(headers, rawRows, `AI Data Export — ${dataType}`, exportFormat, `ai-data-${dataType}`);
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

