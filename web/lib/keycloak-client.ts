'use client';

// ─── Keycloak Client (Browser) ─────────────────────────────────────────────
// Lightweight OIDC client for Keycloak authentication.
// No keycloak-js dependency -- we construct OIDC URLs manually and rely on
// cookie-based token storage set by the server callback route.
// ────────────────────────────────────────────────────────────────────────────

// ─── Configuration ──────────────────────────────────────────────────────────

// Read from NEXT_PUBLIC_ env vars (client-accessible)
const KEYCLOAK_URL = process.env.NEXT_PUBLIC_KEYCLOAK_URL || '';
const KEYCLOAK_REALM = process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'continuum';
const KEYCLOAK_CLIENT_ID = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'continuum-web';
const KEYCLOAK_ENABLED = process.env.NEXT_PUBLIC_KEYCLOAK_ENABLED === 'true';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Base URL for the Keycloak realm OIDC endpoints.
 * e.g. `https://auth.example.com/realms/continuum/protocol/openid-connect`
 */
function oidcBaseUrl(): string {
  return `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect`;
}

/**
 * Generate a cryptographically random string suitable for use as an OAuth
 * state / CSRF parameter.  Falls back to `Math.random` when the Web Crypto
 * API is unavailable (e.g. SSR safety).
 */
function generateState(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(24);
    crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback (should not happen in modern browsers)
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Read a named cookie value from `document.cookie`.
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Decode the payload segment of a JWT without signature verification.
 * Only used client-side for non-security-critical expiry checks.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Base64url -> Base64
    let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    // Pad to a multiple of 4
    while (payload.length % 4 !== 0) {
      payload += '=';
    }

    const decoded = atob(payload);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Resolve the application origin for building redirect URIs.
 */
function getOrigin(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || '';
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Returns `true` when the Keycloak client integration is enabled and
 * minimally configured (URL + realm + client ID).
 */
export function isKeycloakClientEnabled(): boolean {
  return KEYCLOAK_ENABLED && KEYCLOAK_URL.length > 0;
}

/**
 * Construct the Keycloak OIDC Authorization endpoint URL for sign-in.
 *
 * @param redirectUri - Where Keycloak should redirect after login.
 *   Defaults to `{origin}/api/auth/keycloak/callback`.
 * @returns The fully-formed authorization URL.
 */
export function getKeycloakLoginUrl(redirectUri?: string): string {
  if (!isKeycloakClientEnabled()) {
    console.warn('[keycloak-client] Keycloak is not enabled or configured.');
    return '';
  }

  const redirect = redirectUri || `${getOrigin()}/api/auth/keycloak/callback`;
  const state = generateState();

  // Persist state in sessionStorage so the callback can verify it (CSRF protection)
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('kc-oauth-state', state);
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: KEYCLOAK_CLIENT_ID,
    redirect_uri: redirect,
    scope: 'openid email profile',
    state,
  });

  return `${oidcBaseUrl()}/auth?${params.toString()}`;
}

/**
 * Construct the Keycloak OIDC Authorization endpoint URL for registration.
 *
 * Uses `kc_action=register` as the Keycloak hint to present the
 * registration form instead of the login form.
 *
 * @param redirectUri - Post-registration redirect target.
 *   Defaults to `{origin}/api/auth/keycloak/callback`.
 * @returns The fully-formed registration URL.
 */
export function getKeycloakRegisterUrl(redirectUri?: string): string {
  if (!isKeycloakClientEnabled()) {
    console.warn('[keycloak-client] Keycloak is not enabled or configured.');
    return '';
  }

  const redirect = redirectUri || `${getOrigin()}/api/auth/keycloak/callback`;
  const state = generateState();

  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('kc-oauth-state', state);
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: KEYCLOAK_CLIENT_ID,
    redirect_uri: redirect,
    scope: 'openid email profile',
    state,
    kc_action: 'register',
  });

  return `${oidcBaseUrl()}/auth?${params.toString()}`;
}

