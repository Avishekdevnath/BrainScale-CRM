/**
 * Sync Permissions Script (non-destructive)
 *
 * For each workspace:
 *   1. initializeDefaultPermissions — creates any missing Permission rows
 *      (idempotent; only inserts new resources/actions, e.g. tasks, forms).
 *   2. seedWorkspaceSystemRoles — re-syncs Owner/Admin (all perms) and
 *      Member (base perms) to the canonical set. Custom roles are untouched.
 *
 * Run: npx ts-node src/scripts/sync-permissions.ts
 *
 * Safe to run multiple times. Does NOT clear existing permissions or
 * custom-role assignments.
 */

import { prisma } from '../db/client';
import {
  initializeDefaultPermissions,
  seedWorkspaceSystemRoles,
} from '../modules/roles/role.service';

async function main() {
  console.log('Syncing permissions across workspaces...\n');

  const workspaces = await prisma.workspace.findMany({ select: { id: true, name: true } });
  console.log(`Found ${workspaces.length} workspaces.\n`);

  let errors = 0;

  for (const ws of workspaces) {
    try {
      const before = await prisma.permission.count({ where: { workspaceId: ws.id } });
      await initializeDefaultPermissions(ws.id);
      const after = await prisma.permission.count({ where: { workspaceId: ws.id } });

      const { ownerRole, adminRole, memberRole } = await seedWorkspaceSystemRoles(ws.id);

      const memberPerms = await prisma.rolePermission.count({ where: { customRoleId: memberRole.id } });

      console.log(
        `${ws.name} (${ws.id}): permissions ${before} -> ${after}; ` +
        `Member now has ${memberPerms} perms. ` +
        `Roles: Owner(${ownerRole.id}) Admin(${adminRole.id}) Member(${memberRole.id})`
      );
    } catch (err) {
      console.error(`  ERROR for workspace ${ws.id}:`, err);
      errors++;
    }
  }

  console.log(`\nDone. Errors: ${errors}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
