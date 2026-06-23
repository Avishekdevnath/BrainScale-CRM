import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface JWTPayload {
  sub: string; // user id
  workspaceId: string;
  role: string; // legacy: 'ADMIN' | 'MEMBER'
  roleLevel?: string; // "OWNER" | "ADMIN" | "MEMBER" | "CUSTOM" — set by tenantGuard or on token issue
  permissions?: Array<{ resource: string; action: string }>;
}

export interface RefreshTokenPayload {
  sub: string;
}

export const signAccessToken = (payload: JWTPayload): string => {
  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured. Please set JWT_SECRET environment variable.');
  }
  try {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: parseInt(env.JWT_EXPIRES_IN, 10),
    });
  } catch (error) {
    throw new Error(`Failed to sign access token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const signRefreshToken = (userId: string): string => {
  if (!env.REFRESH_SECRET) {
    throw new Error('REFRESH_SECRET is not configured. Please set REFRESH_SECRET environment variable.');
  }
  try {
    return jwt.sign(
      { sub: userId } as RefreshTokenPayload,
      env.REFRESH_SECRET,
      {
        expiresIn: parseInt(env.REFRESH_EXPIRES_IN, 10),
      }
    );
  } catch (error) {
    throw new Error(`Failed to sign refresh token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const verifyAccessToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  try {
    return jwt.verify(token, env.REFRESH_SECRET) as RefreshTokenPayload;
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};

