import { VercelRequest, VercelResponse } from '@vercel/node';
import { app } from '../src/app';
import { logger } from '../src/config/logger';

/**
 * Vercel serverless function handler
 * 
 * Explicitly handle requests to ensure proper path preservation
 * and async handling for Express app.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Log incoming request for debugging
  logger.info({
    method: req.method,
    url: req.url,
    originalUrl: req.url,
    path: req.url?.split('?')[0],
    headers: {
      host: req.headers.host,
      'x-forwarded-proto': req.headers['x-forwarded-proto'],
      'x-forwarded-for': req.headers['x-forwarded-for'],
    },
  }, 'Vercel serverless function handler called');

  // Ensure originalUrl is set for Express routing
  const reqWithOriginalUrl = req as any;
  if (!reqWithOriginalUrl.originalUrl && req.url) {
    reqWithOriginalUrl.originalUrl = req.url;
  }

  return new Promise<void>((resolve) => {
    let resolved = false;
    const doResolve = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    // Handle response finish event
    res.once('finish', () => {
      logger.info({
        statusCode: res.statusCode,
        url: req.url,
      }, 'Response finished');
      doResolve();
    });

    // Handle response close event (for early termination)
    res.once('close', () => {
      logger.info({ url: req.url }, 'Response closed');
      doResolve();
    });

    // Pass request to Express app
    // The path should be preserved automatically by Vercel
    app(reqWithOriginalUrl, res as any);
  });
}

