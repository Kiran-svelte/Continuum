import { z } from 'zod';

const COMPANY_ROLES = ['admin', 'hr', 'director', 'manager', 'team_lead', 'employee'] as const;

const roleEnum = z.enum(COMPANY_ROLES);

export const bulkMatrixSchema = z.object({
  matrix: z.record(z.array(roleEnum)),
});

export const toggleSchema = z.object({
  role: roleEnum,
  permission_code: z.string().min(1),
  enabled: z.boolean(),
});

export type RbacPatchParseResult =
  | { mode: 'bulk'; data: z.infer<typeof bulkMatrixSchema> }
  | { mode: 'toggle'; data: z.infer<typeof toggleSchema> }
  | { mode: 'invalid'; errors: string[] };

export function parseRbacPatchPayload(body: unknown): RbacPatchParseResult {
  const bulkParsed = bulkMatrixSchema.safeParse(body);
  if (bulkParsed.success) {
    return { mode: 'bulk', data: bulkParsed.data };
  }

  const toggleParsed = toggleSchema.safeParse(body);
  if (toggleParsed.success) {
    return { mode: 'toggle', data: toggleParsed.data };
  }

  const errors = [
    ...bulkParsed.error.issues.map((issue) => `bulk:${issue.path.join('.')}:${issue.message}`),
    ...toggleParsed.error.issues.map((issue) => `toggle:${issue.path.join('.')}:${issue.message}`),
  ];

  return { mode: 'invalid', errors };
}
