'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, ArrowRight, Loader2, Shield, Users, CheckCircle2, Lock } from 'lucide-react';

/**
 * Sign-Up Page - Invitation Only
 * 
 * Self-registration is disabled. Users must be invited by:
 * - Super Admin (creates Company Owners)
 * - Company Owner/HR (invites employees)
 * 
 * If an invite token is present, redirect to the invite acceptance flow.
 */
export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite');

  useEffect(() => {
    // If user has an invite token, redirect to the proper invite acceptance page
    if (inviteToken) {
      router.replace(`/invite/accept/${inviteToken}`);
    }
  }, [inviteToken, router]);

  // Show loading while redirecting if invite token present
  if (inviteToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
          <p className="mt-4 text-slate-600 dark:text-slate-400">Validating your invitation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Icon */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-600/20">
            <Mail className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">
            Invitation Required
          </h1>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
            Continuum uses an invitation-based system for security. 
            Contact your company administrator to request access.
          </p>
        </div>

        {/* How it Works Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            How to Get Access
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">1</span>
              </div>
              <div>
                <h3 className="font-medium text-slate-900 dark:text-white">Request an invitation</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Contact your HR department or company admin</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">2</span>
              </div>
              <div>
                <h3 className="font-medium text-slate-900 dark:text-white">Check your email</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">You'll receive a secure invitation link</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">3</span>
              </div>
              <div>
                <h3 className="font-medium text-slate-900 dark:text-white">Set up your account</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Click the link to create your password and sign in</p>
              </div>
            </div>
          </div>
        </div>

        {/* Who Can Invite */}
        <div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-4 mb-8">
          <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
            <Users className="w-5 h-5 text-slate-500" />
            <span>
              <strong className="text-slate-700 dark:text-slate-300">Who can invite?</strong>{' '}
              Company owners, HR administrators, and managers can send invitations.
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <Link
            href="/sign-in"
            className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/30 transition-all duration-200 flex items-center justify-center gap-2"
          >
            Sign In to Existing Account
            <ArrowRight className="w-4 h-4" />
          </Link>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Need help?{' '}
            <Link href="/support" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
              Contact Support
            </Link>
          </p>
        </div>

        {/* Security Footer */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-center gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>256-bit Encryption</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>SOC 2 Compliant</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>GDPR Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
