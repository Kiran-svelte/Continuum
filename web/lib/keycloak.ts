// ─── Keycloak Server-Side Adapter ────────────────────────────────────────────
// OIDC integration for Keycloak identity provider.
// Provides token verification, code exchange, refresh, and user info retrieval.
// Uses Node.js crypto module for JWT signature verification (no external deps).
// ─────────────────────────────────────────────────────────────────────────────

import { createVerify, createPublicKey, KeyObject } from 'crypto';

// ─── Cookie Constants ────────────────────────────────────────────────────────

/** Cookie name for the Keycloak access token */
export const KEYCLOAK_TOKEN_COOKIE = 'kc-access-token';

/** Cookie name for the Keycloak refresh token */
export const KEYCLOAK_REFRESH_COOKIE = 'kc-refresh-token';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DecodedUser {
  uid: string;
  email?: string;
}

/** Standard OIDC endpoint configuration for a Keycloak realm */
export interface KeycloakOIDCConfig {
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userinfoEndpoint: string;
  jwksUri: string;
  endSessionEndpoint: string;
}

/** Response from Keycloak token endpoint after authorization code exchange */
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  id_token: string;
  expires_in: number;
  refresh_expires_in?: number;
  token_type?: string;
  scope?: string;
}

/** Response from Keycloak token endpoint after refresh */
export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in?: number;
  token_type?: string;
  scope?: string;
}

/** User information returned from the Keycloak userinfo endpoint */
export interface KeycloakUserInfo {
  sub: string;
  email?: string;
  name?: string;
  preferred_username?: string;
  realm_roles?: string[];
  email_verified?: boolean;
  given_name?: string;
  family_name?: string;
}

/** JSON Web Key from JWKS endpoint */
interface JWK {
  kid: string;
  kty: string;
  alg?: string;
  use?: string;
  n?: string;
  e?: string;
  x5c?: string[];
}

/** JWKS response from Keycloak */
interface JWKSResponse {
  keys: JWK[];
}

/** Decoded JWT header */
interface JWTHeader {
  alg: string;
  typ?: string;
  kid?: string;
}

/** Decoded JWT payload (Keycloak-specific claims) */
interface KeycloakJWTPayload {
  sub: string;
  email?: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  azp?: string;
  realm_access?: {
    roles?: string[];
  };
  resource_access?: Record<string, { roles?: string[] }>;
  preferred_username?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email_verified?: boolean;
}

// ─── Configuration ───────────────────────────────────────────────────────────

/**
 * Reads Keycloak configuration from environment variables.
 * Returns null values for missing optional variables.
 */
function getEnvConfig() {
  return {
    url: process.env.KEYCLOAK_URL?.replace(/\/+$/, '') || '',
    realm: process.env.KEYCLOAK_REALM || '',
    clientId: process.env.KEYCLOAK_CLIENT_ID || '',
    clientSecret: process.env.KEYCLOAK_CLIENT_SECRET || '',
    enabled: process.env.KEYCLOAK_ENABLED === 'true',
  };
}

/**
 * Returns true only if KEYCLOAK_ENABLED is 'true' AND all required
 * environment variables (KEYCLOAK_URL, KEYCLOAK_REALM, KEYCLOAK_CLIENT_ID)
 * are set to non-empty values.
 */
export function isKeycloakEnabled(): boolean {
  const config = getEnvConfig();
  return config.enabled && !!config.url && !!config.realm && !!config.clientId;
}

/**
 * Returns the standard OIDC endpoint URLs for the configured Keycloak realm.
 * All endpoints are derived from the base URL and realm name.
 */
