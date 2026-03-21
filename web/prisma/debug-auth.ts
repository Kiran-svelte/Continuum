import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function test() {
  const email = 'admin@continuum.test';
  const password = 'Admin@123';
  
  console.log('1. Finding employee with email.toLowerCase():', email.toLowerCase());
  
  const employee = await prisma.employee.findUnique({
    where: { email: email.toLowerCase() },
  });

  console.log('2. Employee found:', !!employee);
  
  if (!employee) {
    console.log('FAIL: Employee not found');
    await prisma.$disconnect();
    return;
  }
  
  console.log('3. Employee email:', employee.email);
  console.log('4. Employee status:', employee.status);
  console.log('5. Password hash exists:', !!employee.password_hash);
  
  if (!employee.password_hash) {
    console.log('FAIL: No password hash');
    await prisma.$disconnect();
    return;
  }
  
  console.log('6. Password hash (first 30 chars):', employee.password_hash.substring(0, 30));
  
  // Verify using same bcrypt as the app
  const isValid = await bcrypt.compare(password, employee.password_hash);
  console.log('7. Password verification:', isValid);
  
  if (!isValid) {
    console.log('FAIL: Password verification failed');
    
    // Try hashing the password and see what we get
    const newHash = await bcrypt.hash(password, 12);
    console.log('8. New hash would be:', newHash.substring(0, 30));
    
    // Check if there's a whitespace issue
    console.log('9. Password length:', password.length);
    console.log('10. Hash length:', employee.password_hash.length);
  } else {
    console.log('SUCCESS: Auth should work!');
  }
  
  await prisma.$disconnect();
}

test();
