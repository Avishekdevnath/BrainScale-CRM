/**
 * Full DB migration: source → target
 * Usage: npx tsx scripts/migrate-db.ts
 */

import { MongoClient } from 'mongodb';

const SOURCE_URI = 'mongodb+srv://ironman:d3YUuUGsdKjMx3y8@cluster0.8qopgd9.mongodb.net/smartcrm?retryWrites=true&w=majority';
const TARGET_URI = 'mongodb+srv://maheshailtd_db_user:IaxCxihKKP16OHul@maheshdev.kgztaqd.mongodb.net/brainscale?retryWrites=true&w=majority';

const SOURCE_DB = 'smartcrm';
const TARGET_DB = 'brainscale';

const BATCH_SIZE = 500;

async function main() {
  console.log('Connecting to source...');
  const sourceClient = new MongoClient(SOURCE_URI);
  await sourceClient.connect();
  const sourceDb = sourceClient.db(SOURCE_DB);

  console.log('Connecting to target...');
  const targetClient = new MongoClient(TARGET_URI);
  await targetClient.connect();
  const targetDb = targetClient.db(TARGET_DB);

  const collections = await sourceDb.listCollections().toArray();
  console.log(`\nFound ${collections.length} collections: ${collections.map(c => c.name).join(', ')}\n`);

  let totalDocs = 0;

  for (const col of collections) {
    const name = col.name;
    const sourceCol = sourceDb.collection(name);
    const targetCol = targetDb.collection(name);

    const count = await sourceCol.countDocuments();
    if (count === 0) {
      console.log(`  [${name}] empty — skipping`);
      continue;
    }

    console.log(`  [${name}] ${count} docs...`);

    // Drop target collection first to avoid duplicates on re-run
    await targetCol.drop().catch(() => {}); // ignore if not exists

    let inserted = 0;
    const cursor = sourceCol.find({});

    let batch: any[] = [];
    for await (const doc of cursor) {
      batch.push(doc);
      if (batch.length >= BATCH_SIZE) {
        await targetCol.insertMany(batch, { ordered: false });
        inserted += batch.length;
        process.stdout.write(`\r    ${inserted}/${count}`);
        batch = [];
      }
    }
    if (batch.length > 0) {
      await targetCol.insertMany(batch, { ordered: false });
      inserted += batch.length;
    }

    console.log(`\r    ✓ ${inserted}/${count} inserted`);
    totalDocs += inserted;

    // Copy indexes
    const indexes = await sourceCol.indexes();
    for (const idx of indexes) {
      if (idx.name === '_id_') continue; // auto-created
      const { key, name: idxName, ...opts } = idx;
      await targetCol.createIndex(key, { name: idxName, ...opts }).catch((e) => {
        console.log(`    ! index ${idxName} skipped: ${e.message}`);
      });
    }
  }

  await sourceClient.close();
  await targetClient.close();

  console.log(`\nDone. ${totalDocs} total documents migrated to ${TARGET_DB}.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
