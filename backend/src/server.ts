import { app } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './db/client';

// Only start server if not in Vercel environment
// In Vercel, the serverless function handler (api/index.ts) handles requests
if (process.env.VERCEL !== '1') {
  const PORT = env.PORT;

  // Start server
  // Explicitly bind to 0.0.0.0 to allow external connections (required for Fly.io)
  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`🚀 Server running on port ${PORT}`);
    // Use APP_URL if available, otherwise construct from request (for production)
    const docsUrl = env.APP_URL 
      ? `${env.APP_URL}/api/docs` 
      : `http://localhost:${PORT}/api/docs`;
    logger.info(`📚 API Docs available at ${docsUrl}`);
    logger.info(`🌍 Environment: ${env.NODE_ENV}`);
  });

  // Graceful shutdown (only for traditional server environments)
  const gracefulShutdown = async (signal: string) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);
    
    server.close(async () => {
      logger.info('HTTP server closed');
      
      // Disconnect Prisma
      await prisma.$disconnect();
      logger.info('Database connection closed');
      
      process.exit(0);
    });
    
    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error({ err: error }, 'Uncaught Exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled Rejection');
  process.exit(1);
});

