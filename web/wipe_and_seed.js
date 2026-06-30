const fs = require('fs');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

// 1. Load production environment variables
if (fs.existsSync('.env.prod')) {
  const envConfig = dotenv.parse(fs.readFileSync('.env.prod'));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
} else {
  console.error("❌ ERROR: .env.prod not found!");
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Database Wipe & Seed Process...\n');

  try {
    // 2. Fetch all table names in the public schema (excluding Prisma migrations)
    console.log('⏳ Fetching tables to truncate...');
    const result = await prisma.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename != '_prisma_migrations';`;
    
    if (!result || result.length === 0) {
      console.log('⚠️ No tables found to truncate.');
    } else {
      const tables = result.map(r => `"${r.tablename}"`).join(', ');
      
      // 3. TRUNCATE all data. 
      // TRUNCATE empties the tables but keeps the structure intact.
      // CASCADE ensures that related tables are also emptied safely.
      console.log(`🧹 Truncating tables: ${tables}...`);
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
      console.log('✅ All data has been completely wiped. Tables remain intact.\n');
    }

    // 4. Seed the new Super Admin
    console.log('🌱 Seeding new Super Admin...');
    const email = 'kiran.11.05.05@gmail.com';
    const rawPassword = 'Kiran@2112';
    
    // Hash the password with bcrypt (Cost factor 12 based on codebase)
    const BCRYPT_ROUNDS = 12;
    const passwordHash = await bcrypt.hash(rawPassword, BCRYPT_ROUNDS);

    const superAdmin = await prisma.superAdmin.create({
      data: {
        email: email,
        password_hash: passwordHash,
        name: 'Kiran Super Admin',
      },
    });

    console.log('✅ Super Admin created successfully!');
    console.log('   ┌──────────────────────────────────────────┐');
    console.log('   │         NEW SUPER ADMIN CREDENTIALS      │');
    console.log('   ├──────────────────────────────────────────┤');
    console.log(`   │  Email:    ${superAdmin.email}`);
    console.log(`   │  Password: ${rawPassword}`);
    console.log(`   │  ID:       ${superAdmin.id}`);
    console.log('   └──────────────────────────────────────────┘');

  } catch (error) {
    console.error('❌ Error during wipe and seed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
