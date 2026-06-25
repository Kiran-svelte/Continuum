import { NextResponse } from 'next/server';
import { neonAuth } from '@/lib/neon-auth';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';

export const dynamic = 'force-dynamic';

function requireSuperAdmin(role: string) {
  if (role !== 'super_admin') {
    throw Object.assign(new AuthError('Forbidden', 403), { status: 403 });
  }
}

export async function GET() {
  try {
    const employee = await getAuthEmployee();
    requireSuperAdmin(employee.primary_role);

    console.log('Testing Neon Auth service...');
    
    const results = {
      configured: neonAuth.isConfigured(),
      health: null as any,
      testToken: null as any,
      validation: null as any,
      timestamp: new Date().toISOString(),
    };

    console.log('1. Configuration check:', results.configured);

    // Test health check
    try {
      results.health = await neonAuth.healthCheck();
      console.log('2. Health check:', results.health);
    } catch (error) {
      results.health = { error: error instanceof Error ? error.message : 'Health check failed' };
    }

    // Test token creation
    try {
      const testToken = await neonAuth.createTestToken('test-user-123', 'test@continuum.com', 'admin');
      results.testToken = { created: true, token: testToken.substring(0, 50) + '...' };
      console.log('3. Test token created');

      // Test token validation
      try {
        results.validation = await neonAuth.validateToken(testToken);
        console.log('4. Token validation:', results.validation);
      } catch (error) {
        results.validation = { error: error instanceof Error ? error.message : 'Validation failed' };
      }
    } catch (error) {
      results.testToken = { error: error instanceof Error ? error.message : 'Token creation failed' };
    }

    return NextResponse.json(results);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Neon Auth test error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Test failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}