import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function testSignIn(email: string, password: string) {
  console.log('Testing sign-in for:', email);
  
  // Same logic as auth-service
  const employee = await prisma.employee.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!employee) {
    console.log('Employee not found');
    return;
  }
  
  console.log('Employee found:', employee.email);
  console.log('Status:', employee.status);
  console.log('Password hash exists:', !!employee.password_hash);
  
  if (!employee.password_hash) {
    console.log('No password hash!');
    return;
  }
  
  console.log('Verifying password...');
  const isValid = await bcrypt.compare(password, employee.password_hash);
  console.log('Password valid:', isValid);
  
  if (['terminated', 'exited', 'suspended'].includes(employee.status)) {
    console.log('Account inactive!');
    return;
  }
  
  console.log('Auth should succeed!');
  
  await prisma.$disconnect();
}

testSignIn('admin@continuum.test', 'Admin@123');
