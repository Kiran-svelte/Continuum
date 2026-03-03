/**
 * Seed Test Users Script
 * 
 * Creates test users for all roles in Firebase and the database.
 * Run with: npx ts-node --esm scripts/seed-test-users.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

// Initialize Firebase Admin
if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const auth = getAuth();

// Test user configurations
const TEST_USERS = [
  {
    email: 'admin@continuum-test.com',
    password: 'Admin@123',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin' as const,
    department: 'Administration',
    designation: 'System Administrator',
  },
  {
    email: 'hr@continuum-test.com',
    password: 'Hr@12345',
    firstName: 'HR',
    lastName: 'Manager',
    role: 'hr' as const,
    department: 'Human Resources',
    designation: 'HR Manager',
  },
  {
    email: 'director@continuum-test.com',
    password: 'Director@123',
    firstName: 'Director',
    lastName: 'Jane',
    role: 'director' as const,
    department: 'Executive',
    designation: 'Director of Operations',
  },
  {
    email: 'manager@continuum-test.com',
    password: 'Manager@123',
    firstName: 'Manager',
    lastName: 'Mike',
    role: 'manager' as const,
    department: 'Engineering',
    designation: 'Engineering Manager',
  },
  {
    email: 'teamlead@continuum-test.com',
    password: 'TeamLead@123',
    firstName: 'TeamLead',
    lastName: 'Tom',
    role: 'team_lead' as const,
    department: 'Engineering',
    designation: 'Team Lead',
  },
  {
    email: 'employee@continuum-test.com',
    password: 'Employee@123',
    firstName: 'Employee',
    lastName: 'Eve',
    role: 'employee' as const,
    department: 'Engineering',
    designation: 'Software Developer',
  },
];

async function createOrGetFirebaseUser(email: string, password: string): Promise<string> {
  try {
    // Try to get existing user
    const existingUser = await auth.getUserByEmail(email);
    console.log(`  Firebase user exists: ${email}`);
    return existingUser.uid;
  } catch (err: any) {
    if (err.code === 'auth/user-not-found') {
      // Create new user
      const newUser = await auth.createUser({
        email,
        password,
        emailVerified: true,
      });
      console.log(`  Created Firebase user: ${email}`);
      return newUser.uid;
    }
    throw err;
  }
}

async function seedTestUsers() {
  console.log('\n🚀 Starting test user seeding...\n');

  // First, get or create the test company
  let company = await prisma.company.findFirst({
    where: { name: 'Continuum Test Company' },
  });

  if (!company) {
    company = await prisma.company.create({
      data: {
        name: 'Continuum Test Company',
        industry: 'Technology',
        size: '1-50',
        timezone: 'Asia/Kolkata',
        join_code: 'TESTCO01',
      },
    });
    console.log('✅ Created test company: Continuum Test Company');
    console.log(`   Join Code: ${company.join_code}\n`);
  } else {
    console.log('✅ Test company already exists\n');
  }

  // Track manager ID to set as manager for team_lead and employee
  let managerId: string | null = null;
  let teamLeadId: string | null = null;

  const createdUsers: Array<{ role: string; email: string; password: string }> = [];

  for (const userData of TEST_USERS) {
    console.log(`\n📝 Processing: ${userData.role.toUpperCase()}`);

    // Create/get Firebase user
    const authId = await createOrGetFirebaseUser(userData.email, userData.password);

    // Check if employee exists
    let employee = await prisma.employee.findUnique({
      where: { auth_id: authId },
    });

    if (!employee) {
      // Determine manager_id based on role hierarchy
      let assignedManagerId: string | null = null;
      if (userData.role === 'team_lead' && managerId) {
        assignedManagerId = managerId;
      } else if (userData.role === 'employee' && teamLeadId) {
        assignedManagerId = teamLeadId;
      }

      employee = await prisma.employee.create({
        data: {
          auth_id: authId,
          email: userData.email,
          first_name: userData.firstName,
          last_name: userData.lastName,
          org_id: company.id,
          primary_role: userData.role,
          department: userData.department,
          designation: userData.designation,
          date_of_joining: new Date(),
          gender: 'other',
          status: 'active',
          manager_id: assignedManagerId,
        },
      });
      console.log(`  ✅ Created employee: ${userData.firstName} ${userData.lastName}`);

      // Seed leave balances for this employee
      const leaveTypes = await prisma.leaveType.findMany({
        where: { company_id: company.id },
      });

      if (leaveTypes.length > 0) {
        const year = new Date().getFullYear();
        await prisma.leaveBalance.createMany({
          data: leaveTypes.map((lt) => ({
            emp_id: employee!.id,
            company_id: company!.id,
            leave_type: lt.code,
            year,
            annual_entitlement: lt.default_quota,
            remaining: lt.default_quota,
          })),
          skipDuplicates: true,
        });
        console.log(`  ✅ Created leave balances`);
      }
    } else {
      console.log(`  Employee already exists: ${employee.email}`);
    }

    // Store manager and team lead IDs for hierarchy
    if (userData.role === 'manager') {
      managerId = employee.id;
    } else if (userData.role === 'team_lead') {
      teamLeadId = employee.id;
    }

    createdUsers.push({
      role: userData.role,
      email: userData.email,
      password: userData.password,
    });
  }

  // Seed leave types if not present
  const existingLeaveTypes = await prisma.leaveType.count({
    where: { company_id: company.id },
  });

  if (existingLeaveTypes === 0) {
    const leaveTypes = [
      { code: 'EL', name: 'Earned Leave', category: 'common' as const, default_quota: 12, paid: true },
      { code: 'SL', name: 'Sick Leave', category: 'common' as const, default_quota: 7, paid: true },
      { code: 'CL', name: 'Casual Leave', category: 'common' as const, default_quota: 7, paid: true },
      { code: 'LOP', name: 'Loss of Pay', category: 'unpaid' as const, default_quota: 0, paid: false },
    ];

    await prisma.leaveType.createMany({
      data: leaveTypes.map((lt) => ({
        company_id: company!.id,
        code: lt.code,
        name: lt.name,
        category: lt.category,
        default_quota: lt.default_quota,
        paid: lt.paid,
        carry_forward: false,
        encashment_enabled: false,
      })),
    });
    console.log('\n✅ Created default leave types');
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 TEST CREDENTIALS SUMMARY');
  console.log('='.repeat(60));
  console.log(`\nCompany Join Code: ${company.join_code}\n`);
  console.log('| Role       | Email                          | Password      |');
  console.log('|------------|--------------------------------|---------------|');
  for (const user of createdUsers) {
    console.log(
      `| ${user.role.padEnd(10)} | ${user.email.padEnd(30)} | ${user.password.padEnd(13)} |`
    );
  }
  console.log('='.repeat(60));
  console.log('\n✅ Seeding complete!\n');
}

seedTestUsers()
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
