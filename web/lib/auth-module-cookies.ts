import type { NextResponse } from 'next/server';
import {
  COOKIE_COMPANY_SETUP,
  COOKIE_ENABLED_MODULES,
} from '@/lib/brand';
import type { AuthModulePayload } from '@/lib/core-functions/types';

const cookieOpts = {
  path: '/',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 24,
  httpOnly: true,
};

/** Edge-readable module list for middleware path guards. */
export function setModuleHintCookies(
  response: NextResponse,
  modulePayload: AuthModulePayload,
  companyOnboardingCompleted: boolean
): void {
  const enabledModules = modulePayload.enabledModules.includes('employees')
    ? modulePayload.enabledModules
    : (['employees', ...modulePayload.enabledModules] as AuthModulePayload['enabledModules']);
  response.cookies.set(
    COOKIE_ENABLED_MODULES,
    enabledModules.join(','),
    cookieOpts
  );
  response.cookies.set(
    COOKIE_COMPANY_SETUP,
    companyOnboardingCompleted ? '1' : '0',
    cookieOpts
  );
}
