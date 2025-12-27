require('dotenv').config();
const { MongoClient } = require('mongodb');

const EMAIL_TO_FIND = 'jarvistheai369@gmail.com';

async function findEmailDeep() {
  console.log(`🔍 Deep search for: ${EMAIL_TO_FIND}\n`);
  
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
    
    // 1. Search User collection with case-insensitive regex
    console.log('1️⃣ Searching User collection (case-insensitive)...');
    const userRegex = new RegExp(EMAIL_TO_FIND.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const users = await db.collection('User').find({ email: userRegex }).toArray();
    console.log(`   Found ${users.length} user(s)`);
    users.forEach((user, idx) => {
      console.log(`   User ${idx + 1}: ${user.email} (ID: ${user._id})`);
    });
    
    // 2. Search WorkspaceMember collection - check if email exists via userId lookup
    console.log('\n2️⃣ Searching WorkspaceMember collection...');
    if (users.length > 0) {
      for (const user of users) {
        const memberships = await db.collection('WorkspaceMember').find({ userId: user._id }).toArray();
        console.log(`   User ${user.email} has ${memberships.length} workspace membership(s)`);
        memberships.forEach((member, idx) => {
          console.log(`   Membership ${idx + 1}: Workspace ${member.workspaceId}, Role: ${member.role}`);
        });
      }
    } else {
      // Search all workspace members and try to match
      const allMembers = await db.collection('WorkspaceMember').find({}).limit(100).toArray();
      console.log(`   Checking ${allMembers.length} workspace members...`);
      
      // Get all unique userIds
      const userIds = [...new Set(allMembers.map(m => m.userId))];
      const allUsers = await db.collection('User').find({ _id: { $in: userIds } }).toArray();
      
      const matchingUsers = allUsers.filter(u => 
        u.email && u.email.toLowerCase() === EMAIL_TO_FIND.toLowerCase()
      );
      
      if (matchingUsers.length > 0) {
        console.log(`   ✅ Found ${matchingUsers.length} matching user(s) in memberships:`);
        matchingUsers.forEach(user => {
          const userMemberships = allMembers.filter(m => m.userId.toString() === user._id.toString());
          console.log(`   User: ${user.email} (ID: ${user._id})`);
          userMemberships.forEach(member => {
            console.log(`     - Workspace: ${member.workspaceId}, Role: ${member.role}`);
          });
        });
      }
    }
    
    // 3. Search Invitation collection
    console.log('\n3️⃣ Searching Invitation collection...');
    const invitations = await db.collection('Invitation').find({ 
      email: { $regex: EMAIL_TO_FIND.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
    }).toArray();
    console.log(`   Found ${invitations.length} invitation(s)`);
    invitations.forEach((inv, idx) => {
      console.log(`   Invitation ${idx + 1}:`);
      console.log(`     Email: ${inv.email}`);
      console.log(`     Status: ${inv.status}`);
      console.log(`     Workspace: ${inv.workspaceId}`);
      console.log(`     Role: ${inv.role}`);
      console.log(`     Expires: ${inv.expiresAt}`);
    });
    
    // 4. Search all collections for any email field
    console.log('\n4️⃣ Searching all collections for email field...');
    const collections = await db.listCollections().toArray();
    
    for (const collection of collections) {
      const colName = collection.name;
      if (colName.startsWith('_') || colName === 'User' || colName === 'Invitation') continue;
      
      try {
        // Try exact match
        const exact = await db.collection(colName).findOne({ email: EMAIL_TO_FIND });
        if (exact) {
          console.log(`   ✅ Found in ${colName} (exact match)`);
          console.log(`      ${JSON.stringify(exact, null, 2).substring(0, 300)}`);
        }
        
        // Try case-insensitive
        const caseInsensitive = await db.collection(colName).findOne({ 
          email: { $regex: EMAIL_TO_FIND.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
        });
        if (caseInsensitive && !exact) {
          console.log(`   ✅ Found in ${colName} (case-insensitive match)`);
          console.log(`      Email in DB: ${caseInsensitive.email}`);
        }
      } catch (err) {
        // Collection might not have email field, skip
      }
    }
    
    // 5. List all unique emails to see if there's a typo
    console.log('\n5️⃣ Checking for similar emails (typo detection)...');
    const allEmails = await db.collection('User').find({}, { projection: { email: 1 } }).toArray();
    const emailList = allEmails.map(u => u.email).filter(Boolean);
    
    // Find emails that are similar
    const targetLower = EMAIL_TO_FIND.toLowerCase();
    const similar = emailList.filter(email => {
      const emailLower = email.toLowerCase();
      // Check if they share significant parts
      return emailLower.includes('jarvistheai') || 
             emailLower.includes('369') ||
             emailLower.includes('jarvis') ||
             (emailLower.length > 10 && targetLower.length > 10 && 
              emailLower.substring(0, 10) === targetLower.substring(0, 10));
    });
    
    if (similar.length > 0) {
      console.log(`   Found ${similar.length} similar email(s):`);
      similar.forEach(email => console.log(`     - ${email}`));
    } else {
      console.log('   No similar emails found');
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Email: ${EMAIL_TO_FIND}`);
    console.log(`Users found: ${users.length}`);
    console.log(`Invitations found: ${invitations.length}`);
    console.log(`Similar emails: ${similar.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Disconnected from MongoDB');
    }
  }
}

findEmailDeep().catch(console.error);

