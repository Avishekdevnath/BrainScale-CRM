import { app } from '../src/app';

/**
 * Vercel serverless function handler
 * 
 * Export the Express app directly. Vercel's @vercel/node runtime
 * automatically detects Express applications and converts them to
 * serverless functions. This is the recommended pattern.
 */
export default app;