/**
 * Construct the Keycloak OIDC end-session (logout) URL.
 *
 * @param redirectUri - Where to send the user after logout.
 *   Defaults to the application root (`/`).
 * @returns The fully-formed logout URL.
 */
export function getKeycloakLogoutUrl(redirectUri?: string): string {
  if (!isKeycloakClientEnabled()) {
    console.warn('[keycloak-client] Keycloak is not enabled or configured.');
    return '';
  }

  const redirect = redirectUri || `${getOrigin()}/`;

  const params = new URLSearchParams({
    post_logout_redirect_uri: redirect,
    client_id: KEYCLOAK_CLIENT_ID,
  });

  return `${oidcBaseUrl()}/logout?${params.toString()}`;
}

/**
 * Redirect the browser to the Keycloak login page.
 *
 * This is the primary entry point for initiating the OIDC Authorization
 * Code flow for sign-in.
 */
export function keycloakSignIn(): void {
  const url = getKeycloakLoginUrl();
  if (!url) {
    throw new Error('[keycloak-client] Cannot sign in: Keycloak is not configured.');
  }
  window.location.href = url;
}

/**
 * Redirect the browser to the Keycloak registration page.
 *
 * Uses the same OIDC Authorization Code flow as sign-in but with the
 * `kc_action=register` hint so Keycloak shows the registration form.
 */
export function keycloakSignUp(): void {
  const url = getKeycloakRegisterUrl();
  if (!url) {
    throw new Error('[keycloak-client] Cannot sign up: Keycloak is not configured.');
  }
  window.location.href = url;
}

/**
 * Sign out of Keycloak.
 *
 * 1. Calls the local `/api/auth/keycloak/logout` endpoint to clear
 *    server-managed cookies (`kc-access-token`, `kc-refresh-token`).
 * 2. Redirects the browser to the Keycloak end-session endpoint so the
 *    Keycloak SSO session is also terminated.
 */
export async function keycloakSignOut(): Promise<void> {
  // Clear local session cookies via the server route
  try {
    await fetch('/api/auth/keycloak/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch (err) {
    console.warn('[keycloak-client] Failed to call local logout endpoint:', err);
  }

  // Clear sessionStorage state
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem('kc-oauth-state');
  }

  // Redirect to Keycloak end-session endpoint
  const logoutUrl = getKeycloakLogoutUrl();
  if (logoutUrl) {
    window.location.href = logoutUrl;
  } else {
    // Fallback: just redirect to the home page if Keycloak is not configured
    window.location.href = '/';
  }
}

/**
 * Read the Keycloak access token from the `kc-access-token` cookie.
 *
 * This cookie is set as a client-readable (non-httpOnly) cookie by the
 * server callback route so that client-side code can attach it to API
 * requests or inspect its claims.
 *
 * @returns The raw JWT string, or `null` if no token cookie is present.
 */
export function getKeycloakToken(): string | null {
  if (!isKeycloakClientEnabled()) return null;
  return getCookie('kc-access-token');
}

/**
 * Check whether the user currently has a valid (non-expired) Keycloak
 * access token.
 *
 * The check decodes the JWT payload and compares `exp` against the current
 * time.  No cryptographic verification is performed -- that is the
 * server's responsibility.
 *
 * @returns `true` if a `kc-access-token` cookie exists and has not expired.
 */
export function isKeycloakAuthenticated(): boolean {
  const token = getKeycloakToken();
  if (!token) return false;

  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return false;

  // `exp` is in seconds; Date.now() is in milliseconds
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return payload.exp > nowInSeconds;
}

/**
 * Return the Keycloak Account Management URL for password change.
 *
 * This links the user directly to the "Signing In" security section of
 * the Keycloak account console where they can update their password.
 *
 * @returns The account management URL, or an empty string if Keycloak is
 *   not configured.
 */
export function getKeycloakPasswordResetUrl(): string {
  if (!isKeycloakClientEnabled()) {
    console.warn('[keycloak-client] Keycloak is not enabled or configured.');
    return '';
  }

  return `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/account/#/security/signingin`;
}
