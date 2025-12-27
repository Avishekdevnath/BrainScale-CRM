/**
 * Script to enable AI chat for a workspace
 * Usage: npx tsx scripts/enable-ai-chat.ts <workspaceId>
 */

import { prisma } from '../src/db/client';

const workspaceId = process.argv[2];

if (!workspaceId) {
  console.error('Usage: npx tsx scripts/enable-ai-chat.ts <workspaceId>');
  process.exit(1);
}

async function enableAIChat() {
  try {
    // Check if workspace exists
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true, aiFeaturesEnabled: true, aiFeatures: true },
    });

    if (!workspace) {
      console.error(`Workspace with ID ${workspaceId} not found`);
      process.exit(1);
    }

    console.log(`Found workspace: ${workspace.name}`);
    console.log(`Current AI features enabled: ${workspace.aiFeaturesEnabled}`);
    console.log(`Current AI features: ${JSON.stringify(workspace.aiFeatures)}`);

    // Get current features array or create new one
    const currentFeatures = Array.isArray(workspace.aiFeatures)
      ? (workspace.aiFeatures as string[])
      : [];

    // Add 'chat' if not already present
    const updatedFeatures = currentFeatures.includes('chat')
      ? currentFeatures
      : [...currentFeatures, 'chat'];

    // Update workspace
    const updated = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        aiFeaturesEnabled: true,
        aiFeatures: updatedFeatures,
      },
    });

    console.log('\n✅ AI chat enabled successfully!');
    console.log(`Updated AI features: ${JSON.stringify(updated.aiFeatures)}`);
  } catch (error) {
    console.error('Error enabling AI chat:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

enableAIChat();

