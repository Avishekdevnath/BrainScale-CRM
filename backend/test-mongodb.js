require('dotenv').config();
const { MongoClient } = require('mongodb');

async function testMongoConnection() {
  console.log('🔍 Testing MongoDB Connection...\n');
  
  // Check for both MONGO_URL and MONGODB_URL
  let mongoUrl = process.env.MONGODB_URL || process.env.MONGO_URL;
  
  if (!mongoUrl) {
    console.log('❌ MONGODB_URL or MONGO_URL not found in .env file');
    console.log('\nPlease add to your .env:');
    console.log('MONGODB_URL="mongodb+srv://avishekth:dd@cluster0.nj725k9.mongodb.net/smartcrm?retryWrites=true&w=majority"');
    return;
  }
  
  // Clean up connection string (remove extra quotes, trim whitespace)
  mongoUrl = mongoUrl.trim().replace(/^["']|["']$/g, '');
  
  // Mask password in URL for display
  const maskedUrl = mongoUrl.replace(/:\/\/[^:]+:[^@]+@/, '://****:****@');
  console.log('📋 Connection String (masked):', maskedUrl);
  console.log('');
  
  let client;
  
  try {
    console.log('⏳ Connecting to MongoDB...');
    client = new MongoClient(mongoUrl);
    
    await client.connect();
    console.log('✅ Connected successfully!\n');
    
    // Get database info
    const admin = client.db().admin();
    const serverStatus = await admin.serverStatus();
    console.log('📊 Server Info:');
    console.log('   Version:', serverStatus.version);
    console.log('   Uptime:', Math.floor(serverStatus.uptime / 60), 'minutes');
    
    // List databases
    const dbList = await admin.listDatabases();
    console.log('\n📁 Available Databases:');
    dbList.databases.forEach(db => {
      console.log(`   - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });
    
    // Test database operations
    const db = client.db();
    const collections = await db.listCollections().toArray();
    console.log('\n📋 Collections in current database:');
    if (collections.length === 0) {
      console.log('   (No collections yet - database is empty)');
    } else {
      collections.forEach(col => {
        console.log(`   - ${col.name}`);
      });
    }
    
    // Test write operation
    console.log('\n⏳ Testing write operation...');
    const testCollection = db.collection('_test_connection');
    const result = await testCollection.insertOne({
      test: true,
      timestamp: new Date(),
      message: 'Connection test successful'
    });
    console.log('✅ Write test successful!');
    console.log('   Inserted ID:', result.insertedId);
    
    // Clean up test document
    await testCollection.deleteOne({ _id: result.insertedId });
    console.log('✅ Cleanup successful!\n');
    
    console.log('🎉 MongoDB connection is working perfectly!');
    console.log('   You can now proceed with Prisma setup.');
    
  } catch (err) {
    console.log('\n❌ Connection failed!');
    console.log('Error:', err.message);
    
    if (err.message.includes('authentication')) {
      console.log('\n💡 Possible causes:');
      console.log('   - Wrong username or password');
      console.log('   - User doesn\'t have access to the database');
    } else if (err.message.includes('ENOTFOUND') || err.message.includes('getaddrinfo')) {
      console.log('\n💡 Possible causes:');
      console.log('   - Wrong cluster URL');
      console.log('   - Network connectivity issue');
      console.log('   - IP address not whitelisted in MongoDB Atlas');
    } else if (err.message.includes('timeout')) {
      console.log('\n💡 Possible causes:');
      console.log('   - IP address not whitelisted');
      console.log('   - Network firewall blocking connection');
      console.log('   - MongoDB Atlas cluster is paused');
    }
    
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('\n✅ Connection closed.');
    }
  }
}

testMongoConnection().catch(console.error);

