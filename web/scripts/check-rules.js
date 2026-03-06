const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== RULES FOR TEST COMPANY ===');
  const testCompanyRules = await prisma.leaveRule.findMany({
    where: { company_id: '1a44e429-7dc2-4a2f-98ab-7010afdd3058' },
    select: {
      id: true,
      rule_id: true,
      rule_type: true,
      name: true,
      config: true,
      is_active: true,
    },
  });
  console.log(JSON.stringify(testCompanyRules, null, 2));
  
  console.log('\n=== ALL LEAVE RULES (FIRST 10) ===');
  const rules = await prisma.leaveRule.findMany({
    take: 10,
    select: {
      id: true,
      company_id: true,
      rule_id: true,
      rule_type: true,
      name: true,
      config: true,
      is_active: true,
    },
  });
  console.log(JSON.stringify(rules, null, 2));
  
  console.log('\n=== DISTINCT RULE TYPES ===');
  const distinctTypes = await prisma.leaveRule.findMany({
    select: { rule_type: true },
    distinct: ['rule_type'],
  });
  console.log(JSON.stringify(distinctTypes, null, 2));
  
  console.log('\n=== BLACKOUT RULES ===');
  const blackoutRules = await prisma.leaveRule.findMany({
    where: { rule_type: 'blackout' },
  });
  console.log(JSON.stringify(blackoutRules, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
