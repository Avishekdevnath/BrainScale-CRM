require('dotenv').config();
const { MongoClient } = require('mongodb');

const EMAIL_TO_FIND = 'jarvistheai369@gmail.com';

async function findStudentEmail() {
  console.log(`🔍 Searching Student collection for: ${EMAIL_TO_FIND}\n`);
  
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
    
    // Search Student collection
    console.log('1️⃣ Searching Student collection...');
    const students = await db.collection('Student').find({
      email: { $regex: EMAIL_TO_FIND.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
    }).toArray();
    
    console.log(`   Found ${students.length} student(s)`);
    students.forEach((student, idx) => {
      console.log(`\n   Student ${idx + 1}:`);
      console.log(`     Email: ${student.email}`);
      console.log(`     Name: ${student.name || 'N/A'}`);
      console.log(`     ID: ${student._id}`);
      console.log(`     Workspace: ${student.workspaceId}`);
    });
    
    // Also check all students to see what emails exist
    console.log('\n2️⃣ Listing all students with emails (first 20)...');
    const allStudents = await db.collection('Student').find(
      { email: { $exists: true, $ne: null, $ne: '' } },
      { projection: { email: 1, name: 1, workspaceId: 1 } }
    ).limit(20).toArray();
    
    console.log(`   Found ${allStudents.length} student(s) with emails:`);
    allStudents.forEach((student, idx) => {
      console.log(`     ${idx + 1}. ${student.email} - ${student.name || 'N/A'} (Workspace: ${student.workspaceId})`);
    });
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Email: ${EMAIL_TO_FIND}`);
    console.log(`Students found: ${students.length}`);
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

findStudentEmail().catch(console.error);

