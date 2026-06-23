/**
 * RBAC Migration Script
 *
 * v2: Migrates to per-workspace permissions (tenant-scoped).
 * - Deletes old global Permission records
 * - Deletes all RolePermission records (will be rebuilt)
 * - For each workspace: seeds workspace-scoped permissions + system roles + assigns members
 *
 * Run: npx ts-node src/scripts/migrate-rbac.ts
 *
 * Safe to run multiple times (idempotent).
 */

import { prisma } from '../db/client';
import { seedWorkspaceSystemRoles } from '../modules/roles/role.service';

async function main() {
  console.log('Starting RBAC migration (v2: per-workspace permissions)...\n');

  // Step 1: Clear all RolePermission records (will be rebuilt per-workspace)
  const rpDeleted = await prisma.rolePermission.deleteMany({});
  console.log(`Cleared ${rpDeleted.count} RolePermission records.`);

  // Step 2: Clear all Permission records (old global ones + any stale ones)
  const permDeleted = await prisma.permission.deleteMany({});
  console.log(`Cleared ${permDeleted.count} Permission records.\n`);

  const workspaces = await prisma.workspace.findMany({ select: { id: true, name: true } });
  console.log(`Found ${workspaces.length} workspaces.\n`);

  let totalMembersUpdated = 0;
  let errors = 0;

  for (const ws of workspaces) {
    try {
      console.log(`Processing workspace: ${ws.name} (${ws.id})`);

      const { ownerRole, adminRole, memberRole } = await seedWorkspaceSystemRoles(ws.id);
      console.log(`  Seeded system roles: Owner(${ownerRole.id}) Admin(${adminRole.id}) Member(${memberRole.id})`);

      // Load all members in this workspace
      const members = await prisma.workspaceMember.findMany({
        where: { workspaceId: ws.id },
        orderBy: { createdAt: 'asc' },
        include: { customRole: { select: { id: true } } },
      });

      let ownerAssigned = false;

      for (const member of members) {
        // Check if already assigned to a system role by level
        const customRole = member.customRole as any;
        if (member.customRoleId && customRole?.level && customRole.level !== 'CUSTOM') {
          if (customRole.level === 'OWNER') ownerAssigned = true;
          console.log(`  Member ${member.id}: already has system role ${customRole.level}, skipping`);
          continue;
        }

        const legacyRole = (member.role || 'MEMBER').toUpperCase();

        let targetRoleId: string;

        if (legacyRole === 'ADMIN' && !ownerAssigned) {
          targetRoleId = ownerRole.id;
          ownerAssigned = true;
          console.log(`  Member ${member.id}: ADMIN → Owner (first admin)`);
        } else if (legacyRole === 'ADMIN') {
          targetRoleId = adminRole.id;
          console.log(`  Member ${member.id}: ADMIN → Admin`);
        } else {
          targetRoleId = memberRole.id;
          console.log(`  Member ${member.id}: MEMBER → Member`);
        }

        await prisma.workspaceMember.update({
          where: { id: member.id },
          data: { customRoleId: targetRoleId } as any,
        });

        totalMembersUpdated++;
      }

      // Mark existing CUSTOM roles with level='CUSTOM' if not set
      const customRoles = await prisma.customRole.findMany({
        where: { workspaceId: ws.id, isSystem: false },
      });

      for (const role of customRoles) {
        if (!(role as any).level || (role as any).level === '') {
          await prisma.customRole.update({
            where: { id: role.id },
            data: { level: 'CUSTOM' } as any,
          });
        }
      }

      console.log(`  Done.\n`);
    } catch (err) {
      console.error(`  ERROR processing workspace ${ws.id}:`, err);
      errors++;
    }
  }

  console.log('Migration complete.');
  console.log(`  Members updated: ${totalMembersUpdated}`);
  console.log(`  Errors: ${errors}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
