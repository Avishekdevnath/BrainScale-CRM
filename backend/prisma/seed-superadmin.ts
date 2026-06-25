import { PrismaClient } from '@prisma/client';

type MinimalPrisma = Pick<PrismaClient, 'user'>;

/**
 * Idempotently promote the user with the given email to platform super-admin.
 * Safe to re-run: no-op if the user is already a super-admin.
 */
export const seedSuperAdmin = async (
  prisma: MinimalPrisma,
  email: string,
): Promise<{ promoted: boolean; reason?: string }> => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { promoted: false, reason: `User not found: ${email}` };
  if ((user as any).isSuperAdmin) return { promoted: false, reason: 'already super-admin' };
  await prisma.user.update({ where: { id: user.id }, data: { isSuperAdmin: true } as any });
  return { promoted: true };
};

// CLI entrypoint: `PLATFORM_OWNER_EMAIL=you@x.com tsx prisma/seed-superadmin.ts`
if (require.main === module) {
  (async () => {
    const { prisma } = await import('../src/db/client');
    const email = process.env.PLATFORM_OWNER_EMAIL;
    if (!email) {
      console.error('PLATFORM_OWNER_EMAIL not set');
      process.exit(1);
    }
    const res = await seedSuperAdmin(prisma as any, email);
    console.log(res.promoted ? `Promoted ${email}` : `No change: ${res.reason}`);
    process.exit(0);
  })();
}
