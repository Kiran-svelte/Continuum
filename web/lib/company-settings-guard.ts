import { randomUUID } from 'crypto';

type MiddlewareParams = {
  model?: string;
  action: string;
  args?: Record<string, unknown>;
};

type GuardResult = {
  changed: boolean;
  changes: string[];
};

function ensureObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

/**
 * Enforces required CompanySettings write fields globally.
 * - create: ensures id + updated_at
 * - update: ensures updated_at
 * - upsert: ensures create.id + create.updated_at + update.updated_at
 */
export function hardenCompanySettingsWriteArgs(
  params: MiddlewareParams,
  now: Date = new Date()
): GuardResult {
  if (params.model !== 'CompanySettings') {
    return { changed: false, changes: [] };
  }

  const args = ensureObject(params.args);
  const changes: string[] = [];

  if (params.action === 'create') {
    const data = ensureObject(args.data);
    if (!('id' in data) || !data.id) {
      data.id = randomUUID();
      changes.push('create.id');
    }
    if (!('updated_at' in data) || !data.updated_at) {
      data.updated_at = now;
      changes.push('create.updated_at');
    }
    args.data = data;
    params.args = args;
    return { changed: changes.length > 0, changes };
  }

  if (params.action === 'update') {
    const data = ensureObject(args.data);
    data.updated_at = now;
    if (!('updated_at' in ensureObject(args.data))) {
      changes.push('update.updated_at');
    } else {
      changes.push('update.updated_at.refresh');
    }
    args.data = data;
    params.args = args;
    return { changed: true, changes };
  }

  if (params.action === 'upsert') {
    const create = ensureObject(args.create);
    const update = ensureObject(args.update);

    if (!('id' in create) || !create.id) {
      create.id = randomUUID();
      changes.push('upsert.create.id');
    }
    if (!('updated_at' in create) || !create.updated_at) {
      create.updated_at = now;
      changes.push('upsert.create.updated_at');
    }

    if (!('updated_at' in update) || !update.updated_at) {
      changes.push('upsert.update.updated_at');
    } else {
      changes.push('upsert.update.updated_at.refresh');
    }
    update.updated_at = now;

    args.create = create;
    args.update = update;
    params.args = args;

    return { changed: true, changes };
  }

  return { changed: false, changes: [] };
}