export function getKeycloakConfig(): KeycloakOIDCConfig {
  const { url, realm } = getEnvConfig();

  if (!url || !realm) {
    throw new Error(
      'Keycloak configuration incomplete: KEYCLOAK_URL and KEYCLOAK_REALM are required.'
    );
  }

  const realmBase = `${url}/realms/${realm}`;
  const oidcBase = `${realmBase}/protocol/openid-connect`;

  return {
    issuer: realmBase,
    authorizationEndpoint: `${oidcBase}/auth`,
    tokenEndpoint: `${oidcBase}/token`,
    userinfoEndpoint: `${oidcBase}/userinfo`,
    jwksUri: `${oidcBase}/certs`,
    endSessionEndpoint: `${oidcBase}/logout`,
  };
}

// ─── JWKS Cache ──────────────────────────────────────────────────────────────

/** In-memory JWKS cache with 1-hour TTL */
let jwksCache: {
  keys: Map<string, KeyObject>;
  fetchedAt: number;
} | null = null;

const JWKS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Clears the in-memory JWKS cache. Useful for testing or forced re-fetch.
 */
export function clearJWKSCache(): void {
  jwksCache = null;
}

/**
 * Converts a Base64url-encoded JWK RSA component to a Buffer.
 * Handles the URL-safe alphabet and missing padding.
 */
function base64UrlToBuffer(base64url: string): Buffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(padded, 'base64');
}

/**
 * Decodes a Base64url-encoded string to a UTF-8 string.
 */
function base64UrlDecode(input: string): string {
  return base64UrlToBuffer(input).toString('utf8');
}

/**
 * Converts a JWK (JSON Web Key) with RSA components (n, e) to a Node.js KeyObject.
 * Uses the standard crypto.createPublicKey with JWK input format.
 */
function jwkToPublicKey(jwk: JWK): KeyObject {
  if (jwk.kty !== 'RSA' || !jwk.n || !jwk.e) {
    throw new Error(`Unsupported JWK key type or missing parameters (kid: ${jwk.kid})`);
  }

  return createPublicKey({
    key: {
      kty: 'RSA',
      n: jwk.n,
      e: jwk.e,
    },
    format: 'jwk',
  });
}

/**
 * Fetches the JWKS (JSON Web Key Set) from Keycloak's certs endpoint.
 * Results are cached in-memory for 1 hour to avoid redundant network calls.
 * On cache miss or expiry, performs a fresh fetch and rebuilds the key map.
 */
