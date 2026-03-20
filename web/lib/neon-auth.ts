import { jwtVerify, importJWK } from 'jose';

interface NeonAuthConfig {
  authUrl: string;
  jwksUrl: string;
  apiKey: string;
}

interface NeonAuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    role?: string;
  };
  error?: string;
}

interface JWKSResponse {
  keys: Array<{
    alg: string;
    crv: string;
    x: string;
    kty: string;
    kid: string;
  }>;
}

class NeonAuthService {
  private config: NeonAuthConfig;
  private jwksCache: { keys: any[], expires: number } | null = null;

  constructor() {
    this.config = {
      authUrl: process.env.NEON_AUTH_URL!,
      jwksUrl: process.env.NEON_JWKS_URL!,
      apiKey: process.env.NEON_API_KEY!,
    };
  }

  /**
   * Fetch and cache JWKS
   */
  private async getJWKS(): Promise<any[]> {
    // Check cache
    if (this.jwksCache && Date.now() < this.jwksCache.expires) {
      return this.jwksCache.keys;
    }

    try {
      const response = await fetch(this.config.jwksUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch JWKS: ${response.status}`);
      }

      const jwks: JWKSResponse = await response.json();
      
      // Cache for 1 hour
      this.jwksCache = {
        keys: jwks.keys,
        expires: Date.now() + (60 * 60 * 1000),
      };

      return jwks.keys;
    } catch (error) {
      console.error('JWKS fetch error:', error);
      throw error;
    }
  }

  /**
   * Validate Neon Auth JWT token using JWKS
   */
  async validateToken(token: string): Promise<NeonAuthResult> {
    try {
      // Get JWKS
      const keys = await this.getJWKS();
      if (!keys || keys.length === 0) {
        throw new Error('No JWKS keys available');
      }

      // Try to verify with each key (usually there's just one)
      let lastError: Error | null = null;
      for (const jwk of keys) {
        try {
          const key = await importJWK(jwk, jwk.alg);
          const { payload } = await jwtVerify(token, key, {
            issuer: this.config.authUrl,
            audience: ['neondb', 'continuum-api'], // Support both audiences
          });

          return {
            success: true,
            user: {
              id: payload.sub as string,
              email: (payload.email as string) || 'unknown@neon.tech',
              role: (payload.role as string) || 'user',
            },
          };
        } catch (verifyError) {
          lastError = verifyError instanceof Error ? verifyError : new Error('Verification failed');
          continue;
        }
      }

      throw lastError || new Error('Token verification failed with all keys');
    } catch (error) {
      console.error('Neon auth validation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token validation failed',
      };
    }
  }

  /**
   * Check Neon Auth service health (JWKS availability)
   */
  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      const keys = await this.getJWKS();
      return {
        healthy: keys && keys.length > 0,
        error: keys && keys.length > 0 ? undefined : 'No JWKS keys available',
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'JWKS fetch failed',
      };
    }
  }

  /**
   * Create JWT token for testing (mock implementation)
   */
  async createTestToken(userId: string, email: string, role: string): Promise<string> {
    // This is a mock implementation for testing
    // In a real Neon Auth setup, you'd use their API to create tokens
    const header = { alg: 'EdDSA', typ: 'JWT' };
    const payload = {
      sub: userId,
      email,
      role,
      iss: this.config.authUrl,
      aud: 'neondb',
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
      iat: Math.floor(Date.now() / 1000),
    };

    // For testing only - return a mock token structure
    return `mock-token.${btoa(JSON.stringify(payload))}.signature`;
  }

  /**
   * Test if the service is properly configured
   */
  isConfigured(): boolean {
    return !!(this.config.authUrl && this.config.jwksUrl && this.config.apiKey);
  }
}

export const neonAuth = new NeonAuthService();
export type { NeonAuthResult };