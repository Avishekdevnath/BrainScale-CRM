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
  
  // Add BOM for Excel compatibility
  const csvWithBOM = '\ufeff' + result.csv;
  
  // Set headers for CSV download
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
  res.setHeader('Content-Length', Buffer.byteLength(csvWithBOM, 'utf-8'));
  
  res.send(csvWithBOM);
});

export const exportAIData = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { dataType, filters } = req.validatedData!;
  const result = await aiChatService.exportAIData(
    req.user!.workspaceId!,
    req.user!.sub,
    dataType,
    filters
  );
  
  // Add BOM for Excel compatibility
  const csvWithBOM = '\ufeff' + result.csv;
  
  // Set headers for CSV download
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
  res.setHeader('Content-Length', Buffer.byteLength(csvWithBOM, 'utf-8'));
  
  res.send(csvWithBOM);
});

