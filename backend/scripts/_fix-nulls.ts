import { prisma } from '../src/db/client';

async function run() {
  // Use raw MongoDB commands — Prisma rejects null filters on non-nullable fields
  const r1 = await prisma.$runCommandRaw({
    update: 'CallStatusOption',
    updates: [
      {
        q: { polarity: { $exists: false } },
        u: { $set: { polarity: 'neutral' } },
        multi: true,
      },
    ],
  });
  console.log('Fixed missing polarity:', JSON.stringify(r1));

  const r2 = await prisma.$runCommandRaw({
    update: 'CallStatusOption',
    updates: [
      {
        q: { isConnected: { $exists: false } },
        u: { $set: { isConnected: false } },
        multi: true,
      },
    ],
  });
  console.log('Fixed missing isConnected:', JSON.stringify(r2));

  await prisma.$disconnect();
}

run().catch((err) => { console.error(err); process.exit(1); });
