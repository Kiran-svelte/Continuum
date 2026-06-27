export const REQUIRED_UPLOAD_STORAGE_ENV = [
  'UPLOAD_BUCKET',
  'UPLOAD_ACCESS_KEY',
  'UPLOAD_SECRET_KEY',
  'UPLOAD_ENDPOINT',
] as const;

export const OPTIONAL_UPLOAD_STORAGE_ENV = [
  'UPLOAD_REGION',
  'UPLOAD_PUBLIC_URL',
] as const;

export const APPWRITE_UPLOAD_STORAGE_ENV = [
  'APPWRITE_ENDPOINT',
  'APPWRITE_PROJECT_ID',
  'APPWRITE_STORAGE_BUCKET_ID',
  'APPWRITE_API_KEY',
] as const;

export type UploadStorageProvider = 'cloudflare-r2' | 's3-compatible' | 'aws-s3' | 'appwrite';

export interface UploadStorageReadiness {
  configured: boolean;
  provider: UploadStorageProvider;
  missingRequired: string[];
  primaryMissingRequired: string[];
  fallbackMissingRequired: string[];
  fallbackConfigured: boolean;
  region: string;
  endpointConfigured: boolean;
  publicUrlConfigured: boolean;
}

function envSet(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

export function resolveUploadStorageRegion(): string {
  const explicit = process.env.UPLOAD_REGION?.trim();
  if (explicit) return explicit;
  return envSet('UPLOAD_ENDPOINT') ? 'auto' : 'ap-south-1';
}

export function getUploadStorageReadiness(): UploadStorageReadiness {
  const endpoint = process.env.UPLOAD_ENDPOINT?.trim() ?? '';
  const primaryMissingRequired = REQUIRED_UPLOAD_STORAGE_ENV.filter((name) => !envSet(name));
  const fallbackMissingRequired = APPWRITE_UPLOAD_STORAGE_ENV.filter((name) => !envSet(name));
  const primaryConfigured = primaryMissingRequired.length === 0;
  const fallbackConfigured = fallbackMissingRequired.length === 0;
  const primaryProvider: UploadStorageProvider = endpoint.includes('r2.cloudflarestorage.com')
    ? 'cloudflare-r2'
    : endpoint
      ? 's3-compatible'
      : 'aws-s3';
  const provider: UploadStorageProvider = primaryConfigured ? primaryProvider : 'appwrite';
  const configured = primaryConfigured || fallbackConfigured;

  return {
    configured,
    provider,
    missingRequired: configured ? [] : primaryMissingRequired,
    primaryMissingRequired,
    fallbackMissingRequired,
    fallbackConfigured,
    region: primaryConfigured ? resolveUploadStorageRegion() : 'appwrite',
    endpointConfigured: Boolean(endpoint),
    publicUrlConfigured: envSet('UPLOAD_PUBLIC_URL'),
  };
}
