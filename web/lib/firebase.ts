// ─── Firebase Client SDK (Browser) ─────────────────────────────────────────
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode,
  Auth,
  User,
  UserCredential,
} from 'firebase/auth';

// Firebase client configuration (public keys - safe to expose)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAsgL5EEnGjj6RDQJUEUkgTPKTv-XpOWD8',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'continuum-239d3.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'continuum-239d3',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'continuum-239d3.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '373552301041',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:373552301041:web:233df73d50dd66a2473a50',
};

// Debug: Log config on initialization (remove in production)
if (typeof window !== 'undefined') {
  console.log('Firebase Config:', {
    apiKey: firebaseConfig.apiKey ? '***' + firebaseConfig.apiKey.slice(-8) : 'MISSING',
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
  });
}

// Initialize Firebase (singleton pattern)
let app: FirebaseApp;
let auth: Auth;

function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }
  return auth;
}

// ─── Auth Helper Functions ──────────────────────────────────────────────────

export async function firebaseSignIn(email: string, password: string): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  return signInWithEmailAndPassword(auth, email, password);
}

export async function firebaseSignUp(email: string, password: string): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function firebaseSignOut(): Promise<void> {
  const auth = getFirebaseAuth();
  return signOut(auth);
}

export async function firebaseSendPasswordResetEmail(email: string): Promise<void> {
  const auth = getFirebaseAuth();
  return sendPasswordResetEmail(auth, email, {
    url: `${typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL}/sign-in`,
  });
}

export async function firebaseConfirmPasswordReset(oobCode: string, newPassword: string): Promise<void> {
  const auth = getFirebaseAuth();
  return confirmPasswordReset(auth, oobCode, newPassword);
}

export async function firebaseVerifyPasswordResetCode(oobCode: string): Promise<string> {
  const auth = getFirebaseAuth();
  return verifyPasswordResetCode(auth, oobCode);
}

export async function getCurrentUser(): Promise<User | null> {
  const auth = getFirebaseAuth();
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

export async function getIdToken(): Promise<string | null> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

export { type User, type UserCredential };
