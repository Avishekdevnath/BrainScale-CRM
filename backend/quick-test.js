require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.SESSION_POOLER } }
});

prisma.$connect()
  .then(() => {
    console.log('✅ Connection successful!');
    return prisma.$disconnect();
  })
  .catch(err => {
    console.log('❌ Failed:', err.message.substring(0, 200));
    process.exit(1);
  });

