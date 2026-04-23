import 'dotenv/config';
import { MongoClient } from 'mongodb';

const url = process.env.MONGO_URL;

if (!url) {
  console.error('MONGO_URL is not set. Set MONGO_URL in your environment before running this script.');
  process.exit(1);
}

const client = new MongoClient(url);

async function ensureIndex(
  collection: ReturnType<ReturnType<MongoClient['db']>['collection']>,
  key: Record<string, 1 | -1>,
  name: string,
  unique = false
) {
  try {
    await collection.createIndex(key, { name, unique, background: true });
    console.log(`✅ ensured index: ${collection.collectionName}.${name}`);
  } catch (err: any) {
    const msg = err?.message || String(err);
    const codeName = err?.codeName || '';
    const code = err?.code;

    // IndexOptionsConflict / equivalent existing index with different name
    if (
      code === 85 ||
      codeName === 'IndexOptionsConflict' ||
      msg.includes('already exists with a different name')
    ) {
      console.log(`ℹ️ equivalent index already exists for ${collection.collectionName}.${name}; skipping`);
      return;
    }

    throw err;
  }
}

async function main() {
  try {
    await client.connect();
    const db = client.db(); // Use DB from connection string

    // Forms collection
    const formColl = db.collection('Form');
    await ensureIndex(formColl, { workspaceId: 1, status: 1 }, 'workspace_status_idx');
    await ensureIndex(formColl, { workspaceId: 1, ownerUserId: 1 }, 'workspace_owner_idx');
    await ensureIndex(formColl, { workspaceId: 1, slug: 1 }, 'workspace_slug_unique', true);

    // Form responses collection
    const respColl = db.collection('FormResponse');
    await ensureIndex(respColl, { workspaceId: 1, formId: 1, submittedAt: -1 }, 'workspace_form_submittedAt_idx');
    await ensureIndex(respColl, { workspaceId: 1, submittedAt: -1 }, 'workspace_submittedAt_idx');

    console.log('✅ Form indexes created/ensured successfully');
  } catch (err: any) {
    console.error('Failed to create indexes:', err?.message || err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
