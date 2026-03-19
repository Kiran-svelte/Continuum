/**
 * Seed Super Admin Script
 * 
 * Creates the initial super admin user for the platform.
 * Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/seed-super-admin.ts
 * Or: npm run seed:super-admin (after adding to package.json)
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;

// Default super admin credentials (change in production!)
const DEFAULT_SUPER_ADMIN = {
  email: 'superadmin@continuum.app',
  password: 'SuperAdmin@123!', // Should be changed on first login
  name: 'Super Admin',
};

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function main() {
  console.log('🚀 Seeding Super Admin...\n');

  // Check if super admin already exists
  const existingAdmin = await prisma.superAdmin.findUnique({
    where: { email: DEFAULT_SUPER_ADMIN.email },
  });

  if (existingAdmin) {
    console.log('✅ Super Admin already exists:');
    console.log(`   Email: ${existingAdmin.email}`);
    console.log(`   ID: ${existingAdmin.id}`);
    console.log('\n⚠️  No changes made.');
    return;
  }

  // Hash the password
  const passwordHash = await hashPassword(DEFAULT_SUPER_ADMIN.password);

  // Create super admin
  const superAdmin = await prisma.superAdmin.create({
    data: {
      email: DEFAULT_SUPER_ADMIN.email,
      password_hash: passwordHash,
      name: DEFAULT_SUPER_ADMIN.name,
    },
  });

  console.log('✅ Super Admin created successfully!\n');
  console.log('   ┌──────────────────────────────────────────┐');
  console.log('   │         SUPER ADMIN CREDENTIALS          │');
  console.log('   ├──────────────────────────────────────────┤');
  console.log(`   │  Email:    ${superAdmin.email}`);
  console.log(`   │  Password: ${DEFAULT_SUPER_ADMIN.password}`);
  console.log(`   │  ID:       ${superAdmin.id}`);
  console.log('   └──────────────────────────────────────────┘');
  console.log('\n⚠️  IMPORTANT: Change this password immediately after first login!');
  console.log('\nLogin at: /admin/login');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error seeding super admin:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
