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

export type UploadStorageProvider = 'cloudflare-r2' | 's3-compatible' | 'aws-s3';

export interface UploadStorageReadiness {
  configured: boolean;
  provider: UploadStorageProvider;
  missingRequired: string[];
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
  const missingRequired = REQUIRED_UPLOAD_STORAGE_ENV.filter((name) => !envSet(name));
  const provider: UploadStorageProvider = endpoint.includes('r2.cloudflarestorage.com')
    ? 'cloudflare-r2'
    : endpoint
      ? 's3-compatible'
      : 'aws-s3';

  return {
    configured: missingRequired.length === 0,
    provider,
    missingRequired,
    region: resolveUploadStorageRegion(),
    endpointConfigured: Boolean(endpoint),
    publicUrlConfigured: envSet('UPLOAD_PUBLIC_URL'),
  };
}
