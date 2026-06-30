/**
 * Migration: backfill isConnected + polarity on existing CallStatusOption records.
 *
 * Before this change, CallStatusOption had no isConnected or polarity fields.
 * Prisma defaults both to false/neutral, so all existing statuses appear as
 * "not connected" in dashboard metrics. This script sets sensible values based
 * on the status value string across all workspaces.
 *
 * Usage:
 *   npx tsx scripts/migrate-connected-statuses.ts
 *
 * Idempotent — safe to run multiple times.
 */

import { prisma } from '../src/db/client';

// Values that count as a connected call (isConnected = true)
const CONNECTED_VALUES = ['connected', 'completed', 'call_back_later'];

// Values with positive outcome polarity
const POSITIVE_VALUES = ['connected', 'completed', 'call_back_later'];

// Values with negative outcome polarity
const NEGATIVE_VALUES = ['switched_off', 'missed', 'busy', 'no_answer'];

// Everything else stays neutral (default)

async function migrate() {
  console.log('Fetching all workspaces...');
  const total = await prisma.callStatusOption.count();
  console.log(`Total CallStatusOption records: ${total}`);

  // 1. Mark isConnected = true
  const connectedResult = await prisma.callStatusOption.updateMany({
    where: { value: { in: CONNECTED_VALUES } },
    data: { isConnected: true },
  });
  console.log(`Set isConnected=true on ${connectedResult.count} records (values: ${CONNECTED_VALUES.join(', ')})`);

  // 2. Set polarity = positive
  const positiveResult = await prisma.callStatusOption.updateMany({
    where: { value: { in: POSITIVE_VALUES } },
    data: { polarity: 'positive' },
  });
  console.log(`Set polarity=positive on ${positiveResult.count} records (values: ${POSITIVE_VALUES.join(', ')})`);

  // 3. Set polarity = negative
  const negativeResult = await prisma.callStatusOption.updateMany({
    where: { value: { in: NEGATIVE_VALUES } },
    data: { polarity: 'negative' },
  });
  console.log(`Set polarity=negative on ${negativeResult.count} records (values: ${NEGATIVE_VALUES.join(', ')})`);

  // 4. Everything else: isConnected=false, polarity=neutral (already the Prisma defaults — no-op)
  console.log('Done. Remaining records keep isConnected=false, polarity=neutral (Prisma defaults).');

  // Summary
  const connected = await prisma.callStatusOption.count({ where: { isConnected: true } });
  const positive = await prisma.callStatusOption.count({ where: { polarity: 'positive' } });
  const negative = await prisma.callStatusOption.count({ where: { polarity: 'negative' } });
  const neutral = await prisma.callStatusOption.count({ where: { polarity: 'neutral' } });
  console.log(`\nFinal state:`);
  console.log(`  isConnected=true : ${connected}`);
  console.log(`  polarity=positive: ${positive}`);
  console.log(`  polarity=negative: ${negative}`);
  console.log(`  polarity=neutral : ${neutral}`);
}

migrate()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
