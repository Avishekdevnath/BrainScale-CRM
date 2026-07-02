import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth-guard';
import * as svc from './platform.service';

export const overview = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json(await svc.getOverview()); } catch (e) { next(e); }
};
export const listWorkspaces = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json(await svc.listWorkspaces(req.validatedData)); } catch (e) { next(e); }
};
export const createWorkspace = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.status(201).json(await svc.createWorkspace(req.user!.sub, req.validatedData)); } catch (e) { next(e); }
};
export const getWorkspace = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json(await svc.getWorkspace(req.params.id)); } catch (e) { next(e); }
};
export const updateWorkspace = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json(await svc.updateWorkspace(req.user!.sub, req.params.id, req.validatedData)); } catch (e) { next(e); }
};
export const deleteWorkspace = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json(await svc.softDeleteWorkspace(req.user!.sub, req.params.id)); } catch (e) { next(e); }
};
export const listMembers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json(await svc.listMembers(req.params.id)); } catch (e) { next(e); }
};
export const addMember = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.status(201).json(await svc.addMember(req.user!.sub, req.params.id, req.validatedData)); } catch (e) { next(e); }
};
export const changeMemberRole = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json(await svc.changeMemberRole(req.user!.sub, req.params.memberId, req.validatedData.role)); } catch (e) { next(e); }
};
export const listUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json(await svc.listUsers(req.validatedData)); } catch (e) { next(e); }
};
export const setSuperAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json(await svc.setSuperAdmin(req.user!.sub, req.params.id, req.validatedData.isSuperAdmin)); } catch (e) { next(e); }
};
export const setUserStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json(await svc.setUserStatus(req.user!.sub, req.params.id, req.validatedData.active)); } catch (e) { next(e); }
};
export const resetUserPassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json(await svc.resetUserPassword(req.user!.sub, req.params.id)); } catch (e) { next(e); }
};
export const listAudit = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json(await svc.listAudit(req.validatedData)); } catch (e) { next(e); }
};
export const listDeletedWorkspaces = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json(await svc.listDeletedWorkspaces()); } catch (e) { next(e); }
};
export const restoreWorkspace = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json(await svc.restoreWorkspace(req.user!.sub, req.params.id)); } catch (e) { next(e); }
};
export const getUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json(await svc.getUser(req.params.id)); } catch (e) { next(e); }
};
export const updateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json(await svc.updateUser(req.user!.sub, req.params.id, req.validatedData)); } catch (e) { next(e); }
};
export const listFeedback = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json(await svc.listFeedback(req.validatedData)); } catch (e) { next(e); }
};
export const replyFeedback = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json(await svc.replyFeedback(req.user!.sub, req.params.id, req.validatedData.reply)); } catch (e) { next(e); }
};
export const setFeedbackStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json(await svc.setFeedbackStatus(req.user!.sub, req.params.id, req.validatedData.status)); } catch (e) { next(e); }
};
export const createAnnouncement = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.status(201).json(await svc.createAnnouncement(req.user!.sub, req.validatedData)); } catch (e) { next(e); }
};
export const listAnnouncements = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json(await svc.listAnnouncements(req.validatedData)); } catch (e) { next(e); }
};
export const getAnnouncement = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json(await svc.getAnnouncement(req.params.id)); } catch (e) { next(e); }
};
export const deleteAnnouncement = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json(await svc.deleteAnnouncement(req.user!.sub, req.params.id)); } catch (e) { next(e); }
};
