import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import {
  detectDatabaseProvider,
  getSupabaseProjectRefFromUrl,
  resolveDatabaseUrl,
  resolveDirectDatabaseUrl,
} from '../lib/database-provider';

type TableName = string;

interface ColumnInfo {
  column_name: string;
  data_type: string;
  udt_name: string;
}

interface ForeignKeyEdge {
  child_table: string;
  parent_table: string;
}

const args = new Set(process.argv.slice(2));
const execute = args.has('--execute') || process.env.MIGRATE_SUPABASE_EXECUTE === '1';
const skipSchema = args.has('--skip-schema') || process.env.MIGRATE_SUPABASE_SKIP_SCHEMA === '1';
const truncateTarget = args.has('--truncate-target') || process.env.MIGRATE_SUPABASE_TRUNCATE === '1';
const batchSize = Number(process.env.MIGRATE_SUPABASE_BATCH_SIZE || 100);

function configured(value: string | undefined): string {
  const cleaned = (value || '').trim().replace(/^['"]|['"]$/g, '');
  return cleaned && !cleaned.includes('${') && !cleaned.includes('replace-with') ? cleaned : '';
}

function resolveSourceUrl(): string {
  const databaseUrl = resolveDatabaseUrl();
  return (
    configured(process.env.SOURCE_DATABASE_URL) ||
    configured(process.env.NEON_DATABASE_URL) ||
    (detectDatabaseProvider(databaseUrl) !== 'supabase' ? configured(databaseUrl) : '')
  );
}

function resolveTargetUrl(): string {
  const directUrl = resolveDirectDatabaseUrl();
  return (
    configured(process.env.TARGET_DATABASE_URL) ||
    configured(process.env.SUPABASE_DIRECT_URL) ||
    configured(process.env.SUPABASE_DATABASE_URL) ||
    (detectDatabaseProvider(directUrl) === 'supabase' ? configured(directUrl) : '')
  );
}

function quoteIdent(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function qualifiedTable(table: string): string {
  return `"public".${quoteIdent(table)}`;
}

function assertMigrationInputs(sourceUrl: string, targetUrl: string) {
  if (!sourceUrl) {
    throw new Error('Missing source URL. Set SOURCE_DATABASE_URL or NEON_DATABASE_URL before migrating.');
  }
  if (!targetUrl) {
    throw new Error('Missing Supabase target URL. Set TARGET_DATABASE_URL or SUPABASE_DIRECT_URL.');
  }

  const targetProvider = detectDatabaseProvider(targetUrl);
  if (targetProvider !== 'supabase' && process.env.ALLOW_NON_SUPABASE_TARGET !== '1') {
    throw new Error(`Target database must be Supabase. Detected provider: ${targetProvider}`);
  }
}

function runPrismaMigrateDeploy(targetUrl: string) {
  if (skipSchema) {
    console.log('Skipping Prisma migrate deploy (--skip-schema).');
    return;
  }

  console.log('Applying Prisma migrations to Supabase target...');
  const result = spawnSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['prisma', 'migrate', 'deploy'],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_URL: targetUrl,
        DIRECT_URL: targetUrl,
      },
      stdio: 'inherit',
    }
  );

  if (result.error) {
    throw result.error;
  }
  if ((result.status ?? 1) !== 0) {
    throw new Error(`prisma migrate deploy failed with exit code ${result.status ?? 1}`);
  }
}

async function getPublicTables(db: PrismaClient): Promise<TableName[]> {
  const rows = await db.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name <> '_prisma_migrations'
    ORDER BY table_name
  `;
  return rows.map((row) => row.table_name);
}

async function getForeignKeyEdges(db: PrismaClient, tables: Set<string>): Promise<ForeignKeyEdge[]> {
  const rows = await db.$queryRaw<ForeignKeyEdge[]>`
    SELECT
      tc.table_name AS child_table,
      ccu.table_name AS parent_table
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND ccu.table_schema = 'public'
  `;

  return rows.filter(
    (row) =>
      row.child_table !== row.parent_table &&
      tables.has(row.child_table) &&
      tables.has(row.parent_table)
  );
}

function orderTablesByDependencies(tables: TableName[], edges: ForeignKeyEdge[]): TableName[] {
  const remaining = new Set(tables);
  const dependencies = new Map<TableName, Set<TableName>>();

  for (const table of tables) {
    dependencies.set(table, new Set());
  }
  for (const edge of edges) {
    dependencies.get(edge.child_table)?.add(edge.parent_table);
  }

  const ordered: TableName[] = [];
  while (remaining.size > 0) {
    const ready = [...remaining].filter((table) => {
      const deps = dependencies.get(table) || new Set();
      return [...deps].every((dep) => !remaining.has(dep));
    });

    if (ready.length === 0) {
      const cycleRemainder = [...remaining].sort();
      console.warn(`Foreign-key cycle detected; appending remaining tables: ${cycleRemainder.join(', ')}`);
      ordered.push(...cycleRemainder);
      break;
    }

    for (const table of ready.sort()) {
      ordered.push(table);
      remaining.delete(table);
    }
  }

  return ordered;
}

async function getColumns(db: PrismaClient, table: string): Promise<ColumnInfo[]> {
  return db.$queryRawUnsafe<ColumnInfo[]>(
    `
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
      ORDER BY ordinal_position
    `,
    table
  );
}

async function countRows(db: PrismaClient, table: string): Promise<number> {
  const rows = await db.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*)::bigint AS count FROM ${qualifiedTable(table)}`
  );
  return Number(rows[0]?.count || 0);
}

