/**
 * Signed download URL generator for S3-compatible storage (Cloudflare R2).
 *
 * Generates presigned GET URLs that expire after a configurable TTL.
 * These URLs are safe to return to the browser — the actual storage
 * bucket can remain private (no public access needed).
 *
 * Environment variables (shared with file-upload.ts):
 *   UPLOAD_BUCKET, UPLOAD_ACCESS_KEY, UPLOAD_SECRET_KEY,
 *   UPLOAD_ENDPOINT (R2 endpoint), UPLOAD_REGION
 *
 * Implements secure document access for payslips, HR documents,
 * profile photos, and any tenant-uploaded files.
 */
import { createHmac } from 'crypto';

/** How long a signed URL is valid (seconds). Default: 1 hour. */
const DEFAULT_TTL_SECONDS = 3600;

export interface SignedUrlOptions {
  /** Storage key (path within bucket) */
  key: string;
  /** TTL in seconds (default: 3600 = 1 hour) */
  ttlSeconds?: number;
}

export type SignedUrlResult =
  | {
      ok: true;
      url: string;
      expiresAt: Date;
    }
  | {
      ok: false;
      error: string;
    };

/**
 * Generates a presigned GET URL for a private object in S3/R2 storage.
 *
 * Uses AWS Signature Version 4 (supported by both S3 and Cloudflare R2).
 *
 * @param opts - Key and optional TTL
 * @returns Signed URL result
 */
export async function generateSignedDownloadUrl(
  opts: SignedUrlOptions
): Promise<SignedUrlResult> {
  const bucket = process.env.UPLOAD_BUCKET;
  const accessKey = process.env.UPLOAD_ACCESS_KEY;
  const secretKey = process.env.UPLOAD_SECRET_KEY;
  const endpoint = process.env.UPLOAD_ENDPOINT;
  const region = process.env.UPLOAD_REGION || 'auto';

  if (!bucket || !accessKey || !secretKey) {
    return { ok: false, error: 'Storage not configured' };
  }

  const ttl = opts.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttl * 1000);

  try {
    // AWS Signature Version 4 presigned URL generation
    const datestamp = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 8);
    const amzdate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';

    const host = endpoint
      ? new URL(endpoint).host
      : `${bucket}.s3.${region}.amazonaws.com`;

    const canonicalUri = `/${endpoint ? bucket + '/' : ''}${encodeURIComponent(opts.key).replace(/%2F/g, '/')}`;

    const credentialScope = `${datestamp}/${region}/s3/aws4_request`;
    const credential = `${accessKey}/${credentialScope}`;

    const queryParams = new URLSearchParams({
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': credential,
      'X-Amz-Date': amzdate,
      'X-Amz-Expires': String(ttl),
      'X-Amz-SignedHeaders': 'host',
    });

    const canonicalQueryString = queryParams.toString();
    const canonicalHeaders = `host:${host}\n`;
    const signedHeaders = 'host';

    const canonicalRequest = [
      'GET',
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      'UNSIGNED-PAYLOAD',
    ].join('\n');

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzdate,
      credentialScope,
      await sha256Hex(canonicalRequest),
    ].join('\n');

    const signingKey = await deriveSigningKey(secretKey, datestamp, region);
    const signature = hmacHex(signingKey, stringToSign);

    const baseUrl = endpoint
      ? `${endpoint}/${bucket}/${opts.key}`
      : `https://${host}${canonicalUri}`;

    const signedUrl = `${baseUrl}?${canonicalQueryString}&X-Amz-Signature=${signature}`;

    return { ok: true, url: signedUrl, expiresAt };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to generate signed URL',
    };
  }
}

// ─── AWS SigV4 helpers ──────────────────────────────────────────────────────

async function sha256Hex(data: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hmacHex(key: Buffer | Uint8Array, data: string): string {
  return createHmac('sha256', key).update(data, 'utf8').digest('hex');
}

function hmacBytes(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest();
}

async function deriveSigningKey(
  secretKey: string,
  datestamp: string,
  region: string
): Promise<Buffer> {
  const kDate = hmacBytes(`AWS4${secretKey}`, datestamp);
  const kRegion = hmacBytes(kDate, region);
  const kService = hmacBytes(kRegion, 's3');
  return hmacBytes(kService, 'aws4_request');
}
