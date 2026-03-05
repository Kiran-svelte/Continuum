import { NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/firebase-check
 * 
 * Diagnoses Firebase configuration issues
 */
export async function GET() {
  const checks: Record<string, unknown> = {};
  
  // Check raw env vars (before trim)
  checks.rawEnvVars = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 
      `***${process.env.NEXT_PUBLIC_FIREBASE_API_KEY.slice(-10)}` : 'MISSING',
    apiKeyLength: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.length ?? 0,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'MISSING',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'MISSING',
  };
  
  // Check trimmed values (what Firebase actually uses)
  checks.trimmedValues = {
    apiKey: (process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '').trim() ? 
      `***${(process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '').trim().slice(-8)}` : 'MISSING',
    apiKeyLength: (process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '').trim().length,
    authDomain: (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '').trim(),
    projectId: (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '').trim(),
  };
  
  // Check for whitespace/newline issues
  checks.whitespaceIssues = {
    apiKeyHasNewline: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.includes('\n') ?? false,
    apiKeyHasCarriageReturn: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.includes('\r') ?? false,
    projectIdHasNewline: process.env.FIREBASE_PROJECT_ID?.includes('\n') ?? false,
  };
  
  // Check server-side env vars (admin SDK)
  checks.server = {
    projectId: process.env.FIREBASE_PROJECT_ID?.trim() ?? 'MISSING',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL?.trim() ?? 'MISSING',
    hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
  };
  
  // Try to initialize admin SDK
  try {
    const auth = getAdminAuth();
    const users = await auth.listUsers(1);
    checks.adminSdk = {
      status: 'working',
      usersCount: users.users.length,
    };
  } catch (error) {
    checks.adminSdk = {
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
  
  return NextResponse.json(checks);
}
