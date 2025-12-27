require('dotenv').config();
const { MongoClient } = require('mongodb');

const EMAIL_TO_FIND = 'jarvistheai369@gmail.com';

async function checkInvitationIssue() {
  console.log(`🔍 Checking invitation/member issue for: ${EMAIL_TO_FIND}\n`);
  
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
    
    // Check ALL invitations (including expired and cancelled)
    console.log('1️⃣ Checking ALL invitations (all statuses)...');
    const allInvitations = await db.collection('Invitation').find({
      email: { $regex: EMAIL_TO_FIND.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
    }).toArray();
    
    console.log(`   Found ${allInvitations.length} invitation(s) total`);
    allInvitations.forEach((inv, idx) => {
      console.log(`\n   Invitation ${idx + 1}:`);
      console.log(`     Email: ${inv.email}`);
      console.log(`     Status: ${inv.status}`);
      console.log(`     Workspace: ${inv.workspaceId}`);
      console.log(`     Role: ${inv.role}`);
      console.log(`     Created: ${inv.createdAt}`);
      console.log(`     Expires: ${inv.expiresAt}`);
      console.log(`     Is Expired: ${new Date(inv.expiresAt) < new Date()}`);
      console.log(`     Is PENDING: ${inv.status === 'PENDING'}`);
    });
    
    // Check for PENDING invitations specifically (even if expired)
    const pendingInvitations = allInvitations.filter(inv => inv.status === 'PENDING');
    console.log(`\n   ⚠️  PENDING invitations: ${pendingInvitations.length}`);
    pendingInvitations.forEach((inv, idx) => {
      const isExpired = new Date(inv.expiresAt) < new Date();
      console.log(`     ${idx + 1}. ${inv.email} - Workspace: ${inv.workspaceId} ${isExpired ? '(EXPIRED but still PENDING!)' : ''}`);
    });
    
    // Check all users with similar emails
    console.log('\n2️⃣ Checking for users with similar emails...');
    const allUsers = await db.collection('User').find({}).toArray();
    const similarUsers = allUsers.filter(u => {
      if (!u.email) return false;
      const emailLower = u.email.toLowerCase();
      const targetLower = EMAIL_TO_FIND.toLowerCase();
      return emailLower.includes('jarvis') || 
             emailLower.includes('369') ||
             emailLower === targetLower ||
             emailLower.replace(/[^a-z0-9]/g, '') === targetLower.replace(/[^a-z0-9]/g, '');
    });
    
    console.log(`   Found ${similarUsers.length} similar user(s):`);
    similarUsers.forEach((user, idx) => {
      console.log(`     ${idx + 1}. ${user.email} (ID: ${user._id})`);
    });
    
    // Check workspace members for these users
    if (similarUsers.length > 0) {
      console.log('\n3️⃣ Checking workspace memberships for similar users...');
      for (const user of similarUsers) {
        const memberships = await db.collection('WorkspaceMember').find({ userId: user._id }).toArray();
        if (memberships.length > 0) {
          console.log(`\n   User: ${user.email}`);
          memberships.forEach((member, idx) => {
            console.log(`     Membership ${idx + 1}: Workspace ${member.workspaceId}, Role: ${member.role}`);
          });
        }
      }
    }
    
    // Check for any email variations (with/without dots, case differences)
    console.log('\n4️⃣ Checking for email variations...');
    const emailVariations = [
      EMAIL_TO_FIND,
      EMAIL_TO_FIND.toLowerCase(),
      EMAIL_TO_FIND.toUpperCase(),
      EMAIL_TO_FIND.replace(/\./g, ''),
      EMAIL_TO_FIND.replace(/\./g, 'dot'),
    ];
    
    for (const variation of emailVariations) {
      const found = await db.collection('User').findOne({ email: variation });
      if (found) {
        console.log(`   ✅ Found with variation: ${variation}`);
        console.log(`      Actual email in DB: ${found.email}`);
      }
    }
    
    // List all pending invitations in the system
    console.log('\n5️⃣ All PENDING invitations in system (first 20)...');
    const allPending = await db.collection('Invitation').find({ status: 'PENDING' })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();
    
    console.log(`   Found ${allPending.length} PENDING invitation(s):`);
    allPending.forEach((inv, idx) => {
      const isExpired = new Date(inv.expiresAt) < new Date();
      console.log(`     ${idx + 1}. ${inv.email} - Workspace: ${inv.workspaceId} ${isExpired ? '(EXPIRED)' : ''}`);
    });
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 DIAGNOSIS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (pendingInvitations.length > 0) {
      const expiredPending = pendingInvitations.filter(inv => new Date(inv.expiresAt) < new Date());
      if (expiredPending.length > 0) {
        console.log('⚠️  ISSUE FOUND: There are EXPIRED invitations still marked as PENDING!');
        console.log('   This could cause the "already exists" error.');
        console.log('   Solution: Update these invitations to EXPIRED status.');
      } else {
        console.log('✅ Found PENDING invitation(s) - this is why you see "already exists"');
      }
    } else if (similarUsers.length > 0) {
      console.log('⚠️  Found user(s) with similar email - might be a typo or case difference');
    } else {
      console.log('❓ No obvious issue found. The error might be coming from:');
      console.log('   1. A different workspace');
      console.log('   2. Client-side validation');
      console.log('   3. Cached data');
    }
    
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

checkInvitationIssue().catch(console.error);

