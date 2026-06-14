import 'server-only';

import { z } from 'zod';

const twentyFirstDevEnvSchema = z.object({
  TWENTYFIRST_DEV_API_KEY: z.string().trim().min(1, 'TWENTYFIRST_DEV_API_KEY is required'),
  TWENTYFIRST_DEV_BASE_URL: z
    .string()
    .trim()
    .url('TWENTYFIRST_DEV_BASE_URL must be a valid URL')
    .default('https://api.21st.dev'),
});

export type TwentyFirstDevEnv = z.infer<typeof twentyFirstDevEnvSchema>;

export function getTwentyFirstDevEnv(rawEnv: NodeJS.ProcessEnv = process.env): TwentyFirstDevEnv {
  return twentyFirstDevEnvSchema.parse({
    TWENTYFIRST_DEV_API_KEY: rawEnv.TWENTYFIRST_DEV_API_KEY,
    TWENTYFIRST_DEV_BASE_URL: rawEnv.TWENTYFIRST_DEV_BASE_URL,
  });
}

export function hasTwentyFirstDevEnv(rawEnv: NodeJS.ProcessEnv = process.env): boolean {
  const key = rawEnv.TWENTYFIRST_DEV_API_KEY?.trim();
  return Boolean(key);
}
