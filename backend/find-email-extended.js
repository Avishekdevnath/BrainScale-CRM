require('dotenv').config();
const { MongoClient } = require('mongodb');

const EMAIL_TO_FIND = 'jarvistheai369@gmail.com';

async function findEmailExtended() {
  console.log(`🔍 Extended search for: ${EMAIL_TO_FIND}\n`);
  
  let mongoUrl = process.env.MONGODB_URL || process.env.MONGO_URL;
  if (!mongoUrl) {
    console.log('❌ MONGODB_URL or MONGO_URL not found in .env file');
    return;
  }
  
  mongoUrl = mongoUrl.trim().replace(/^["']|["']$/g, '');
  
  let client;
  
  try {
    client = new MongoClient(mongoUrl);
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db();
    
    // Case-insensitive search in User collection
    console.log('📧 Searching User collection (case-insensitive)...');
    const userRegex = new RegExp(EMAIL_TO_FIND.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const users = await db.collection('User').find({ email: userRegex }).toArray();
    if (users.length > 0) {
      console.log(`✅ Found ${users.length} user(s) with similar email:`);
      users.forEach((user, index) => {
        console.log(`\nUser ${index + 1}:`);
        console.log(`  Email: ${user.email}`);
        console.log(`  ID: ${user._id}`);
        console.log(`  Name: ${user.name || 'N/A'}`);
        console.log(`  Email Verified: ${user.emailVerified}`);
        console.log(`  Created: ${user.createdAt}`);
      });
    } else {
      console.log('❌ No users found\n');
    }
    
    // Search for partial matches
    console.log('🔎 Searching for partial matches (contains "jarvistheai" or "369")...');
    const partialUsers = await db.collection('User').find({
      $or: [
        { email: { $regex: 'jarvistheai', $options: 'i' } },
        { email: { $regex: '369', $options: 'i' } }
      ]
    }).toArray();
    
    if (partialUsers.length > 0) {
      console.log(`✅ Found ${partialUsers.length} user(s) with partial match:`);
      partialUsers.forEach((user, index) => {
        console.log(`\nUser ${index + 1}:`);
        console.log(`  Email: ${user.email}`);
        console.log(`  ID: ${user._id}`);
        console.log(`  Name: ${user.name || 'N/A'}`);
      });
    } else {
      console.log('❌ No partial matches found\n');
    }
    
    // Search in all collections that might have email
    console.log('🔍 Searching all collections for email references...\n');
    
    const collections = await db.listCollections().toArray();
    const emailFields = ['email', 'userEmail', 'inviteeEmail', 'contactEmail'];
    
    for (const collection of collections) {
      const colName = collection.name;
      if (colName.startsWith('_')) continue; // Skip system collections
      
      for (const field of emailFields) {
        try {
          const results = await db.collection(colName).find({
            [field]: EMAIL_TO_FIND
          }).limit(5).toArray();
          
          if (results.length > 0) {
            console.log(`✅ Found in ${colName}.${field}:`);
            results.forEach((doc, idx) => {
              console.log(`  Document ${idx + 1}: ${JSON.stringify(doc, null, 2).substring(0, 200)}...`);
            });
            console.log('');
          }
        } catch (err) {
          // Field might not exist, skip
        }
      }
    }
    
    // List all unique emails in User collection (for reference)
    console.log('📋 Listing all emails in User collection (first 20)...');
    const allUsers = await db.collection('User').find({}, { projection: { email: 1, name: 1 } })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();
    
    if (allUsers.length > 0) {
      console.log(`\nFound ${allUsers.length} user(s):`);
      allUsers.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.email} ${user.name ? `(${user.name})` : ''}`);
      });
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 FINAL SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Email searched: ${EMAIL_TO_FIND}`);
    console.log(`Exact match: ${users.length > 0 ? '✅ Found' : '❌ Not found'}`);
    console.log(`Partial matches: ${partialUsers.length > 0 ? `✅ Found ${partialUsers.length}` : '❌ None'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Disconnected from MongoDB');
    }
  }
}

findEmailExtended().catch(console.error);

