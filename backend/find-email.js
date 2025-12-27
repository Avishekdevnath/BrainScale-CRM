require('dotenv').config();
const { MongoClient } = require('mongodb');

const EMAIL_TO_FIND = 'jarvistheai369@gmail.com';

async function findEmail() {
  console.log(`🔍 Searching for email: ${EMAIL_TO_FIND}\n`);
  
  // Get MongoDB connection URL
  let mongoUrl = process.env.MONGODB_URL || process.env.MONGO_URL;
  
  if (!mongoUrl) {
    console.log('❌ MONGODB_URL or MONGO_URL not found in .env file');
    return;
  }
  
  // Clean up connection string
  mongoUrl = mongoUrl.trim().replace(/^["']|["']$/g, '');
  
  let client;
  
  try {
    console.log('⏳ Connecting to MongoDB...');
    client = new MongoClient(mongoUrl);
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db();
    
    // Search in User collection
    console.log('📧 Searching in User collection...');
    const user = await db.collection('User').findOne({ email: EMAIL_TO_FIND });
    if (user) {
      console.log('✅ Found in User collection:');
      console.log(JSON.stringify(user, null, 2));
      console.log('\n');
    } else {
      console.log('❌ Not found in User collection\n');
    }
    
    // Search in WorkspaceMember collection (via userId lookup)
    if (user) {
      console.log('👥 Searching for workspace memberships...');
      const memberships = await db.collection('WorkspaceMember').find({ userId: user._id }).toArray();
      if (memberships.length > 0) {
        console.log(`✅ Found ${memberships.length} workspace membership(s):`);
        memberships.forEach((member, index) => {
          console.log(`\nMembership ${index + 1}:`);
          console.log(JSON.stringify(member, null, 2));
        });
        console.log('\n');
      } else {
        console.log('❌ No workspace memberships found\n');
      }
    }
    
    // Search in Invitation collection
    console.log('📨 Searching in Invitation collection...');
    const invitations = await db.collection('Invitation').find({ email: EMAIL_TO_FIND }).toArray();
    if (invitations.length > 0) {
      console.log(`✅ Found ${invitations.length} invitation(s):`);
      invitations.forEach((invitation, index) => {
        console.log(`\nInvitation ${index + 1}:`);
        console.log(JSON.stringify(invitation, null, 2));
      });
      console.log('\n');
    } else {
      console.log('❌ No invitations found\n');
    }
    
    // Search in Student collection (if email field exists)
    console.log('🎓 Searching in Student collection...');
    const students = await db.collection('Student').find({ email: EMAIL_TO_FIND }).toArray();
    if (students.length > 0) {
      console.log(`✅ Found ${students.length} student record(s):`);
      students.forEach((student, index) => {
        console.log(`\nStudent ${index + 1}:`);
        console.log(JSON.stringify(student, null, 2));
      });
      console.log('\n');
    } else {
      console.log('❌ No student records found\n');
    }
    
    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Email: ${EMAIL_TO_FIND}`);
    console.log(`User Account: ${user ? '✅ Found' : '❌ Not found'}`);
    if (user) {
      console.log(`User ID: ${user._id}`);
      console.log(`Name: ${user.name || 'N/A'}`);
      console.log(`Email Verified: ${user.emailVerified ? 'Yes' : 'No'}`);
      console.log(`Created: ${user.createdAt}`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('authentication')) {
      console.log('\n💡 Possible issues:');
      console.log('   - Incorrect username/password in connection string');
      console.log('   - Database user doesn\'t have required permissions');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.log('\n💡 Possible issues:');
      console.log('   - Incorrect hostname in connection string');
      console.log('   - Network connectivity issues');
    } else if (error.message.includes('timeout')) {
      console.log('\n💡 Possible issues:');
      console.log('   - IP address not whitelisted in MongoDB Atlas');
      console.log('   - MongoDB Atlas cluster is paused');
    }
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Disconnected from MongoDB');
    }
  }
}

findEmail().catch(console.error);

