require('dotenv').config();
const { MongoClient } = require('mongodb');

const EMAIL_TO_FIND = 'jarvistheai369@gmail.com';
const MONGO_URL = 'mongodb+srv://avishekdevnath:ttUd6V0uDeHzaJkf@cluster0.nj725k9.mongodb.net/smartcrm?retryWrites=true&w=majority';

async function findEmailDirect() {
  console.log(`🔍 Searching database for: ${EMAIL_TO_FIND}\n`);
  console.log(`📋 Using connection: mongodb+srv://****:****@cluster0.nj725k9.mongodb.net/smartcrm\n`);
  
  let client;
  
  try {
    client = new MongoClient(MONGO_URL);
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db('smartcrm');
    
    // 1. Search User collection (exact and case-insensitive)
    console.log('1️⃣ Searching User collection...');
    const exactUser = await db.collection('User').findOne({ email: EMAIL_TO_FIND });
    const caseInsensitiveUsers = await db.collection('User').find({
      email: { $regex: EMAIL_TO_FIND.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
    }).toArray();
    
    if (exactUser) {
      console.log('   ✅ Found EXACT match:');
      console.log(`      Email: ${exactUser.email}`);
      console.log(`      ID: ${exactUser._id}`);
      console.log(`      Name: ${exactUser.name || 'N/A'}`);
      console.log(`      Email Verified: ${exactUser.emailVerified}`);
      console.log(`      Created: ${exactUser.createdAt}`);
    } else if (caseInsensitiveUsers.length > 0) {
      console.log(`   ⚠️  Found ${caseInsensitiveUsers.length} case-insensitive match(es):`);
      caseInsensitiveUsers.forEach((user, idx) => {
        console.log(`      ${idx + 1}. ${user.email} (ID: ${user._id})`);
      });
    } else {
      console.log('   ❌ Not found in User collection');
    }
    
    // 2. Search WorkspaceMember collection
    console.log('\n2️⃣ Searching WorkspaceMember collection...');
    let userIdsToCheck = [];
    if (exactUser) {
      userIdsToCheck = [exactUser._id];
    } else if (caseInsensitiveUsers.length > 0) {
      userIdsToCheck = caseInsensitiveUsers.map(u => u._id);
    } else {
      // Get all users and check
      const allUsers = await db.collection('User').find({}).toArray();
      userIdsToCheck = allUsers.map(u => u._id);
    }
    
    if (userIdsToCheck.length > 0) {
      const memberships = await db.collection('WorkspaceMember').find({
        userId: { $in: userIdsToCheck }
      }).toArray();
      
      if (memberships.length > 0) {
        console.log(`   ✅ Found ${memberships.length} workspace membership(s):`);
        for (const member of memberships) {
          const user = exactUser || caseInsensitiveUsers.find(u => u._id.toString() === member.userId.toString());
          const workspace = await db.collection('Workspace').findOne({ _id: member.workspaceId });
          console.log(`      - User: ${user?.email || member.userId}`);
          console.log(`        Workspace: ${workspace?.name || member.workspaceId}`);
          console.log(`        Role: ${member.role}`);
          console.log(`        Member ID: ${member._id}`);
        }
      } else {
        console.log('   ❌ No workspace memberships found');
      }
    }
    
    // 3. Search Invitation collection (all statuses)
    console.log('\n3️⃣ Searching Invitation collection (all statuses)...');
    const allInvitations = await db.collection('Invitation').find({
      email: { $regex: EMAIL_TO_FIND.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
    }).toArray();
    
    if (allInvitations.length > 0) {
      console.log(`   ✅ Found ${allInvitations.length} invitation(s):`);
      for (let idx = 0; idx < allInvitations.length; idx++) {
        const inv = allInvitations[idx];
        const workspace = await db.collection('Workspace').findOne({ _id: inv.workspaceId });
        const isExpired = new Date(inv.expiresAt) < new Date();
        console.log(`\n      Invitation ${idx + 1}:`);
        console.log(`        Email: ${inv.email}`);
        console.log(`        Status: ${inv.status}`);
        console.log(`        Workspace: ${workspace?.name || inv.workspaceId}`);
        console.log(`        Role: ${inv.role}`);
        console.log(`        Created: ${inv.createdAt}`);
        console.log(`        Expires: ${inv.expiresAt}`);
        console.log(`        Is Expired: ${isExpired}`);
        console.log(`        Is PENDING: ${inv.status === 'PENDING'}`);
      }
    } else {
      console.log('   ❌ No invitations found');
    }
    
    // 4. Search Student collection
    console.log('\n4️⃣ Searching Student collection...');
    const students = await db.collection('Student').find({
      email: { $regex: EMAIL_TO_FIND.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
    }).toArray();
    
    if (students.length > 0) {
      console.log(`   ✅ Found ${students.length} student(s):`);
      for (let idx = 0; idx < students.length; idx++) {
        const student = students[idx];
        console.log(`      ${idx + 1}. ${student.email} - ${student.name || 'N/A'} (ID: ${student._id})`);
      }
    } else {
      console.log('   ❌ No students found');
    }
    
    // 5. Check all workspaces for this email
    console.log('\n5️⃣ Checking all workspaces...');
    const workspaces = await db.collection('Workspace').find({}).toArray();
    console.log(`   Found ${workspaces.length} workspace(s)`);
    
    for (const workspace of workspaces) {
      // Check invitations
      const wsInvitations = await db.collection('Invitation').find({
        workspaceId: workspace._id,
        email: { $regex: EMAIL_TO_FIND.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
      }).toArray();
      
      // Check members
      const wsMembers = await db.collection('WorkspaceMember').find({
        workspaceId: workspace._id
      }).toArray();
      
      const wsUserIds = wsMembers.map(m => m.userId);
      const wsUsers = await db.collection('User').find({
        _id: { $in: wsUserIds },
        email: { $regex: EMAIL_TO_FIND.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
      }).toArray();
      
        if (wsInvitations.length > 0 || wsUsers.length > 0) {
        console.log(`\n   📁 Workspace: ${workspace.name} (${workspace._id})`);
        if (wsInvitations.length > 0) {
          console.log(`      Invitations: ${wsInvitations.length}`);
          for (const inv of wsInvitations) {
            console.log(`        - ${inv.email} (Status: ${inv.status})`);
          }
        }
        if (wsUsers.length > 0) {
          console.log(`      Members: ${wsUsers.length}`);
          for (const user of wsUsers) {
            const member = wsMembers.find(m => m.userId.toString() === user._id.toString());
            console.log(`        - ${user.email} (Role: ${member?.role || 'N/A'})`);
          }
        }
      }
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 FINAL SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Email: ${EMAIL_TO_FIND}`);
    console.log(`User found: ${exactUser ? '✅ YES' : caseInsensitiveUsers.length > 0 ? '⚠️  Similar' : '❌ NO'}`);
    console.log(`Invitations found: ${allInvitations.length}`);
    console.log(`Students found: ${students.length}`);
    
    if (exactUser || caseInsensitiveUsers.length > 0) {
      console.log('\n💡 This email EXISTS in the database!');
      console.log('   The "already exists" error is likely because:');
      console.log('   1. User account exists but not added to workspace yet');
      console.log('   2. There is a pending invitation');
      console.log('   3. User is already a member of the workspace');
    } else {
      console.log('\n❓ Email NOT found in database');
      console.log('   The error might be coming from:');
      console.log('   1. Client-side validation/caching');
      console.log('   2. A different database/environment');
      console.log('   3. A typo in the email address');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('authentication')) {
      console.error('\n💡 Authentication failed. Check username/password in connection string.');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('\n💡 Cannot resolve hostname. Check network connection.');
    } else {
      console.error('\n💡 Full error:', error);
    }
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Disconnected from MongoDB');
    }
  }
}

findEmailDirect().catch(console.error);

