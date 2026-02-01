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
  
  // Email provider selection: 'sendgrid' (API), 'sendgrid-smtp' (SMTP), or 'smtp' (generic SMTP)
  EMAIL_PROVIDER: (process.env.EMAIL_PROVIDER || 'sendgrid').trim().toLowerCase(),
  // SendGrid
  SENDGRID_API_KEY: (process.env.SENDGRID_API_KEY || '').trim(),
  
  // SMTP Configuration
  // For SendGrid SMTP: host=smtp.sendgrid.net, user=apikey, pass=SENDGRID_API_KEY
  // For Gmail SMTP: host=smtp.gmail.com, user=your_email, pass=app_password
  // Auto-configure SendGrid SMTP if EMAIL_PROVIDER is 'sendgrid-smtp' and SENDGRID_API_KEY is set
  SMTP_HOST: (() => {
    const provider = (process.env.EMAIL_PROVIDER || 'sendgrid').trim().toLowerCase();
    if (provider === 'sendgrid-smtp' && process.env.SENDGRID_API_KEY) {
      return 'smtp.sendgrid.net';
    }
    return process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com';
  })(),
  SMTP_PORT: parseInt(process.env.EMAIL_PORT || process.env.SMTP_PORT || '587', 10),
  SMTP_SECURE: process.env.EMAIL_SECURE === 'true' || process.env.SMTP_SECURE === 'true',
  SMTP_USER: (() => {
    const provider = (process.env.EMAIL_PROVIDER || 'sendgrid').trim().toLowerCase();
    if (provider === 'sendgrid-smtp' && process.env.SENDGRID_API_KEY) {
      return 'apikey'; // SendGrid SMTP username is always 'apikey'
    }
    return (process.env.GMAIL_USER || process.env.SMTP_USER || '').trim();
  })(),
  SMTP_PASS: (() => {
    const provider = (process.env.EMAIL_PROVIDER || 'sendgrid').trim().toLowerCase();
    if (provider === 'sendgrid-smtp' && process.env.SENDGRID_API_KEY) {
      return (process.env.SENDGRID_API_KEY || '').trim(); // Use API key as password for SendGrid SMTP
    }
    return (process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || '').trim();
  })(),
  
  // Email
  // EMAIL_FROM: Uses EMAIL_FROM env var, or falls back to GMAIL_USER, or default
  // IMPORTANT: Set EMAIL_FROM in production to control sender email
  // Trim whitespace from email addresses
  EMAIL_FROM: (process.env.EMAIL_FROM || process.env.GMAIL_USER || 'noreply@brainscale.crm').trim(),
  EMAIL_FROM_NAME: (process.env.EMAIL_FROM_NAME || 'BrainScale CRM').trim(),
  EMAIL_REPLY_TO: (process.env.EMAIL_REPLY_TO || process.env.GMAIL_USER || 'support@brainscale.crm').trim(),
  DOMAIN: process.env.DOMAIN || 'gmail.com',

  // Company / compliance info for email footers
  // Set these in your environment for CAN-SPAM / CASL compliance
  COMPANY_NAME: (process.env.COMPANY_NAME || 'BrainScale CRM').trim(),
  COMPANY_ADDRESS: (process.env.COMPANY_ADDRESS || '').trim(),
  
  // App
  // NOTE: Historically APP_URL was used as the link base in outbound emails.
  // That caused emails to sometimes point to the backend host (e.g. http://localhost:5000).
  // FRONTEND_URL is now the preferred base for user-facing links (login, reset password, etc).
  FRONTEND_URL:
    process.env.FRONTEND_URL ||
    process.env.APP_URL ||
    'http://localhost:3000',

  // Backward-compatible: keep APP_URL for any existing non-email usage.
  APP_URL: process.env.APP_URL || `http://localhost:${parseInt(process.env.PORT || '3000', 10)}`,
  
  // CORS
  // Allow both backend and typical frontend dev ports by default
  CORS_ORIGINS: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001')
    .split(',')
    .map((origin) => origin.trim()),
  
  // Rate Limiting
  // Set RATE_LIMIT_ENABLED=false to disable all rate limiting
  // Default: true (enabled) for backward compatibility
  // When disabled, all rate limiters become no-op middlewares
  RATE_LIMIT_ENABLED: process.env.RATE_LIMIT_ENABLED !== 'false',
  
  // Timezone
  TZ: process.env.TZ || 'Asia/Dhaka',
  
  // Swagger
  // Disabled by default for security. Set SWAGGER_ENABLED=true to enable API documentation
  SWAGGER_ENABLED: process.env.SWAGGER_ENABLED === 'true',
  
  // Cron
  CRON_SECRET: process.env.CRON_SECRET || '',

  // Billing / plan enforcement
  // Disabled by default. Set BILLING_ENABLED=true to enforce plan limits & enable billing flows.
  BILLING_ENABLED: process.env.BILLING_ENABLED === 'true',
  
  // AI Configuration
  AI_ENABLED: process.env.AI_ENABLED === 'true',
  AI_PROVIDER: (process.env.AI_PROVIDER || 'none').trim().toLowerCase(),
  OPENAI_API_KEY: (process.env.OPENAI_API_KEY || '').trim(),
  ANTHROPIC_API_KEY: (process.env.ANTHROPIC_API_KEY || '').trim(),
  AI_FEATURES: (process.env.AI_FEATURES || '')
    .split(',')
    .map(f => f.trim())
    .filter(f => f.length > 0),
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

