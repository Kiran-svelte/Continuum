// ─── Test User Seed Script ─────────────────────────────────────────────────
// Run with: npx ts-node prisma/seed-test-users.ts
//
// This creates test users for all roles with Firebase auth.
// Password for all test users: Test@123

import { PrismaClient, Role, Gender, EmployeeStatus } from '@prisma/client';
import * as admin from 'firebase-admin';

const prisma = new PrismaClient();

// Firebase Admin SDK initialization
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID || 'continuum-239d3',
  privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk-fbsvc@continuum-239d3.iam.gserviceaccount.com',
};

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

const TEST_PASSWORD = 'Test@123';

interface TestUser {
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  department: string;
  designation: string;
}

const TEST_USERS: TestUser[] = [
  {
    email: 'admin@continuum-test.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin' as Role,
    department: 'Administration',
    designation: 'System Administrator',
  },
  {
    email: 'hr@continuum-test.com',
    firstName: 'HR',
    lastName: 'Manager',
    role: 'hr' as Role,
    department: 'Human Resources',
    designation: 'HR Manager',
  },
  {
    email: 'director@continuum-test.com',
    firstName: 'Director',
    lastName: 'Smith',
    role: 'director' as Role,
    department: 'Executive',
    designation: 'Director of Operations',
  },
  {
    email: 'manager@continuum-test.com',
    firstName: 'Manager',
    lastName: 'Johnson',
    role: 'manager' as Role,
    department: 'Engineering',
    designation: 'Engineering Manager',
  },
  {
    email: 'teamlead@continuum-test.com',
    firstName: 'Team',
    lastName: 'Lead',
    role: 'team_lead' as Role,
    department: 'Engineering',
    designation: 'Team Lead',
  },
  {
    email: 'employee@continuum-test.com',
    firstName: 'Employee',
    lastName: 'Test',
    role: 'employee' as Role,
    department: 'Engineering',
    designation: 'Software Engineer',
  },
];

async function createFirebaseUser(email: string, password: string): Promise<string> {
  try {
    // Check if user already exists
    const existingUser = await admin.auth().getUserByEmail(email);
    console.log(`  Firebase user already exists: ${email}`);
    return existingUser.uid;
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      // Create new user
      const newUser = await admin.auth().createUser({
        email,
        password,
        emailVerified: true,
      });
      console.log(`  Created Firebase user: ${email}`);
      return newUser.uid;
    }
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting test user seeding...\n');

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
      },
    });
    console.log('✅ Created test company: Continuum Test Company\n');
  } else {
    console.log('✅ Using existing company: Continuum Test Company\n');
  }

  // Get leave types for the company
  const leaveTypes = await prisma.leaveType.findMany({
    where: { company_id: company.id },
  });

  // If no leave types, create basic ones
  if (leaveTypes.length === 0) {
    await prisma.leaveType.createMany({
      data: [
        { company_id: company.id, code: 'CL', name: 'Casual Leave', category: 'common', default_quota: 12, paid: true },
        { company_id: company.id, code: 'SL', name: 'Sick Leave', category: 'common', default_quota: 12, paid: true },
        { company_id: company.id, code: 'EL', name: 'Earned Leave', category: 'common', default_quota: 15, paid: true },
      ],
    });
    console.log('✅ Created default leave types\n');
  }

  const year = new Date().getFullYear();

  // Create manager first (for setting up reporting relationships)
  let managerId: string | null = null;

  for (const testUser of TEST_USERS) {
    console.log(`\n📝 Processing: ${testUser.email}`);

    // Check if employee already exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { email: testUser.email },
    });

    if (existingEmployee) {
      console.log(`  ⚠️  Employee already exists, skipping...`);
      if (testUser.role === 'manager') {
        managerId = existingEmployee.id;
      }
      continue;
    }

    // Create Firebase user
    const authId = await createFirebaseUser(testUser.email, TEST_PASSWORD);

    // Create employee
    const employee = await prisma.employee.create({
      data: {
        auth_id: authId,
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
        manager_id: ['team_lead', 'employee'].includes(testUser.role) ? managerId : null,
      },
    });

    // Set manager_id for later use
    if (testUser.role === 'manager') {
      managerId = employee.id;
    }

    // Create leave balances
    const leaveTypesForBalance = await prisma.leaveType.findMany({
      where: { company_id: company.id },
    });

    for (const lt of leaveTypesForBalance) {
      await prisma.leaveBalance.upsert({
        where: {
          emp_id_company_id_leave_type_year: {
            emp_id: employee.id,
            company_id: company.id,
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

    console.log(`  ✅ Created employee with role: ${testUser.role}`);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('🎉 TEST USERS CREATED SUCCESSFULLY!');
  console.log('═'.repeat(60));
  console.log('\n📋 TEST CREDENTIALS (Password for all: Test@123)\n');
  console.log('┌─────────────┬───────────────────────────────┐');
  console.log('│ Role        │ Email                         │');
  console.log('├─────────────┼───────────────────────────────┤');
  for (const user of TEST_USERS) {
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
