import { NextRequest, NextResponse } from 'next/server';
import { refreshTokens, setAuthCookies, clearAuthCookies } from '@/lib/auth-service';
import { getRefreshTokenFromCookies } from '@/lib/jwt-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * POST /api/auth/refresh
 *
 * Refreshes the access token using the refresh token cookie.
 * Returns new access and refresh tokens.
 */
export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookies
    const refreshToken = await getRefreshTokenFromCookies();

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token found' },
        { status: 401 }
      );
    }

    // Attempt to refresh
    const result = await refreshTokens(refreshToken);

    if (!result.success) {
      // Clear cookies on failure
      const response = NextResponse.json(
        { error: result.error || 'Token refresh failed' },
        { status: 401 }
      );
      clearAuthCookies(response);
      return response;
    }

    // Build success response
    const response = NextResponse.json({
      success: true,
      user: result.user,
    });

    // Set new auth cookies
    if (result.accessToken && result.refreshToken) {
      setAuthCookies(response, result.accessToken, result.refreshToken);
    }

    return response;
  } catch (error) {
    console.error('[AUTH REFRESH] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Clear cookies on error
    const response = NextResponse.json(
      { error: 'Token refresh failed', details: errorMessage },
      { status: 500 }
    );
    clearAuthCookies(response);
    return response;
  }
}
