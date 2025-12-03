import 'dotenv/config'; // Ensure .env is loaded first
import { prisma } from '../src/db/client';
import { initializeDefaultPermissions } from '../src/modules/roles/role.service';

async function main(): Promise<void> {
  console.log('🌱 Starting database seed...');

  // Initialize default permissions
  console.log('📋 Initializing default permissions...');
  await initializeDefaultPermissions();
  console.log('✅ Default permissions initialized');

  console.log('✅ Seed completed successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('❌ Seed failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });


