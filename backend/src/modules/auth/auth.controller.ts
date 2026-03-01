import { CookieOptions, Response } from 'express';
import { AuthRequest } from '../../middleware/auth-guard';
import * as authService from './auth.service';
import { AppError, asyncHandler } from '../../middleware/error-handler';
import { env } from '../../config/env';

const getRefreshTokenCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  // Production frontend and API are on different origins, so cross-site cookie is required.
  sameSite: env.NODE_ENV === 'production' ? ('none' as const) : ('lax' as const),
  path: '/',
});

// Helper to set httpOnly refresh token cookie
const setRefreshTokenCookie = (res: Response, token: string) => {
  res.cookie('refreshToken', token, {
    ...getRefreshTokenCookieOptions(),
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
};

export const signup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await authService.signup(req.validatedData);
  res.status(201).json(result);
});

export const login = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await authService.login(req.validatedData);
  // Set httpOnly cookie with refresh token
  setRefreshTokenCookie(res, result.refreshToken);
  // Return only accessToken and user (not refreshToken in body)
  res.json({ accessToken: result.accessToken, user: result.user });
});

export const refresh = asyncHandler(async (req: AuthRequest, res: Response) => {
  // Get refreshToken from httpOnly cookie instead of body
  const refreshToken = (req.cookies as any)?.refreshToken || req.validatedData?.refreshToken;
  if (!refreshToken) {
    throw new AppError(401, 'Refresh token missing or expired. Please log in again.');
  }
  const result = await authService.refreshAccessToken(refreshToken);
  // Set new refresh token cookie
  setRefreshTokenCookie(res, result.refreshToken);
  // Return only accessToken (not refreshToken in body)
  res.json({ accessToken: result.accessToken });
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
  // Clear the httpOnly refresh token cookie
  res.clearCookie('refreshToken', getRefreshTokenCookieOptions());
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

