import { prisma } from '../../db/client';

/**
 * Migration: Add state-specific serial numbers to CallListItem
 * - pendingSerialNumber: for PENDING items, ordered by assignedAt
 * - completeSerialNumber: for DONE items, ordered by updatedAt
 */
export async function addSerialNumbersByState() {
  console.log('Starting migration: add serial numbers by state...');

  try {
    // Step 1: Add fields to schema (if using Prisma, fields should already exist in schema.prisma)
    // For MongoDB, we just need to update documents

    // Step 2: Get all call lists
    const callLists = await prisma.callList.findMany({ select: { id: true } });
    const callListIds = callLists.map((list) => list.id);

    let totalProcessed = 0;

    for (const callListId of callListIds) {
      // Process PENDING items - ordered by assignedAt (or createdAt if never assigned)
      const pendingItems = await (prisma.callListItem as any)
        .find({
          callListId,
          state: 'PENDING',
          assignedAt: { $exists: true, $ne: null },
        })
        .sort({ assignedAt: 1 })
        .toArray?.() || [];

      for (let i = 0; i < pendingItems.length; i++) {
        await (prisma.callListItem as any).updateOne(
          { _id: pendingItems[i]._id },
          { $set: { pendingSerialNumber: i + 1 } }
        );
        totalProcessed++;
      }

      // Handle unassigned PENDING items (assign serial but after assigned ones)
      const unassignedPending = await (prisma.callListItem as any)
        .find({
          callListId,
          state: 'PENDING',
          $or: [{ assignedAt: { $exists: false } }, { assignedAt: null }],
        })
        .sort({ createdAt: 1 })
        .toArray?.() || [];

      const startSerial = pendingItems.length + 1;
      for (let i = 0; i < unassignedPending.length; i++) {
        await (prisma.callListItem as any).updateOne(
          { _id: unassignedPending[i]._id },
          { $set: { pendingSerialNumber: startSerial + i } }
        );
        totalProcessed++;
      }

      // Process DONE items - ordered by updatedAt (when marked done)
      const doneItems = await (prisma.callListItem as any)
        .find({
          callListId,
          state: 'DONE',
        })
        .sort({ updatedAt: 1 })
        .toArray?.() || [];

      for (let i = 0; i < doneItems.length; i++) {
        await (prisma.callListItem as any).updateOne(
          { _id: doneItems[i]._id },
          { $set: { completeSerialNumber: i + 1 } }
        );
        totalProcessed++;
      }

      console.log(`Processed callListId: ${callListId} (${pendingItems.length} pending, ${doneItems.length} done)`);
    }

    console.log(`✓ Migration complete. Total items processed: ${totalProcessed}`);
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run migration
addSerialNumbersByState().catch(console.error);
