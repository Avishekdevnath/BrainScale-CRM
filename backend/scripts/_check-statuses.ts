import { prisma } from '../src/db/client';

async function run() {
  const rows = await prisma.callStatusOption.findMany({ select: { value: true, isConnected: true, polarity: true } });
  console.table(rows);
  await prisma.$disconnect();
}
run();
