// ─── Admin User Seed Script ─────────────────────────────────────────────────
// Run with: npx tsx prisma/seed-admin.ts
//
// Creates a test admin user with password hashing for custom JWT auth.
// Password: Admin@123

import * as dotenv from 'dotenv';
// Load .env.local first (matches Next.js behavior)
dotenv.config({ path: '.env.local' });
dotenv.config(); // fallback to .env

import { PrismaClient, Role, Gender, EmployeeStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

console.log('Using DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 60) + '...');

const prisma = new PrismaClient();

const TEST_PASSWORD = 'Admin@123';
const SALT_ROUNDS = 12;

async function main() {
  console.log('🚀 Starting admin user seeding...\n');

  // Hash the password
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, SALT_ROUNDS);
  console.log('✅ Password hashed\n');

  // First, check if we have a company or create one
  let company = await prisma.company.findFirst({
    where: { name: 'Continuum Test Company' },
  });

  if (!company) {
    company = await prisma.company.create({
      data: {
        name: 'Continuum Test Company',
        industry: 'Technology',
        size: '50-200',
        timezone: 'Asia/Kolkata',
        join_code: 'CONTTEST',
        onboarding_completed: true,
      },
    });
    console.log('✅ Created test company: Continuum Test Company\n');
  } else {
    console.log('✅ Using existing company: Continuum Test Company\n');
  }

  // Create leave types if none exist
  const leaveTypes = await prisma.leaveType.findMany({
    where: { company_id: company.id },
  });

  if (leaveTypes.length === 0) {
    await prisma.leaveType.createMany({
      data: [
        { company_id: company.id, code: 'CL', name: 'Casual Leave', category: 'common', default_quota: 12, paid: true },
        { company_id: company.id, code: 'SL', name: 'Sick Leave', category: 'common', default_quota: 12, paid: true },
        { company_id: company.id, code: 'EL', name: 'Earned Leave', category: 'common', default_quota: 15, paid: true, carry_forward: true, max_carry_forward: 30 },
        { company_id: company.id, code: 'LWP', name: 'Leave Without Pay', category: 'unpaid', default_quota: 365, paid: false },
      ],
    });
    console.log('✅ Created default leave types\n');
  }

  // Define test users
  const testUsers = [
    {
      email: 'admin@continuum.test',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin' as Role,
      department: 'Administration',
      designation: 'System Administrator',
    },
    {
      email: 'hr@continuum.test',
      firstName: 'HR',
      lastName: 'Manager',
      role: 'hr' as Role,
      department: 'Human Resources',
      designation: 'HR Manager',
    },
    {
      email: 'employee@continuum.test',
      firstName: 'John',
      lastName: 'Employee',
      role: 'employee' as Role,
      department: 'Engineering',
      designation: 'Software Engineer',
    },
  ];

  const year = new Date().getFullYear();

  for (const testUser of testUsers) {
    // Check if employee already exists
    const existing = await prisma.employee.findUnique({
      where: { email: testUser.email },
    });

    if (existing) {
      // Update password if user exists
      await prisma.employee.update({
        where: { id: existing.id },
        data: { password_hash: passwordHash },
      });
      console.log(`✅ Updated password for: ${testUser.email}`);
      continue;
    }

    // Create employee with password hash
    const employee = await prisma.employee.create({
      data: {
        email: testUser.email,
        first_name: testUser.firstName,
        last_name: testUser.lastName,
        org_id: company.id,
        primary_role: testUser.role,
        department: testUser.department,
        designation: testUser.designation,
        date_of_joining: new Date(),
        gender: 'other' as Gender,
        status: 'active' as EmployeeStatus,
        password_hash: passwordHash,
        tutorial_completed: true,
      },
    });

    // Create leave balances
    const leaveTypesForBalance = await prisma.leaveType.findMany({
      where: { company_id: company.id },
    });

    for (const lt of leaveTypesForBalance) {
      await prisma.leaveBalance.upsert({
        where: {
          emp_id_leave_type_year: {
            emp_id: employee.id,
            leave_type: lt.code,
            year,
          },
        },
        update: {},
        create: {
          emp_id: employee.id,
          company_id: company.id,
          leave_type: lt.code,
          year,
          annual_entitlement: lt.default_quota,
          remaining: lt.default_quota,
        },
      });
    }

    console.log(`✅ Created: ${testUser.email} (${testUser.role})`);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('🎉 TEST USERS CREATED SUCCESSFULLY!');
  console.log('═'.repeat(60));
  console.log('\n📋 TEST CREDENTIALS (Password for all: Admin@123)\n');
  console.log('┌─────────────┬───────────────────────────────┐');
  console.log('│ Role        │ Email                         │');
  console.log('├─────────────┼───────────────────────────────┤');
  for (const user of testUsers) {
    const role = user.role.padEnd(11);
    const email = user.email.padEnd(29);
    console.log(`│ ${role} │ ${email} │`);
  }
  console.log('└─────────────┴───────────────────────────────┘');
  console.log('\n🔐 Company Join Code: CONTTEST');
  console.log('═'.repeat(60) + '\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
