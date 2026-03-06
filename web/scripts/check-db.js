const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== COMPANIES ===');
  const companies = await prisma.company.findMany({
    select: {
      id: true,
      name: true,
      join_code: true,
      onboarding_completed: true,
    },
    take: 5,
  });
  console.log(JSON.stringify(companies, null, 2));

  console.log('\n=== EMPLOYEES ===');
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      email: true,
      first_name: true,
      last_name: true,
      primary_role: true,
      status: true,
      org_id: true,
    },
    take: 10,
  });
  console.log(JSON.stringify(employees, null, 2));

  console.log('\n=== LEAVE REQUESTS ===');
  const leaveRequests = await prisma.leaveRequest.findMany({
    select: {
      id: true,
      emp_id: true,
      leave_type: true,
      start_date: true,
      end_date: true,
      total_days: true,
      status: true,
    },
    take: 5,
  });
  console.log(JSON.stringify(leaveRequests, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
