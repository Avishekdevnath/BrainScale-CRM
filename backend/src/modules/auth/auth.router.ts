import { Router } from 'express';
import * as authController from './auth.controller';
import { zodValidator } from '../../middleware/validate';
import { authGuard } from '../../middleware/auth-guard';
import { authLimiter, resendVerificationLimiter } from '../../middleware/rate-limit';
import {
  SignupSchema,
  LoginSchema,
  RefreshTokenSchema,
  VerifyEmailSchema,
  ResendVerificationSchema,
  VerifyEmailOtpSchema,
  ResendVerificationOtpSchema,
  ChangePasswordSchema,
  CompleteMemberSetupSchema,
  RequestPasswordChangeOtpSchema,
  ChangePasswordWithOtpSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  ResendPasswordChangeOtpSchema,
  ResendResetPasswordOtpSchema,
} from './auth.schemas';

const router = Router();

/**
 * @openapi
 * /auth/signup:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: password123
 *               name:
 *                 type: string
 *                 example: John Doe
 *     responses:
 *       201:
 *         description: User created successfully
 *       409:
 *         description: User already exists
 */
router.post('/signup', authLimiter, zodValidator(SignupSchema), authController.signup);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', authLimiter, zodValidator(LoginSchema), authController.login);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed
 *       401:
 *         description: Invalid refresh token
 */
router.post('/refresh', authLimiter, zodValidator(RefreshTokenSchema), authController.refresh);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Get current user details
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: User details
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authGuard, authController.me);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Logout current user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post('/logout', authGuard, authController.logout);

/**
 * @openapi
 * /auth/verify-email:
 *   post:
 *     summary: Verify email address with token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Verification token from email
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post('/verify-email', authLimiter, zodValidator(VerifyEmailSchema), authController.verifyEmail);

/**
 * @openapi
 * /auth/verify-email-otp:
 *   post:
 *     summary: Verify email address using a one-time password (OTP)
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               otp:
 *                 type: string
 *                 description: 6-digit verification code sent via email
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired OTP
 */
router.post('/verify-email-otp', authLimiter, zodValidator(VerifyEmailOtpSchema), authController.verifyEmailOtp);

/**
 * @openapi
 * /auth/resend-verification:
 *   post:
 *     summary: Resend verification email
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Verification email sent
 *       400:
 *         description: Email already verified or invalid
 */
router.post('/resend-verification', resendVerificationLimiter, zodValidator(ResendVerificationSchema), authController.resendVerificationEmail);

/**
 * @openapi
 * /auth/resend-verification-otp:
 *   post:
 *     summary: Resend a verification OTP via email
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Verification OTP sent
 *       400:
 *         description: Email already verified or invalid
 *       429:
 *         description: Too many OTP requests
 */
router.post(
  '/resend-verification-otp',
  resendVerificationLimiter,
  zodValidator(ResendVerificationOtpSchema),
  authController.resendVerificationOtp
);

/**
 * @openapi
 * /auth/change-password:
 *   post:
 *     summary: Change user password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       401:
 *         description: Current password is incorrect
 */
router.post(
  '/change-password',
  authGuard,
  zodValidator(ChangePasswordSchema),
  authController.changePassword
);

/**
 * @openapi
 * /auth/complete-setup:
 *   post:
 *     summary: Complete member setup - change password and accept agreement
 *     tags: [Auth]
 *     description: For admin-created members who need to complete their account setup. Changes temporary password and accepts agreement/terms.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *               - agreementAccepted
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 description: Current temporary password
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: New password (must meet password requirements)
 *               agreementAccepted:
 *                 type: boolean
 *                 description: Must be true to accept agreement/terms
 *                 example: true
 *     responses:
 *       200:
 *         description: Setup completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 workspace:
 *                   type: object
 *                 message:
 *                   type: string
 *       400:
 *         description: Agreement not accepted or validation error
 *       401:
 *         description: Invalid current password
 */
router.post(
  '/complete-setup',
  authGuard,
  zodValidator(CompleteMemberSetupSchema),
  authController.completeMemberSetup
);

/**
 * @openapi
 * /auth/request-password-change-otp:
 *   post:
 *     summary: Request OTP for password change
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       400:
 *         description: Email not verified or validation error
 *       403:
 *         description: Cannot request OTP for another user's account
 *       404:
 *         description: User not found
 *       429:
 *         description: Too many requests
 */
router.post(
  '/request-password-change-otp',
  authGuard,
  resendVerificationLimiter,
  zodValidator(RequestPasswordChangeOtpSchema),
  authController.requestPasswordChangeOtp
);

/**
 * @openapi
 * /auth/change-password-otp:
 *   post:
 *     summary: Change password with OTP verification
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               otp:
 *                 type: string
 *                 description: 6-digit OTP code
 *                 example: "123456"
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Invalid or expired OTP
 *       403:
 *         description: Cannot change password for another user's account
 *       404:
 *         description: User not found
 */
router.post(
  '/change-password-otp',
  authGuard,
  authLimiter,
  zodValidator(ChangePasswordWithOtpSchema),
  authController.changePasswordWithOtp
);

/**
 * @openapi
 * /auth/resend-password-change-otp:
 *   post:
 *     summary: Resend password change OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       400:
 *         description: Email not verified or validation error
 *       403:
 *         description: Cannot request OTP for another user's account
 *       404:
 *         description: User not found
 *       429:
 *         description: Too many requests
 */
router.post(
  '/resend-password-change-otp',
  authGuard,
  resendVerificationLimiter,
  zodValidator(ResendPasswordChangeOtpSchema),
  authController.resendPasswordChangeOtp
);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset OTP
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: If account exists and is verified, reset code has been sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "If an account exists with this email and is verified, a password reset code has been sent."
 *       429:
 *         description: Too many requests
 */
router.post(
  '/forgot-password',
  resendVerificationLimiter,
  zodValidator(ForgotPasswordSchema),
  authController.forgotPassword
);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     summary: Reset password with OTP verification
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               otp:
 *                 type: string
 *                 description: 6-digit OTP code
 *                 example: "123456"
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired OTP
 *       404:
 *         description: User not found
 */
router.post(
  '/reset-password',
  authLimiter,
  zodValidator(ResetPasswordSchema),
  authController.resetPassword
);

/**
 * @openapi
 * /auth/resend-reset-password-otp:
 *   post:
 *     summary: Resend password reset OTP
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: If account exists and is verified, reset code has been sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "If an account exists with this email and is verified, a password reset code has been sent."
 *       429:
 *         description: Too many requests
 */
router.post(
  '/resend-reset-password-otp',
  resendVerificationLimiter,
  zodValidator(ResendResetPasswordOtpSchema),
  authController.resendResetPasswordOtp
);

export default router;

