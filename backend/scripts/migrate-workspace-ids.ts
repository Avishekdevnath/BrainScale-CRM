/**
 * Migration script to add workspaceId to existing CallLog and CallListItem records
 * 
 * This script should be run after updating the Prisma schema to add workspaceId fields.
 * 
 * Usage:
 *   npx ts-node scripts/migrate-workspace-ids.ts
 * 
 * Or compile and run:
 *   npm run build
 *   node dist/scripts/migrate-workspace-ids.js
 */

import { prisma } from '../src/db/client';

async function migrateCallLogs() {
  console.log('Migrating CallLog records...');
  
  // Find all CallLog records without workspaceId
  const callLogsWithoutWorkspace = await prisma.callLog.findMany({
    where: {
      workspaceId: null as any, // TypeScript workaround - will work after Prisma regenerate
    },
    include: {
      callList: {
        select: {
          workspaceId: true,
        },
      },
    },
  });

  console.log(`Found ${callLogsWithoutWorkspace.length} CallLog records without workspaceId`);

  let migrated = 0;
  let errors = 0;

  for (const callLog of callLogsWithoutWorkspace) {
    try {
      if (callLog.callList?.workspaceId) {
        await prisma.callLog.update({
          where: { id: callLog.id },
          data: {
            workspaceId: callLog.callList.workspaceId,
          },
        });
        migrated++;
      } else {
        console.warn(`CallLog ${callLog.id} has no associated CallList with workspaceId`);
        errors++;
      }
    } catch (error) {
      console.error(`Error migrating CallLog ${callLog.id}:`, error);
      errors++;
    }
  }

  console.log(`Migrated ${migrated} CallLog records. Errors: ${errors}`);
}

async function migrateCallListItems() {
  console.log('Migrating CallListItem records...');
  
  // Find all CallListItem records without workspaceId
  const itemsWithoutWorkspace = await prisma.callListItem.findMany({
    where: {
      workspaceId: null as any, // TypeScript workaround - will work after Prisma regenerate
    },
    include: {
      callList: {
        select: {
          workspaceId: true,
        },
      },
    },
  });

  console.log(`Found ${itemsWithoutWorkspace.length} CallListItem records without workspaceId`);

  let migrated = 0;
  let errors = 0;

  for (const item of itemsWithoutWorkspace) {
    try {
      if (item.callList?.workspaceId) {
        await prisma.callListItem.update({
          where: { id: item.id },
          data: {
            workspaceId: item.callList.workspaceId,
          },
        });
        migrated++;
      } else {
        console.warn(`CallListItem ${item.id} has no associated CallList with workspaceId`);
        errors++;
      }
    } catch (error) {
      console.error(`Error migrating CallListItem ${item.id}:`, error);
      errors++;
    }
  }

  console.log(`Migrated ${migrated} CallListItem records. Errors: ${errors}`);
}

async function main() {
  console.log('Starting workspaceId migration...\n');
  
  try {
    await migrateCallLogs();
    console.log('');
    await migrateCallListItems();
    console.log('\nMigration completed!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

