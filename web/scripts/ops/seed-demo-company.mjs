/**
 * Provisions one fully-onboarded demo company with a ready-to-use login for
 * every role, straight through the database.
 *
 * This deliberately bypasses invitations, email verification and guided
 * onboarding: the accounts are created active, email-verified and past every
 * gate, so a tester can sign in as any role immediately.
 *
 *   node scripts/ops/seed-demo-company.mjs [--reset] [--repair-existing]
 *
 * --reset            delete and recreate the demo company from scratch
 * --repair-existing  additionally mark every pre-existing account in the
 *                    database as email-verified (unblocks accounts created
 *                    before provisioning started doing this itself)
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, '../..');

function loadEnvFile(name) {
  const file = path.join(webRoot, name);
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[m[1]] = value.replace(/\\r/g, '').replace(/\\n/g, '').trim();
  }
}

loadEnvFile('.env.prod');

const prisma = new PrismaClient();
const RESET = process.argv.includes('--reset');
const REPAIR_EXISTING = process.argv.includes('--repair-existing');

const COMPANY_NAME = 'Continuum Demo Works';
const EMAIL_DOMAIN = 'demo.continuum.support';
const PASSWORD = 'Continuum@2026';
const JOIN_CODE = 'DEMO2026';

const MODULE_SLUGS = [
  'employees', 'leave', 'compliance', 'pf', 'attendance', 'payroll',
  'performance', 'recruitment', 'learning', 'expenses', 'reimbursements',
  'directory', 'documents', 'exit', 'analytics',
];

const LEAVE_TYPES = [
  { code: 'EL', name: 'Earned Leave', category: 'common', default_quota: 18, paid: true, carry_forward: true, max_carry_forward: 30, encashment_enabled: true, encashment_max_days: 10 },
  { code: 'CL', name: 'Casual Leave', category: 'common', default_quota: 12, paid: true, carry_forward: false, max_carry_forward: 0, encashment_enabled: false, encashment_max_days: 0 },
  { code: 'SL', name: 'Sick Leave', category: 'common', default_quota: 12, paid: true, carry_forward: false, max_carry_forward: 0, encashment_enabled: false, encashment_max_days: 0 },
  { code: 'LOP', name: 'Loss of Pay', category: 'common', default_quota: 0, paid: false, carry_forward: false, max_carry_forward: 0, encashment_enabled: false, encashment_max_days: 0 },
];

/** Reporting chain: employee → team_lead → manager → director → hr → admin. */
const PEOPLE = [
  { key: 'admin',     role: 'admin',     first: 'Aarav',  last: 'Sharma',  designation: 'Founder & CEO',        department: 'Leadership',  managerKey: null },
  { key: 'hr',        role: 'hr',        first: 'Priya',  last: 'Patel',   designation: 'HR Manager',           department: 'Human Resources', managerKey: 'admin' },
  { key: 'director',  role: 'director',  first: 'Rohan',  last: 'Mehta',   designation: 'Director, Engineering', department: 'Engineering', managerKey: 'admin' },
  { key: 'manager',   role: 'manager',   first: 'Kavya',  last: 'Iyer',    designation: 'Engineering Manager',  department: 'Engineering', managerKey: 'director' },
  { key: 'teamlead',  role: 'team_lead', first: 'Arjun',  last: 'Nair',    designation: 'Team Lead',            department: 'Engineering', managerKey: 'manager' },
  { key: 'employee',  role: 'employee',  first: 'Sneha',  last: 'Reddy',   designation: 'Software Engineer',    department: 'Engineering', managerKey: 'teamlead' },
];

const emailFor = (key) => `${key}@${EMAIL_DOMAIN}`;

async function markVerified(tx, employeeId, companyId) {
  const existing = await tx.otpToken.findFirst({
    where: { emp_id: employeeId, action: 'email_verify', is_used: true },
    select: { id: true },
  });
  if (existing) return;
  await tx.otpToken.create({
    data: {
      id: crypto.randomUUID(),
      emp_id: employeeId,
      company_id: companyId,
      action: 'email_verify',
      code_hash: crypto.createHash('sha256').update(`seeded:${employeeId}:${crypto.randomUUID()}`).digest('hex'),
      expires_at: new Date(),
      attempts: 0,
      is_used: true,
    },
  });
}