async function getSigningKeys(): Promise<Map<string, KeyObject>> {
  const now = Date.now();

  // Return cached keys if still fresh
  if (jwksCache && now - jwksCache.fetchedAt < JWKS_CACHE_TTL_MS) {
    return jwksCache.keys;
  }

  const config = getKeycloakConfig();

  let response: Response;
  try {
    response = await fetch(config.jwksUri, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to fetch JWKS from Keycloak: ${message}`);
  }

  if (!response.ok) {
    throw new Error(
      `JWKS fetch failed with status ${response.status}: ${response.statusText}`
    );
  }

  const jwks: JWKSResponse = await response.json();

  if (!jwks.keys || !Array.isArray(jwks.keys) || jwks.keys.length === 0) {
    throw new Error('JWKS response contains no keys');
  }

  const keys = new Map<string, KeyObject>();

  for (const jwk of jwks.keys) {
    // Only import RSA signing keys
    if (jwk.kty === 'RSA' && (!jwk.use || jwk.use === 'sig') && jwk.kid) {
      try {
        keys.set(jwk.kid, jwkToPublicKey(jwk));
      } catch (err) {
        // Log but do not fail on individual key conversion errors
        console.warn(
          `[keycloak] Skipping JWK kid=${jwk.kid}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }

  if (keys.size === 0) {
    throw new Error('No usable RSA signing keys found in JWKS response');
  }

  jwksCache = { keys, fetchedAt: now };
  return keys;
}

// ─── JWT Verification ────────────────────────────────────────────────────────

/** Maps JWT algorithm names to Node.js crypto algorithm identifiers */
const ALG_MAP: Record<string, string> = {
  RS256: 'RSA-SHA256',
  RS384: 'RSA-SHA384',
  RS512: 'RSA-SHA512',
};

/**
 * Verifies a JWT token issued by Keycloak and returns a DecodedUser.
 *
 * Performs full validation:
 * - Decodes and parses the JWT header and payload
 * - Verifies the RSA signature against the Keycloak JWKS
 * - Validates the issuer matches the configured realm
 * - Validates the audience or authorized party matches the configured client ID
 * - Validates the token has not expired
 *
 * @param token - The raw JWT access token string
 * @returns A DecodedUser with uid (from sub claim) and optional email
 * @throws Error if the token is malformed, expired, or signature is invalid
 */
export async function verifyKeycloakToken(token: string): Promise<DecodedUser> {
  if (!token || typeof token !== 'string') {
    throw new Error('Token must be a non-empty string');
  }

  // Split the JWT into its three parts
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed JWT: expected 3 parts separated by dots');
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // Decode header
  let header: JWTHeader;
  try {
    header = JSON.parse(base64UrlDecode(headerB64));
  } catch {
    throw new Error('Malformed JWT: unable to decode header');
  }

  // Validate algorithm
  const cryptoAlg = ALG_MAP[header.alg];
  if (!cryptoAlg) {
    throw new Error(`Unsupported JWT algorithm: ${header.alg}`);
  }

  // Decode payload
  let payload: KeycloakJWTPayload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64));
  } catch {
    throw new Error('Malformed JWT: unable to decode payload');
  }

  // Validate expiry
  if (payload.exp !== undefined) {
    const nowSec = Math.floor(Date.now() / 1000);
    // Allow 30 seconds of clock skew
    if (payload.exp + 30 < nowSec) {
      throw new Error('Token has expired');
    }
  }

  // Validate issuer
  const config = getKeycloakConfig();
  if (payload.iss && payload.iss !== config.issuer) {
    throw new Error(
      `Invalid token issuer: expected "${config.issuer}", got "${payload.iss}"`
    );
  }

  // Validate audience / authorized party
  const { clientId } = getEnvConfig();
  const audiences = Array.isArray(payload.aud) ? payload.aud : payload.aud ? [payload.aud] : [];
  const hasValidAudience = audiences.includes(clientId);
  const hasValidAzp = payload.azp === clientId;

  if (!hasValidAudience && !hasValidAzp) {
    throw new Error(
      `Token not issued for this client: audience=${JSON.stringify(payload.aud)}, azp=${payload.azp}`
    );
  }

  // Fetch signing keys and verify signature
  const signingKeys = await getSigningKeys();

  let publicKey: KeyObject | undefined;

  if (header.kid) {
    publicKey = signingKeys.get(header.kid);
    if (!publicKey) {
      // Key ID not found in cache; force a refresh in case keys were rotated
      clearJWKSCache();
      const refreshedKeys = await getSigningKeys();
      publicKey = refreshedKeys.get(header.kid);
    }
  } else {
    // No kid in header; use the first available key
    const firstEntry = signingKeys.entries().next();
    if (!firstEntry.done) {
      publicKey = firstEntry.value[1];
    }
  }

  if (!publicKey) {
    throw new Error(
      `No matching signing key found${header.kid ? ` for kid="${header.kid}"` : ''}`
    );
  }

  // Verify the RSA signature
  const signatureInput = `${headerB64}.${payloadB64}`;
  const signatureBuffer = base64UrlToBuffer(signatureB64);

  const verifier = createVerify(cryptoAlg);
  verifier.update(signatureInput);
  verifier.end();

  const isValid = verifier.verify(publicKey, signatureBuffer);

  if (!isValid) {
    throw new Error('Invalid token signature');
  }

  // Ensure sub claim exists
  if (!payload.sub) {
    throw new Error('Token is missing required "sub" claim');
  }

  return {
    uid: payload.sub,
    email: payload.email,
  };
}

// ─── Token Exchange ──────────────────────────────────────────────────────────

