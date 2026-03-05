// ─── Firebase Admin SDK (Server-side only) ─────────────────────────────────
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth, DecodedIdToken } from 'firebase-admin/auth';

// Initialize Firebase Admin (singleton pattern)
let adminApp: App;
let adminAuth: Auth;

function getAdminApp(): App {
  if (!adminApp) {
    if (getApps().length === 0) {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

      if (!projectId || !privateKey || !clientEmail) {
        throw new Error(
          'Firebase Admin SDK credentials are not configured. ' +
          'Set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL environment variables.'
        );
      }

      // Initialize with service account credentials
      adminApp = initializeApp({
        credential: cert({ projectId, privateKey, clientEmail }),
        projectId,
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
