import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth-guard';
import * as authService from './auth.service';
import { asyncHandler } from '../../middleware/error-handler';

export const signup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await authService.signup(req.validatedData);
  res.status(201).json(result);
});

export const login = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await authService.login(req.validatedData);
  res.json(result);
});

export const refresh = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { refreshToken } = req.validatedData;
  const result = await authService.refreshAccessToken(refreshToken);
  res.json(result);
});

export const me = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await authService.getCurrentUser(req.user!.sub);
  res.json(user);
});

export const changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await authService.changePassword(req.user!.sub, req.validatedData);
  res.json(result);
});

export const completeMemberSetup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await authService.completeMemberSetup(req.user!.sub, req.validatedData);
  res.json(result);
});

export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  // In a production app, you might want to blacklist the token
  // or store refresh tokens in the database and delete them on logout
  res.json({ message: 'Logged out successfully' });
});

export const verifyEmailOtp = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await authService.verifyEmailOtp(req.validatedData);
  res.json(result);
});

export const resendVerificationEmail = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await authService.resendVerificationEmail(req.validatedData);
  res.json(result);
});

export const resendVerificationOtp = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await authService.resendVerificationOtp(req.validatedData);
  res.json(result);
});

export const requestPasswordChangeOtp = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await authService.requestPasswordChangeOtp(req.validatedData, req.user!.sub);
  res.json(result);
});

export const changePasswordWithOtp = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await authService.changePasswordWithOtp(req.validatedData, req.user!.sub);
  res.json(result);
});

export const forgotPassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await authService.forgotPassword(req.validatedData);
  res.json(result);
});

export const resetPassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await authService.resetPassword(req.validatedData);
  res.json(result);
});

export const resendPasswordChangeOtp = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await authService.resendPasswordChangeOtp(req.validatedData, req.user!.sub);
  res.json(result);
});

export const resendResetPasswordOtp = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await authService.resendResetPasswordOtp(req.validatedData);
  res.json(result);
});

export const verifySignupOtp = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await authService.verifySignupOtp(req.validatedData);
  res.json(result);
});

export const resendSignupVerification = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await authService.resendSignupVerification(req.validatedData);
  res.json(result);
});

