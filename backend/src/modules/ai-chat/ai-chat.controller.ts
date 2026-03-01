import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth-guard';
import { asyncHandler } from '../../middleware/error-handler';
import * as aiChatService from './ai-chat.service';

export const createChat = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { title } = req.validatedData || {};
  const result = await aiChatService.createChat(
    req.user!.workspaceId!,
    req.user!.sub,
    title
  );
  res.status(201).json(result);
});

export const getChats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await aiChatService.getChats(
    req.user!.workspaceId!,
    req.user!.sub
  );
  res.json(result);
});

export const getChatById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { chatId } = req.params;
  const result = await aiChatService.getChatById(
    req.user!.workspaceId!,
    req.user!.sub,
    chatId
  );
  res.json(result);
});

export const updateChat = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { chatId } = req.params;
  const { title } = req.validatedData!;
  const result = await aiChatService.updateChatTitle(
    req.user!.workspaceId!,
    req.user!.sub,
    chatId,
    title
  );
  res.json(result);
});

export const deleteChat = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { chatId } = req.params;
  await aiChatService.deleteChat(
    req.user!.workspaceId!,
    req.user!.sub,
    chatId
  );
  res.status(204).send();
});

export const sendMessage = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { message, chatId } = req.validatedData!;
  const result = await aiChatService.sendMessage(
    req.user!.workspaceId!,
    req.user!.sub,
    message,
    chatId
  );
  res.status(201).json(result);
});

export const getChatHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { chatId } = req.params;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const result = await aiChatService.getChatHistory(
    req.user!.workspaceId!,
    req.user!.sub,
    chatId,
    limit
  );
  res.json(result);
});

export const clearChatHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { chatId } = req.params;
  await aiChatService.clearChatHistory(
    req.user!.workspaceId!,
    req.user!.sub,
    chatId
  );
  res.status(204).send();
});

export const exportChatHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { chatId } = req.params;
  const filters = req.validatedData || {};
  const result = await aiChatService.exportChatHistory(
    req.user!.workspaceId!,
    req.user!.sub,
    chatId,
    filters
  );

  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
  if (result.data instanceof Buffer) {
    res.setHeader('Content-Length', result.data.length);
    res.end(result.data);
  } else {
    // Text formats: add BOM for CSV so Excel opens correctly
    const text = result.contentType.includes('csv') ? '\ufeff' + result.data : result.data;
    res.setHeader('Content-Length', Buffer.byteLength(text as string, 'utf-8'));
    res.send(text);
  }
});

export const exportAIData = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { dataType, filters, format } = req.validatedData!;
  const result = await aiChatService.exportAIData(
    req.user!.workspaceId!,
    req.user!.sub,
    dataType,
    { ...filters, format }
  );

  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
  if (result.data instanceof Buffer) {
    res.setHeader('Content-Length', result.data.length);
    res.end(result.data);
  } else {
    const text = result.contentType.includes('csv') ? '\ufeff' + result.data : result.data;
    res.setHeader('Content-Length', Buffer.byteLength(text as string, 'utf-8'));
    res.send(text);
  }
});