function normalizeValue(value: unknown, column: ColumnInfo): unknown {
  if (value === null || value === undefined) return null;
  if (column.data_type === 'json' || column.data_type === 'jsonb') {
    return typeof value === 'string' ? value : JSON.stringify(value);
  }
  return value;
}

function placeholder(index: number, column: ColumnInfo): string {
  if (column.data_type === 'jsonb') return `$${index}::jsonb`;
  if (column.data_type === 'json') return `$${index}::json`;
  return `$${index}`;
}

async function insertRows(target: PrismaClient, table: string, columns: ColumnInfo[], rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;

  const columnSql = columns.map((column) => quoteIdent(column.column_name)).join(', ');
  const params: unknown[] = [];
  const valuesSql = rows
    .map((row) => {
      const placeholders = columns.map((column) => {
        params.push(normalizeValue(row[column.column_name], column));
        return placeholder(params.length, column);
      });
      return `(${placeholders.join(', ')})`;
    })
    .join(', ');

  await target.$executeRawUnsafe(
    `INSERT INTO ${qualifiedTable(table)} (${columnSql}) VALUES ${valuesSql} ON CONFLICT DO NOTHING`,
    ...params
  );
}

async function copyTable(source: PrismaClient, target: PrismaClient, table: string) {
  const columns = await getColumns(source, table);
  if (columns.length === 0) return { copied: 0, sourceCount: 0, targetCount: 0 };

  const sourceCount = await countRows(source, table);
  let copied = 0;

  for (let offset = 0; offset < sourceCount; offset += batchSize) {
    const rows = await source.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT ${columns.map((column) => quoteIdent(column.column_name)).join(', ')}
       FROM ${qualifiedTable(table)}
       LIMIT $1 OFFSET $2`,
      batchSize,
      offset
    );
    await insertRows(target, table, columns, rows);
    copied += rows.length;
  }

  const targetCount = await countRows(target, table);
  return { copied, sourceCount, targetCount };
}

async function truncateTables(target: PrismaClient, tables: string[]) {
  if (!truncateTarget || tables.length === 0) return;
  console.log('Truncating Supabase target public tables before copy...');
  await target.$executeRawUnsafe(
    `TRUNCATE TABLE ${tables.map(qualifiedTable).join(', ')} RESTART IDENTITY CASCADE`
  );
}

async function main() {
  const sourceUrl = resolveSourceUrl();
  const targetUrl = resolveTargetUrl();
  assertMigrationInputs(sourceUrl, targetUrl);

  console.log('Continuum Postgres -> Supabase migration');
  console.log(`Mode: ${execute ? 'execute' : 'dry-run'}`);
  console.log(`Target project ref: ${getSupabaseProjectRefFromUrl(targetUrl) || 'unknown'}`);

  if (!execute) {
    console.log('Dry run only. Re-run with --execute and --truncate-target to apply schema and copy data.');
    return;
  }

  runPrismaMigrateDeploy(targetUrl);

  const source = new PrismaClient({ datasources: { db: { url: sourceUrl } } });
  const target = new PrismaClient({ datasources: { db: { url: targetUrl } } });

  try {
    await source.$queryRaw`SELECT 1`;
    await target.$queryRaw`SELECT 1`;

    const tables = await getPublicTables(source);
    const tableSet = new Set(tables);
    const edges = await getForeignKeyEdges(source, tableSet);
    const orderedTables = orderTablesByDependencies(tables, edges);

    await truncateTables(target, orderedTables.slice().reverse());

    const failures: string[] = [];
    for (const table of orderedTables) {
      const result = await copyTable(source, target, table);
      const ok = result.targetCount >= result.sourceCount;
      console.log(
        `${ok ? 'PASS' : 'FAIL'} ${table}: source=${result.sourceCount} copied=${result.copied} target=${result.targetCount}`
      );
      if (!ok) failures.push(table);
    }

    if (failures.length > 0) {
      throw new Error(`Row-count verification failed for: ${failures.join(', ')}`);
    }

    console.log('Supabase migration copy and row-count verification completed.');
  } finally {
    await source.$disconnect();
    await target.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
