import 'dotenv/config'; // Ensure .env is loaded first
import { prisma } from '../src/db/client';
import { initializeDefaultPermissions, createDefaultRolesWithAllPermissions } from '../src/modules/roles/role.service';

async function main(): Promise<void> {
  console.log('🌱 Starting database seed...');

  // Initialize default permissions
  console.log('📋 Initializing default permissions...');
  await initializeDefaultPermissions();
  console.log('✅ Default permissions initialized');

  // Create Admin and Member roles for all existing workspaces
  console.log('👥 Creating Admin and Member roles for all workspaces...');
  const workspaces = await prisma.workspace.findMany({
    select: { id: true, name: true },
  });

  if (workspaces.length === 0) {
    console.log('⚠️  No workspaces found. Skipping role creation.');
  } else {
    console.log(`📦 Found ${workspaces.length} workspace(s). Creating roles...`);
    
    for (const workspace of workspaces) {
      try {
        console.log(`  Creating roles for workspace: ${workspace.name} (${workspace.id})...`);
        const result = await createDefaultRolesWithAllPermissions(workspace.id);
        console.log(`  ✅ Created/updated roles for ${workspace.name}:`);
        console.log(`     - Admin role: ${result.admin.permissions.length} permissions`);
        console.log(`     - Member role: ${result.member.permissions.length} permissions`);
      } catch (error: any) {
        console.error(`  ❌ Failed to create roles for workspace ${workspace.name}:`, error.message);
      }
    }
  }

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


