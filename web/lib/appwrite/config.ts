/**
 * Appwrite configuration (server-side).
 * Never expose APPWRITE_API_KEY to the client.
 */

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name]?.trim() || fallback?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, fallback = ''): string {
  return process.env[name]?.trim() || fallback;
}

export const appwriteConfig = {
  endpoint: optionalEnv('APPWRITE_ENDPOINT', 'https://fra.cloud.appwrite.io/v1'),
  projectId: optionalEnv('APPWRITE_PROJECT_ID', '6a0c1929002c719bd1be'),
  databaseId: optionalEnv('APPWRITE_DATABASE_ID', '6a0c19610039b961689f'),
  storageBucketId: optionalEnv('APPWRITE_STORAGE_BUCKET_ID', '6a0c19a90004bdd511a1'),
  apiKey: optionalEnv('APPWRITE_API_KEY'),
} as const;

/** True when server can call Appwrite with an API key. */
export function isAppwriteConfigured(): boolean {
  return Boolean(
    appwriteConfig.endpoint &&
      appwriteConfig.projectId &&
      appwriteConfig.storageBucketId &&
      appwriteConfig.apiKey
  );
}

/** Throws when Appwrite is required but not configured. */
export function assertAppwriteConfigured(): void {
  if (!isAppwriteConfigured()) {
    throw new Error(
      'Appwrite is not configured. Set APPWRITE_API_KEY (and related APPWRITE_* vars) on the server.'
    );
  }
}

export function getAppwritePublicConfig() {
  return {
    endpoint: appwriteConfig.endpoint,
    projectId: appwriteConfig.projectId,
  };
}
