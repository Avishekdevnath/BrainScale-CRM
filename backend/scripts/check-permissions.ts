import 'dotenv/config';
import { prisma } from '../src/db/client';

async function checkPermissions() {
  console.log('Checking permissions in database...');
  
  const permissions = await prisma.permission.findMany({
    orderBy: [{ resource: 'asc' }, { action: 'asc' }],
  });
  
  console.log(`Found ${permissions.length} permissions`);
  
  if (permissions.length === 0) {
    console.log('❌ No permissions found! Please run the seed script.');
  } else {
    console.log('✅ Permissions exist in database');
    console.log('\nFirst 10 permissions:');
    permissions.slice(0, 10).forEach((p) => {
      console.log(`  - ${p.resource}.${p.action} (${p.id})`);
    });
  }
  
  await prisma.$disconnect();
}

checkPermissions().catch(console.error);

