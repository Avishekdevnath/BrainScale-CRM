/**
 * Backfill listNumber for existing CallList records.
 * Assigns workspace-scoped sequential numbers ordered by createdAt ASC.
 *
 * Usage: npx tsx scripts/backfill-list-numbers.ts
 */

import { prisma } from '../src/db/client';

async function main() {
  const unnumberedFilter = {
    OR: [
      { listNumber: null },
      { listNumber: { isSet: false } },
    ],
  } as any;

  const workspaces = await prisma.callList.findMany({
    where: unnumberedFilter,
    select: { workspaceId: true },
    distinct: ['workspaceId'],
  });

  console.log(`Found ${workspaces.length} workspace(s) with un-numbered call lists.`);

  let totalUpdated = 0;

  for (const { workspaceId } of workspaces) {
    const lists = await prisma.callList.findMany({
      where: { workspaceId, ...unnumberedFilter },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    const maxResult = await prisma.callList.findFirst({
      where: { workspaceId, listNumber: { not: null } },
      orderBy: { listNumber: 'desc' },
      select: { listNumber: true },
    });
    let counter = (maxResult?.listNumber ?? 0) + 1;

    console.log(`Workspace ${workspaceId}: ${lists.length} lists to number, starting at #${counter}`);

    const batchSize = 100;
    for (let i = 0; i < lists.length; i += batchSize) {
      const batch = lists.slice(i, i + batchSize);
      await Promise.all(
        batch.map((list) =>
          prisma.callList.update({
            where: { id: list.id },
            data: { listNumber: counter++ },
          })
        )
      );
      console.log(`  Updated ${Math.min(i + batchSize, lists.length)} / ${lists.length}`);
    }

    totalUpdated += lists.length;
  }

  console.log(`\nDone. ${totalUpdated} call lists numbered.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
