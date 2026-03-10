import { NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/test-firebase
 * 
 * Tests Firebase Admin SDK initialization
 */
export async function GET() {
  // Block in production — dev/test-only endpoint
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'This endpoint is disabled in production' }, { status: 403 });
  }

  try {
    const auth = getAdminAuth();
    
    // Try to list users (limited to 1) to verify connection
    const listResult = await auth.listUsers(1);
    
    return NextResponse.json({
      success: true,
      message: 'Firebase Admin SDK working correctly',
      usersCount: listResult.users.length,
    });
  } catch (error) {
    console.error('[TEST FIREBASE] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        success: false, 
        error: message,
        projectId: process.env.FIREBASE_PROJECT_ID?.trim(),
        hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
        hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
      },
      { status: 500 }
    );
  }
}
