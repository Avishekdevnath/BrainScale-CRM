import { VercelRequest, VercelResponse } from '@vercel/node';
import { processScheduledDigests } from '../../src/modules/emails/cron.service';
import { env } from '../../src/config/env';
import { logger } from '../../src/config/logger';

/**
 * Vercel cron function handler for processing scheduled email digests
 * Runs every hour as configured in vercel.json
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Verify cron secret for security
  // Support both X-Cron-Secret header and Authorization Bearer token
  const cronSecret = req.headers['x-cron-secret'] as string;
  const authHeader = req.headers.authorization;
  
  // Extract Bearer token if present
  const bearerToken = authHeader?.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : null;

  // Validate cron secret
  // Check if CRON_SECRET is actually configured (not empty)
  const hasSecret = Boolean(env.CRON_SECRET && env.CRON_SECRET.trim());
  const isValid =
    (cronSecret && cronSecret === env.CRON_SECRET) ||
    (bearerToken && bearerToken === env.CRON_SECRET);

  // If CRON_SECRET is configured, require valid authentication
  if (hasSecret && !isValid) {
    logger.warn('Unauthorized cron job attempt');
    res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Invalid or missing cron secret' 
    });
    return;
  }

  // Security: In production, require CRON_SECRET to be configured
  if (!hasSecret && env.NODE_ENV === 'production') {
    logger.error('CRON_SECRET not configured in production - rejecting request for security');
    res.status(500).json({ 
      error: 'Configuration Error',
      message: 'CRON_SECRET must be configured in production for security' 
    });
    return;
  }

  // In development, allow without secret but warn
  if (!hasSecret) {
    logger.warn('CRON_SECRET not configured - allowing access in development mode only');
  }

  try {
    logger.info('Starting scheduled digest processing (Vercel cron)');
    const results = await processScheduledDigests();
    logger.info(results, 'Cron job completed successfully');
    
    res.status(200).json({ 
      success: true, 
      results,
      timestamp: new Date().toISOString()
    });
    return;
  } catch (error) {
    logger.error({ error }, 'Cron job failed');
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
}