async function main() {
  const existingCompany = await prisma.company.findFirst({
    where: { join_code: JOIN_CODE },
    select: { id: true },
  });

  if (existingCompany && RESET) {
    console.log('resetting existing demo company', existingCompany.id);
    await prisma.company.delete({ where: { id: existingCompany.id } });
  }

  const companyId = existingCompany && !RESET ? existingCompany.id : crypto.randomUUID();

  const company = await prisma.company.upsert({
    where: { id: companyId },
    update: {
      name: COMPANY_NAME,
      onboarding_completed: true,
      onboarding_step: 99,
    },
    create: {
      id: companyId,
      name: COMPANY_NAME,
      legalName: `${COMPANY_NAME} Private Limited`,
      industry: 'Technology',
      size: '51-200',
      country_code: 'IN',
      timezone: 'Asia/Kolkata',
      join_code: JOIN_CODE,
      onboarding_completed: true,
      onboarding_step: 99,
      work_start: '09:30',
      work_end: '18:30',
      sla_hours: 48,
      updated_at: new Date(),
    },
  });
  console.log('company:', company.id, company.name);

  // Every module enabled — the middleware module gate reads these cookies and
  // will bounce portal navigation for anything not in `enabled_modules`.
  await prisma.companySettings.upsert({
    where: { company_id: company.id },
    update: {
      hr_alerts: {
        super_admin_cap: MODULE_SLUGS,
        enabled_modules: MODULE_SLUGS,
        module_features: {},
      },
    },
    create: {
      id: crypto.randomUUID(),
      company_id: company.id,
      hr_alerts: {
        super_admin_cap: MODULE_SLUGS,
        enabled_modules: MODULE_SLUGS,
        module_features: {},
      },
      updated_at: new Date(),
    },
  });

  for (const lt of LEAVE_TYPES) {
    await prisma.leaveType.upsert({
      where: { company_id_code: { company_id: company.id, code: lt.code } },
      update: { ...lt, is_active: true, deleted_at: null },
      create: { id: crypto.randomUUID(), company_id: company.id, gender_specific: 'all', is_active: true, ...lt },
    });
  }
  console.log('leave types:', LEAVE_TYPES.map((l) => l.code).join(', '));

  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const idByKey = {};

  // Two passes so manager_id can reference people created later in the list.
  for (const person of PEOPLE) {
    const email = emailFor(person.key);
    const base = {
      first_name: person.first,
      last_name: person.last,
      primary_role: person.role,
      org_id: company.id,
      department: person.department,
      designation: person.designation,
      password_hash: passwordHash,
      // Active + tutorial done + profile fields present: this is what the
      // employee-onboarding and welcome gates check before allowing portal use.
      status: 'active',
      tutorial_completed: true,
      must_change_password: false,
      password_changed_at: new Date(),
      phone: `+9198${String(70000000 + Object.keys(idByKey).length).slice(0, 8)}`,
      current_address: '4th Floor, Prestige Tech Park, Bengaluru, KA 560103',
      date_of_joining: new Date('2024-04-01T00:00:00.000Z'),
      gender: person.key === 'hr' || person.key === 'employee' ? 'female' : 'male',
      country_code: 'IN',
      invited_by_type: 'super_admin',
      updated_at: new Date(),
    };

    const employee = await prisma.employee.upsert({
      where: { email },
      update: base,
      create: { id: crypto.randomUUID(), email, ...base },
      select: { id: true },
    });
    idByKey[person.key] = employee.id;
  }

  for (const person of PEOPLE) {
    if (!person.managerKey) continue;
    await prisma.employee.update({
      where: { id: idByKey[person.key] },
      data: { manager_id: idByKey[person.managerKey] },
    });
  }

  const year = new Date().getFullYear();
  for (const person of PEOPLE) {
    for (const lt of LEAVE_TYPES) {
      if (lt.default_quota <= 0) continue;
      await prisma.leaveBalance.upsert({
        where: { emp_id_leave_type_year: { emp_id: idByKey[person.key], leave_type: lt.code, year } },
        update: { annual_entitlement: lt.default_quota, remaining: lt.default_quota, company_id: company.id },
        create: {
          id: crypto.randomUUID(),
          emp_id: idByKey[person.key],
          company_id: company.id,
          leave_type: lt.code,
          year,
          annual_entitlement: lt.default_quota,
          remaining: lt.default_quota,
          updated_at: new Date(),
        },
      });
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const person of PEOPLE) {
      await markVerified(tx, idByKey[person.key], company.id);
    }
  });

  if (REPAIR_EXISTING) {
    const others = await prisma.employee.findMany({
      where: { org_id: { not: null }, id: { notIn: Object.values(idByKey) } },
      select: { id: true, email: true, org_id: true },
    });
    for (const other of others) {
      await prisma.$transaction(async (tx) => markVerified(tx, other.id, other.org_id));
      console.log('repaired verification for', other.email);
    }
  }

  // Platform super admin lives in its own table, not Employee.
  const superAdminEmail = `superadmin@${EMAIL_DOMAIN}`;
  await prisma.superAdmin.upsert({
    where: { email: superAdminEmail },
    update: { password_hash: passwordHash, is_active: true, name: 'Platform Super Admin' },
    create: {
      id: crypto.randomUUID(),
      email: superAdminEmail,
      password_hash: passwordHash,
      name: 'Platform Super Admin',
      is_active: true,
      updated_at: new Date(),
    },
  });

  console.log('\n=== DEMO CREDENTIALS (password is the same for all) ===');
  console.log('super_admin'.padEnd(11), superAdminEmail.padEnd(34), 'Platform Super Admin — platform console');
  console.log('company   :', COMPANY_NAME, '| join code:', JOIN_CODE);
  console.log('password  :', PASSWORD);
  for (const person of PEOPLE) {
    console.log(
      `${person.role.padEnd(10)} ${emailFor(person.key).padEnd(34)} ${person.first} ${person.last} — ${person.designation}`
    );
  }
}

await main();
await prisma.$disconnect();
