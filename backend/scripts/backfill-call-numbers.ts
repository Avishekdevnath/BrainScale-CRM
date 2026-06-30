/**
 * Backfill callNumber for existing CallLog records.
 * Assigns workspace-scoped sequential numbers ordered by callDate ASC.
 *
 * Usage: npx tsx scripts/backfill-call-numbers.ts
 */

import { prisma } from '../src/db/client';

async function main() {
  // In MongoDB, missing field != null — use isSet:false to find documents without the field
  const unnumberedFilter = {
    OR: [
      { callNumber: null },
      { callNumber: { isSet: false } },
    ],
  } as any;

  const workspaces = await prisma.callLog.findMany({
    where: unnumberedFilter,
    select: { workspaceId: true },
    distinct: ['workspaceId'],
  });

  console.log(`Found ${workspaces.length} workspace(s) with un-numbered call logs.`);

  let totalUpdated = 0;

  for (const { workspaceId } of workspaces) {
    const logs = await prisma.callLog.findMany({
      where: { workspaceId, ...unnumberedFilter },
      orderBy: { callDate: 'asc' },
      select: { id: true },
    });

    const maxResult = await prisma.callLog.findFirst({
      where: { workspaceId, callNumber: { not: null } },
      orderBy: { callNumber: 'desc' },
      select: { callNumber: true },
    });
    let counter = (maxResult?.callNumber ?? 0) + 1;

    console.log(`Workspace ${workspaceId}: ${logs.length} logs to number, starting at #${counter}`);

    const batchSize = 100;
    for (let i = 0; i < logs.length; i += batchSize) {
      const batch = logs.slice(i, i + batchSize);
      await Promise.all(
        batch.map((log) =>
          prisma.callLog.update({
            where: { id: log.id },
            data: { callNumber: counter++ },
          })
        )
      );
      console.log(`  Updated ${Math.min(i + batchSize, logs.length)} / ${logs.length}`);
    }

    totalUpdated += logs.length;
  }

  console.log(`\nDone. ${totalUpdated} call logs numbered.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
