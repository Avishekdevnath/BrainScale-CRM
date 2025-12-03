import { config } from 'dotenv';

config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  
  // Database - MongoDB
  MONGODB_URL: process.env.MONGO_URL || process.env.MONGODB_URL!,
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET!,
  REFRESH_SECRET: process.env.REFRESH_SECRET!,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '900', // 15 minutes
  REFRESH_EXPIRES_IN: process.env.REFRESH_EXPIRES_IN || '604800', // 7 days
  
  // SMTP (supports both old and new variable names)
  SMTP_HOST: process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.EMAIL_PORT || process.env.SMTP_PORT || '587', 10),
  SMTP_SECURE: process.env.EMAIL_SECURE === 'true' || process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.GMAIL_USER || process.env.SMTP_USER!,
  SMTP_PASS: process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS!,
  
  // Email
  EMAIL_FROM: process.env.EMAIL_FROM || process.env.GMAIL_USER || 'noreply@brainscale.crm',
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || 'BrainScale CRM',
  EMAIL_REPLY_TO: process.env.EMAIL_REPLY_TO || process.env.GMAIL_USER || 'support@brainscale.crm',
  DOMAIN: process.env.DOMAIN || 'gmail.com',
  
  // App
  APP_URL: process.env.APP_URL || 'http://localhost:3001',
  
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

// Validate CRON_SECRET in production
if (env.NODE_ENV === 'production' && !process.env.CRON_SECRET) {
  throw new Error('CRON_SECRET is required in production');
}

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

