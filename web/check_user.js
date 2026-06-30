const fs = require('fs');
const dotenv = require('dotenv');
// Load .env.prod if it exists
if (fs.existsSync('.env.prod')) {
  const envConfig = dotenv.parse(fs.readFileSync('.env.prod'));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  const email = 'kiran.11.05.05@gmail.com';
  const user = await prisma.employee.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      first_name: true,
      last_name: true,
      auth_id: true,
      primary_role: true,
      status: true,
      password_hash: true
    }
  });

  if (user) {
    console.log('User found:');
    console.log(JSON.stringify({ ...user, password_hash: user.password_hash ? '[REDACTED]' : null }, null, 2));
  } else {
    console.log('User NOT found with email:', email);
  }
}

checkUser()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
