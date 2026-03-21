import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const emp = await prisma.employee.findUnique({
    where: { email: 'admin@continuum.test' }
  });
  
  console.log('Employee found:', !!emp);
  console.log('Has password:', !!emp?.password_hash);
  if (emp?.password_hash) {
    console.log('Password hash (first 30):', emp.password_hash.substring(0, 30));
  }
  
  await prisma.$disconnect();
}

check();
