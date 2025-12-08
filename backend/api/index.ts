import { VercelRequest, VercelResponse } from '@vercel/node';
import { app } from '../src/app';

/**
 * Vercel serverless function handler
 * 
 * Vercel's @vercel/node package automatically handles Express app integration.
 * The Express app will handle all routing and middleware.
 */
export default function handler(
  req: VercelRequest,
  res: VercelResponse
): void {
  // Pass request and response to Express app
  // Vercel runtime handles the conversion automatically
  app(req as any, res as any);
}

