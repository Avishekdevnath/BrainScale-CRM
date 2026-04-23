import 'dotenv/config'; // Ensure .env is loaded first
import { prisma } from '../src/db/client';
import { initializeDefaultPermissions, createDefaultRolesWithAllPermissions } from '../src/modules/roles/role.service';

async function seedTeamChatChannels(workspaceId: string, workspaceName: string): Promise<void> {
  console.log(`  Seeding Team Chat channels for workspace: ${workspaceName}...`);

  try {
    // Create Main channel
    const mainChannel = await prisma.channel.upsert({
      where: {
        workspaceId_name: {
          workspaceId: workspaceId,
          name: 'main'
        }
      },
      update: {},
      create: {
        name: 'main',
        type: 'main',
        description: 'Company-wide announcements and general chatter',
        workspaceId: workspaceId,
        createdBy: 'system'
      }
    });

    // Create Resources channel
    const resourcesChannel = await prisma.channel.upsert({
      where: {
        workspaceId_name: {
          workspaceId: workspaceId,
          name: 'resources'
        }
      },
      update: {},
      create: {
        name: 'resources',
        type: 'resources',
        description: 'File/link sharing and team resources',
        workspaceId: workspaceId,
        createdBy: 'system'
      }
    });

    // Auto-add all workspace members to default channels
    const members = await prisma.user.findMany({
      where: {
        memberships: {
          some: { workspaceId: workspaceId }
        }
      }
    });

    console.log(`    Found ${members.length} workspace members, adding to channels...`);

    for (const member of members) {
      // Add to Main channel
      await prisma.userChannel.upsert({
        where: {
          userId_channelId: {
            userId: member.id,
            channelId: mainChannel.id
          }
        },
        update: {},
        create: {
          userId: member.id,
          channelId: mainChannel.id
        }
      });

      // Add to Resources channel
      await prisma.userChannel.upsert({
        where: {
          userId_channelId: {
            userId: member.id,
            channelId: resourcesChannel.id
          }
        },
        update: {},
        create: {
          userId: member.id,
          channelId: resourcesChannel.id
        }
      });
    }

    console.log(`    ✅ Team Chat channels seeded for ${workspaceName}`);
  } catch (error: any) {
    console.error(`    ❌ Failed to seed channels for ${workspaceName}:`, error.message);
  }
}

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
    console.log('⚠️  No workspaces found. Skipping role and channel creation.');
  } else {
    console.log(`📦 Found ${workspaces.length} workspace(s). Creating roles and channels...`);

    for (const workspace of workspaces) {
      try {
        console.log(`  Creating roles for workspace: ${workspace.name} (${workspace.id})...`);
        const result = await createDefaultRolesWithAllPermissions(workspace.id);
        console.log(`  ✅ Created/updated roles for ${workspace.name}:`);
        console.log(`     - Admin role: ${result.admin.permissions.length} permissions`);
        console.log(`     - Member role: ${result.member.permissions.length} permissions`);

        // Seed Team Chat channels
        await seedTeamChatChannels(workspace.id, workspace.name);
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


