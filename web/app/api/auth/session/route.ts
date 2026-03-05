import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const AUTH_COOKIE_NAME = 'firebase-auth-token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * POST /api/auth/session
 * 
 * Sets the Firebase auth token as an HTTP-only cookie.
 * Called from the client after successful Firebase sign-in.
 */
export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();
    
    if (!idToken) {
      return NextResponse.json({ error: 'ID token required' }, { status: 400 });
    }

    // Verify the token is valid
    const decodedToken = await verifyIdToken(idToken);
    
    // Create response with cookie
    const response = NextResponse.json({ 
      success: true,
      uid: decodedToken.uid,
      email: decodedToken.email,
    });
    
    // Set HTTP-only cookie with the token
    response.cookies.set(AUTH_COOKIE_NAME, idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[AUTH SESSION] Error setting session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create session', details: errorMessage },
      { status: 401 }
    );
  }
}

/**
 * DELETE /api/auth/session
 * 
 * Clears the Firebase auth cookie (sign out).
 */
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  
  response.cookies.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  return response;
}
