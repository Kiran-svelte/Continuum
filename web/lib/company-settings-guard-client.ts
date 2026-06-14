import { hardenCompanySettingsWriteArgs } from '@/lib/company-settings-guard';

type MiddlewareParams = {
  model?: string;
  action: string;
  args?: Record<string, unknown>;
};

type MiddlewareNext = (params: MiddlewareParams) => Promise<unknown>;

type PrismaLikeClient = {
  $use?: (middleware: (params: MiddlewareParams, next: MiddlewareNext) => Promise<unknown>) => void;
  $extends?: (extension: Record<string, unknown>) => PrismaLikeClient;
};

function applyGuard(params: MiddlewareParams, nowFactory: () => Date) {
  return hardenCompanySettingsWriteArgs(
    {
      model: params.model,
      action: params.action,
      args: params.args,
    },
    nowFactory()
  );
}

/**
 * Installs CompanySettings write hardening on Prisma clients.
 * Supports legacy middleware (`$use`) and query extensions (`$extends`).
 */
export function installCompanySettingsWriteGuard<TClient extends PrismaLikeClient>(
  client: TClient,
  label: string,
  nowFactory: () => Date = () => new Date()
): TClient {
  if (typeof client.$use === 'function') {
    client.$use(async (params, next) => {
      const result = applyGuard(params, nowFactory);

      if (result.changed && process.env.NODE_ENV !== 'production') {
        console.warn(`[PRISMA][${label}] companySettings write guard backfilled fields`, {
          action: params.action,
          changes: result.changes,
        });
      }

      return next(params);
    });

    return client;
  }

  if (typeof client.$extends === 'function') {
    const extended = client.$extends({
      query: {
        companySettings: {
          async create({ args, query }: { args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) {
            const params: MiddlewareParams = {
              model: 'CompanySettings',
              action: 'create',
              args: { data: (args?.data as Record<string, unknown>) ?? {} },
            };
            const result = applyGuard(params, nowFactory);
            if (result.changed && process.env.NODE_ENV !== 'production') {
              console.warn(`[PRISMA][${label}] companySettings write guard backfilled fields`, {
                action: 'create',
                changes: result.changes,
              });
            }
            return query({ ...args, data: params.args?.data ?? args.data });
          },
          async update({ args, query }: { args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) {
            const params: MiddlewareParams = {
              model: 'CompanySettings',
              action: 'update',
              args: { data: (args?.data as Record<string, unknown>) ?? {} },
            };
            const result = applyGuard(params, nowFactory);
            if (result.changed && process.env.NODE_ENV !== 'production') {
              console.warn(`[PRISMA][${label}] companySettings write guard backfilled fields`, {
                action: 'update',
                changes: result.changes,
              });
            }
            return query({ ...args, data: params.args?.data ?? args.data });
          },
          async upsert({ args, query }: { args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) {
            const params: MiddlewareParams = {
              model: 'CompanySettings',
              action: 'upsert',
              args: {
                create: (args?.create as Record<string, unknown>) ?? {},
                update: (args?.update as Record<string, unknown>) ?? {},
              },
            };
            const result = applyGuard(params, nowFactory);
            if (result.changed && process.env.NODE_ENV !== 'production') {
              console.warn(`[PRISMA][${label}] companySettings write guard backfilled fields`, {
                action: 'upsert',
                changes: result.changes,
              });
            }
            return query({
              ...args,
              create: params.args?.create ?? args.create,
              update: params.args?.update ?? args.update,
            });
          },
        },
      },
    });

    return extended as TClient;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[PRISMA][${label}] companySettings write guard could not be installed: no $use/$extends hooks available`);
  }

  return client;
}