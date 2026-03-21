import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function verify() {
  const emp = await prisma.employee.findUnique({
    where: { email: 'admin@continuum.test' }
  });
  
  if (!emp || !emp.password_hash) {
    console.log('Employee or password not found');
    return;
  }
  
  console.log('Testing password: Admin@123');
  const isValid = await bcrypt.compare('Admin@123', emp.password_hash);
  console.log('Password valid:', isValid);
  
  await prisma.$disconnect();
}

verify();
