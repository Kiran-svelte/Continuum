import { PrismaClient } from '@prisma/client';
import { getDatabaseRuntimeInfo } from '../lib/database-provider';

const prisma = new PrismaClient();

try {
  const info = getDatabaseRuntimeInfo();
  console.log(`Database provider: ${info.provider}`);
  console.log(`Supabase project ref: ${info.supabaseProjectRef || 'unknown'}`);

  if (info.provider !== 'supabase') {
    throw new Error('DATABASE_URL must point to Supabase before running this production smoke.');
  }

  const result = await prisma.$queryRaw<Array<{ current_time: Date; pg_version: string }>>`
    SELECT NOW() as current_time, version() as pg_version
  `;
  console.log('Database connected successfully.');
  console.log('Time:', result[0]?.current_time);
  console.log('Version:', String(result[0]?.pg_version || '').split(',')[0]);

  const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;
  console.log(`Public tables visible: ${tables.length}`);
} catch (error) {
  console.error('Supabase database connection failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
