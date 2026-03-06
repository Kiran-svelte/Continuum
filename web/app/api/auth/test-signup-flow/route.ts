import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for this test endpoint

/**
 * POST /api/auth/test-signup-flow
 * 
 * Tests the complete sign-up flow server-side.
 * Body: { email, password, first_name, last_name, company_name }
 */
export async function POST(request: Request) {
  const startTime = Date.now();
  const steps: { step: string; status: string; duration: number; error?: string }[] = [];
  
  try {
    const body = await request.json();
    const { email, password, first_name, last_name, company_name } = body;
    
    if (!email || !password || !first_name || !last_name || !company_name) {
      return NextResponse.json({ 
        error: 'Missing required fields: email, password, first_name, last_name, company_name' 
      }, { status: 400 });
    }
    
    const apiKey = (process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '').trim();
    
    // Step 1: Create Firebase user via REST API
    const step1Start = Date.now();
    let idToken: string;
    
    try {
      const signUpRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      });
      
      const signUpData = await signUpRes.json();
      
      if (!signUpRes.ok) {
        // If user exists, try sign in
        if (signUpData.error?.message === 'EMAIL_EXISTS') {
          const signInRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, returnSecureToken: true }),
          });
          const signInData = await signInRes.json();
          if (!signInRes.ok) {
            throw new Error(signInData.error?.message || 'Sign-in failed');
          }
          idToken = signInData.idToken;
          steps.push({ step: 'Firebase Sign-In (user existed)', status: 'success', duration: Date.now() - step1Start });
        } else {
          throw new Error(signUpData.error?.message || 'Sign-up failed');
        }
      } else {
        idToken = signUpData.idToken;
        steps.push({ step: 'Firebase Sign-Up', status: 'success', duration: Date.now() - step1Start });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      steps.push({ step: 'Firebase Auth', status: 'failed', duration: Date.now() - step1Start, error: errorMsg });
      return NextResponse.json({ success: false, steps, totalDuration: Date.now() - startTime }, { status: 500 });
    }
    
    // Step 2: Create session
    const step2Start = Date.now();
    try {
      const sessionRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://web-bice-eight-83.vercel.app'}/api/auth/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      
      if (!sessionRes.ok) {
        const sessionData = await sessionRes.json().catch(() => ({}));
        throw new Error(sessionData.error || sessionData.details || `Session failed: ${sessionRes.status}`);
      }
      steps.push({ step: 'Create Session', status: 'success', duration: Date.now() - step2Start });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      steps.push({ step: 'Create Session', status: 'failed', duration: Date.now() - step2Start, error: errorMsg });
      return NextResponse.json({ success: false, steps, totalDuration: Date.now() - startTime }, { status: 500 });
    }
    
    // Step 3: Register company
    const step3Start = Date.now();
    try {
      const registerRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://web-bice-eight-83.vercel.app'}/api/auth/register`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          first_name,
          last_name,
          company_name,
          industry: 'Technology',
          size: '1-50',
          timezone: 'Asia/Kolkata',
        }),
      });
      
      const registerData = await registerRes.json();
      
      if (!registerRes.ok) {
        // 409 = already registered, which is OK
        if (registerRes.status === 409) {
          steps.push({ step: 'Register Company (already registered)', status: 'success', duration: Date.now() - step3Start });
        } else {
          throw new Error(registerData.error || `Register failed: ${registerRes.status}`);
        }
      } else {
        steps.push({ step: 'Register Company', status: 'success', duration: Date.now() - step3Start });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      steps.push({ step: 'Register Company', status: 'failed', duration: Date.now() - step3Start, error: errorMsg });
      return NextResponse.json({ success: false, steps, totalDuration: Date.now() - startTime }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      steps, 
      totalDuration: Date.now() - startTime,
      message: 'Complete sign-up flow successful!' 
    });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ 
      success: false, 
      error: message,
      steps,
      totalDuration: Date.now() - startTime 
    }, { status: 500 });
  }
}

/**
 * GET /api/auth/test-signup-flow
 * 
 * Returns instructions for testing
 */
export async function GET() {
  return NextResponse.json({
    endpoint: 'POST /api/auth/test-signup-flow',
    description: 'Tests the complete sign-up flow server-side',
    body: {
      email: 'string (required)',
      password: 'string (required, min 6 chars)',
      first_name: 'string (required)',
      last_name: 'string (required)',
      company_name: 'string (required)',
    },
    example: {
      email: 'test@example.com',
      password: 'TestPassword123!',
      first_name: 'Test',
      last_name: 'User',
      company_name: 'Test Company',
    },
  });
}
