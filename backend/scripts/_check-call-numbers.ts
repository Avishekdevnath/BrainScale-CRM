import { prisma } from '../src/db/client';
async function main() {
  const total = await prisma.callLog.count();
  const withNum = await prisma.callLog.count({ where: { callNumber: { not: null } } });
  console.log(`Total call logs: ${total}, with callNumber: ${withNum}, without: ${total - withNum}`);
}
main().finally(() => prisma.$disconnect());