/**
 * Exchanges an authorization code from the Keycloak OIDC flow for a set of tokens.
 * This is step 2 of the Authorization Code Flow: the backend sends the code
 * (received from the browser redirect) to Keycloak's token endpoint and receives
 * access, refresh, and ID tokens in return.
 *
 * @param code - The authorization code from the OIDC redirect
 * @param redirectUri - The redirect URI that was used in the authorization request (must match exactly)
 * @returns Token response containing access_token, refresh_token, id_token, and expires_in
 * @throws Error if the exchange fails or Keycloak returns an error response
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<TokenResponse> {
  const config = getKeycloakConfig();
  const { clientId, clientSecret } = getEnvConfig();

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
  });

  if (clientSecret) {
    params.set('client_secret', clientSecret);
  }

  let response: Response;
  try {
    response = await fetch(config.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Token exchange request failed: ${message}`);
  }

  const body = await response.json();

  if (!response.ok) {
    const errorDesc = body.error_description || body.error || 'Unknown error';
    throw new Error(`Token exchange failed (${response.status}): ${errorDesc}`);
  }

  return {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    id_token: body.id_token,
    expires_in: body.expires_in,
    refresh_expires_in: body.refresh_expires_in,
    token_type: body.token_type,
    scope: body.scope,
  };
}

// ─── Token Refresh ───────────────────────────────────────────────────────────

/**
 * Refreshes an access token using a Keycloak refresh token.
 * Sends a grant_type=refresh_token request to the token endpoint.
 *
 * @param refreshToken - The refresh token obtained from a previous token exchange or refresh
 * @returns New access_token, refresh_token (rotated), and expires_in
 * @throws Error if the refresh fails (e.g., refresh token expired or revoked)
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<RefreshTokenResponse> {
  const config = getKeycloakConfig();
  const { clientId, clientSecret } = getEnvConfig();

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
  });

  if (clientSecret) {
    params.set('client_secret', clientSecret);
  }

  let response: Response;
  try {
    response = await fetch(config.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Token refresh request failed: ${message}`);
  }

  const body = await response.json();

  if (!response.ok) {
    const errorDesc = body.error_description || body.error || 'Unknown error';
    throw new Error(`Token refresh failed (${response.status}): ${errorDesc}`);
  }

  return {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    expires_in: body.expires_in,
    refresh_expires_in: body.refresh_expires_in,
    token_type: body.token_type,
    scope: body.scope,
  };
}

// ─── User Info ───────────────────────────────────────────────────────────────

/**
 * Retrieves user information from the Keycloak userinfo endpoint.
 * Requires a valid access token with the 'openid' scope.
 *
 * @param accessToken - A valid Keycloak access token
 * @returns User info including sub, email, name, preferred_username, and realm_roles
 * @throws Error if the request fails or the token is invalid/expired
 */
export async function getKeycloakUserInfo(
  accessToken: string
): Promise<KeycloakUserInfo> {
  const config = getKeycloakConfig();

  let response: Response;
  try {
    response = await fetch(config.userinfoEndpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Userinfo request failed: ${message}`);
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Access token is invalid or expired');
    }
    throw new Error(
      `Userinfo request failed with status ${response.status}: ${response.statusText}`
    );
  }

  const body = await response.json();

  // Extract realm roles from the realm_access claim if present in the token
  // The userinfo endpoint may not include roles, so we parse them from the access token
  let realmRoles: string[] | undefined;

  // Attempt to extract roles from the access token payload directly
  try {
    const tokenParts = accessToken.split('.');
    if (tokenParts.length === 3) {
      const tokenPayload = JSON.parse(base64UrlDecode(tokenParts[1]));
      realmRoles = tokenPayload.realm_access?.roles;
    }
  } catch {
    // Roles extraction from token failed; this is non-critical
  }

  return {
    sub: body.sub,
    email: body.email,
    name: body.name,
    preferred_username: body.preferred_username,
    realm_roles: realmRoles || body.realm_access?.roles,
    email_verified: body.email_verified,
    given_name: body.given_name,
    family_name: body.family_name,
  };
}
