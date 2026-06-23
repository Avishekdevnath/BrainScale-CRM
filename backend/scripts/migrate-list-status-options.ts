/**
 * Migration: move per-call-list custom status options (callList.meta.statusOptions)
 * into the workspace-level CallStatusOption table, then clear them from list meta.
 *
 * Background: statuses added via the calls-manager dropdown used to be stored
 * per-call-list in `meta.statusOptions`. They are now created as workspace
 * CallStatusOption rows so they show in Call List Settings. This backfills
 * statuses created before that change.
 *
 * Usage:
 *   npx tsx scripts/migrate-list-status-options.ts
 *
 * Idempotent — safe to run multiple times. Existing workspace values are skipped.
 */

import { prisma } from '../src/db/client';

type MetaStatusOption = { value: string; label: string; color?: string };

async function migrate() {
  console.log('Starting per-list status options migration...\n');

  const lists = await prisma.callList.findMany({
    select: { id: true, name: true, workspaceId: true, meta: true },
  });

  // Track next `order` per workspace so appended statuses sort after existing ones.
  const nextOrderByWorkspace = new Map<string, number>();
  const getNextOrder = async (workspaceId: string): Promise<number> => {
    if (!nextOrderByWorkspace.has(workspaceId)) {
      const agg = await (prisma.callStatusOption as any).aggregate({
        where: { workspaceId },
        _max: { order: true },
      });
      nextOrderByWorkspace.set(workspaceId, (agg._max?.order ?? -1) + 1);
    }
    return nextOrderByWorkspace.get(workspaceId)!;
  };

  let created = 0;
  let skipped = 0;
  let listsCleared = 0;

  for (const list of lists) {
    const meta = (list.meta as Record<string, any>) || {};
    const options: MetaStatusOption[] = Array.isArray(meta.statusOptions) ? meta.statusOptions : [];
    if (options.length === 0) continue;

    for (const opt of options) {
      const value = (opt.value || '')
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
      if (!value) continue;

      const existing = await prisma.callStatusOption.findUnique({
        where: { workspaceId_value: { workspaceId: list.workspaceId, value } },
      });
      if (existing) {
        skipped++;
        continue;
      }

      const order = await getNextOrder(list.workspaceId);
      await prisma.callStatusOption.create({
        data: {
          workspaceId: list.workspaceId,
          value,
          label: opt.label || value,
          color: opt.color || '#6b7280',
          isDefault: false,
          order,
        },
      });
      nextOrderByWorkspace.set(list.workspaceId, order + 1);
      created++;
      console.log(`  + [${list.name}] "${opt.label}" -> workspace status "${value}"`);
    }

    // Clear migrated statuses from list meta (they now live at workspace level).
    const { statusOptions, ...restMeta } = meta;
    await prisma.callList.update({
      where: { id: list.id },
      data: { meta: restMeta },
    });
    listsCleared++;
  }

  console.log(`\nDone. created=${created}, skipped(existing)=${skipped}, listsCleared=${listsCleared}`);
}

migrate()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
