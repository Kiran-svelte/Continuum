import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { getAuthSecretKey } from '@/lib/auth-secret';

const PASSWORD_RESET_EXPIRY = '1h';

interface PasswordResetPayload extends JWTPayload {
  sub: string;
  email: string;
  type: 'password_reset';
}

function getSecret(): Uint8Array {
  return getAuthSecretKey();
}

export async function createPasswordResetToken(employeeId: string, email: string): Promise<string> {
  const secret = getSecret();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  return new SignJWT({
    sub: employeeId,
    email,
    type: 'password_reset',
  } as PasswordResetPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
      .setExpirationTime(expiresAt)
    .setIssuer('continuum')
    .setAudience('continuum-password-reset')
    .sign(secret);
}

export async function verifyPasswordResetToken(token: string): Promise<PasswordResetPayload> {
  const secret = getSecret();
  const { payload } = await jwtVerify(token, secret, {
    issuer: 'continuum',
    audience: 'continuum-password-reset',
  });

  if (!payload.sub || !payload.email || payload.type !== 'password_reset') {
    throw new Error('Invalid password reset token');
  }

  return payload as PasswordResetPayload;
}
