// ─── Firebase Admin SDK (Server-side only) ─────────────────────────────────
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth, DecodedIdToken } from 'firebase-admin/auth';

// Initialize Firebase Admin (singleton pattern)
let adminApp: App;
let adminAuth: Auth;

/**
 * Normalize private key to ensure proper newline formatting.
 * Handles both escaped \n (from .env files) and actual newlines (from Vercel).
 */
function normalizePrivateKey(key: string | undefined): string | undefined {
  if (!key) return undefined;
  
  // If the key already has actual newlines (from Vercel env vars), use as-is
  if (key.includes('\n') && !key.includes('\\n')) {
    return key;
  }
  
  // Otherwise, replace escaped \n with actual newlines
  return key.replace(/\\n/g, '\n');
}

function getAdminApp(): App {
  if (!adminApp) {
    if (getApps().length === 0) {
      // Initialize with service account credentials
      const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);
      const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
      
      if (!privateKey || !projectId || !clientEmail) {
        console.error('[FIREBASE ADMIN] Missing credentials:', {
          hasProjectId: !!projectId,
          hasClientEmail: !!clientEmail,
          hasPrivateKey: !!privateKey,
          privateKeyPreview: privateKey ? privateKey.substring(0, 50) + '...' : 'MISSING',
        });
        throw new Error('Firebase Admin SDK credentials not configured');
      }
      
      const serviceAccount = {
        projectId: projectId,
        privateKey: privateKey,
        clientEmail: clientEmail,
      };

      adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: projectId,
      });
    } else {
      adminApp = getApps()[0];
    }
  }
  return adminApp;
}

export function getAdminAuth(): Auth {
  if (!adminAuth) {
    adminAuth = getAuth(getAdminApp());
  }
  return adminAuth;
}

/**
 * Verifies a Firebase ID token and returns the decoded token
 */
export async function verifyIdToken(idToken: string): Promise<DecodedIdToken> {
  const auth = getAdminAuth();
  return auth.verifyIdToken(idToken);
}

/**
 * Gets user by UID from Firebase Admin
 */
export async function getUser(uid: string) {
  const auth = getAdminAuth();
  return auth.getUser(uid);
}

/**
 * Gets user by email from Firebase Admin
 */
export async function getUserByEmail(email: string) {
  const auth = getAdminAuth();
  return auth.getUserByEmail(email);
}

/**
 * Creates a custom token for a user
 */
export async function createCustomToken(uid: string, claims?: Record<string, unknown>): Promise<string> {
  const auth = getAdminAuth();
  return auth.createCustomToken(uid, claims);
}

/**
 * Sets custom claims on a user
 */
export async function setCustomUserClaims(uid: string, claims: Record<string, unknown>): Promise<void> {
  const auth = getAdminAuth();
  return auth.setCustomUserClaims(uid, claims);
}

export { type DecodedIdToken };
