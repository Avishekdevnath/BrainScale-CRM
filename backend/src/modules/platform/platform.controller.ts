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
