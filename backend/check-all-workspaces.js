require('dotenv').config();
const { MongoClient } = require('mongodb');

const EMAIL_TO_FIND = 'jarvistheai369@gmail.com';

async function checkAllWorkspaces() {
  console.log(`🔍 Checking ALL workspaces for: ${EMAIL_TO_FIND}\n`);
  
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
    
    // Get all workspaces
    const workspaces = await db.collection('Workspace').find({}).toArray();
    console.log(`Found ${workspaces.length} workspace(s)\n`);
    
    // Check each workspace
    for (const workspace of workspaces) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Workspace: ${workspace.name} (ID: ${workspace._id})`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      
      // Check invitations in this workspace
      const invitations = await db.collection('Invitation').find({
        workspaceId: workspace._id,
        email: { $regex: EMAIL_TO_FIND.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
      }).toArray();
      
      console.log(`  Invitations: ${invitations.length}`);
      invitations.forEach((inv, idx) => {
        console.log(`    ${idx + 1}. ${inv.email} - Status: ${inv.status}, Expires: ${inv.expiresAt}`);
      });
      
      // Check members in this workspace
      const allMembers = await db.collection('WorkspaceMember').find({
        workspaceId: workspace._id
      }).toArray();
      
      console.log(`  Total Members: ${allMembers.length}`);
      
      // Get user emails for these members
      const userIds = allMembers.map(m => m.userId);
      if (userIds.length > 0) {
        const users = await db.collection('User').find({
          _id: { $in: userIds }
        }).toArray();
        
        const matchingUsers = users.filter(u => 
          u.email && u.email.toLowerCase() === EMAIL_TO_FIND.toLowerCase()
        );
        
        if (matchingUsers.length > 0) {
          console.log(`  ✅ FOUND MEMBER in this workspace!`);
          matchingUsers.forEach(user => {
            const member = allMembers.find(m => m.userId.toString() === user._id.toString());
            console.log(`    Email: ${user.email}`);
            console.log(`    Role: ${member.role}`);
            console.log(`    Member ID: ${member._id}`);
          });
        } else {
          console.log(`  No matching members found`);
        }
      }
      
      console.log('');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Email: ${EMAIL_TO_FIND}`);
    console.log(`Workspaces checked: ${workspaces.length}`);
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

checkAllWorkspaces().catch(console.error);

