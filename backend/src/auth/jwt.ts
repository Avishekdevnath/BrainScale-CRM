import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface JWTPayload {
  sub: string; // user id
  workspaceId: string;
  role: string; // 'ADMIN' | 'MEMBER' or custom role
  permissions?: Array<{ resource: string; action: string }>; // Permissions from custom role
}
//test comment

export interface RefreshTokenPayload {
  sub: string;
}

export const signAccessToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: parseInt(env.JWT_EXPIRES_IN, 10),
  });
};

export const signRefreshToken = (userId: string): string => {
  return jwt.sign(
    { sub: userId } as RefreshTokenPayload,
    env.REFRESH_SECRET,
    {
      expiresIn: parseInt(env.REFRESH_EXPIRES_IN, 10),
    }
  );
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

