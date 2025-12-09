import { config } from 'dotenv';

config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10), // Optional for serverless, kept for local dev
  
  // Vercel detection
  IS_VERCEL: process.env.VERCEL === '1',
  
  // Database - MongoDB
  MONGODB_URL: process.env.MONGO_URL || process.env.MONGODB_URL!,
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET!,
  REFRESH_SECRET: process.env.REFRESH_SECRET!,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '900', // 15 minutes
  REFRESH_EXPIRES_IN: process.env.REFRESH_EXPIRES_IN || '604800', // 7 days
  
  // SMTP (supports both old and new variable names)
  // Trim whitespace from credentials to handle copy/paste issues
  SMTP_HOST: process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.EMAIL_PORT || process.env.SMTP_PORT || '587', 10),
  SMTP_SECURE: process.env.EMAIL_SECURE === 'true' || process.env.SMTP_SECURE === 'true',
  SMTP_USER: (process.env.GMAIL_USER || process.env.SMTP_USER || '').trim(),
  SMTP_PASS: (process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || '').trim(),
  
  // Email
  // EMAIL_FROM: Uses EMAIL_FROM env var, or falls back to GMAIL_USER, or default
  // IMPORTANT: Set GMAIL_USER or EMAIL_FROM in production to control sender email
  // Trim whitespace from email addresses
  EMAIL_FROM: (process.env.EMAIL_FROM || process.env.GMAIL_USER || 'noreply@brainscale.crm').trim(),
  EMAIL_FROM_NAME: (process.env.EMAIL_FROM_NAME || 'BrainScale CRM').trim(),
  EMAIL_REPLY_TO: (process.env.EMAIL_REPLY_TO || process.env.GMAIL_USER || 'support@brainscale.crm').trim(),
  DOMAIN: process.env.DOMAIN || 'gmail.com',
  // Email provider selection: 'sendgrid' (recommended) or 'smtp'
  EMAIL_PROVIDER: (process.env.EMAIL_PROVIDER || 'sendgrid').trim().toLowerCase(),
  // SendGrid
  SENDGRID_API_KEY: (process.env.SENDGRID_API_KEY || '').trim(),
  
  // App
  APP_URL: process.env.APP_URL || `http://localhost:${parseInt(process.env.PORT || '3000', 10)}`,
  
  // CORS
  // Allow both backend and typical frontend dev ports by default
  CORS_ORIGINS: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001')
    .split(',')
    .map((origin) => origin.trim()),
  
  // Timezone
  TZ: process.env.TZ || 'Asia/Dhaka',
  
  // Swagger
  SWAGGER_ENABLED: process.env.SWAGGER_ENABLED !== 'false',
  
  // Cron
  CRON_SECRET: process.env.CRON_SECRET || '',
} as const;

// Validate required env vars (database is validated separately below)
const requiredEnvVars = [
  'JWT_SECRET',
  'REFRESH_SECRET',
];

// Validate database connection
if (!process.env.MONGO_URL && !process.env.MONGODB_URL) {
  throw new Error(
    'Missing database configuration. Please provide MONGO_URL or MONGODB_URL in your .env file'
  );
}

// CRON_SECRET validation
// In production, CRON_SECRET is required for security (enforced in cron handler)
// In development, it's optional but recommended

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

