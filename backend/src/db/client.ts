import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// In serverless (Vercel), don't cache in global - each function instance is isolated
// In traditional server environments, cache to prevent multiple instances
if (process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1') {
  globalForPrisma.prisma = prisma;
}

export default prisma;

