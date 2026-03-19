// Test script to verify Neon database connection
const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Testing Neon PostgreSQL connection...');
    
    // Test basic query
    const result = await prisma.$queryRaw`SELECT NOW() as current_time, version() as pg_version`;
    console.log('✅ Database connected successfully!');
    console.log('   Time:', result[0].current_time);
    console.log('   Version:', result[0].pg_version.split(',')[0]);
    
    // Test model access - list tables
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    console.log('\n📋 Database tables created:', tables.length);
    tables.slice(0, 10).forEach(t => console.log('   -', t.table_name));
    if (tables.length > 10) console.log('   ... and', tables.length - 10, 'more');
    
    // Check if new models exist
    const newModels = ['SuperAdmin', 'UserInvite', 'RoleTemplate', 'RefreshToken', 'Session', 'TutorialProgress'];
    console.log('\n🆕 New auth models:');
    for (const model of newModels) {
      const exists = tables.some(t => t.table_name === model);
      console.log(`   ${exists ? '✅' : '❌'} ${model}`);
    }
    
    console.log('\n✅ All tests passed!');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
