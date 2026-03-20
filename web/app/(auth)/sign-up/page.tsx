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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[var(--accent)] animate-spin mx-auto" />
          <p className="mt-4 text-secondary">Validating your invitation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Icon */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#6C63FF] to-[#4A90E2] flex items-center justify-center shadow-lg shadow-[#6C63FF]/20">
            <Mail className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-h1 mb-3">
            Invitation Required
          </h1>
          <p className="text-body leading-relaxed max-w-md mx-auto">
            Continuum uses an invitation-based system for security. 
            Contact your company administrator to request access.
          </p>
        </div>

        {/* How it Works Card */}
        <div className="card mb-6">
          <h2 className="text-h4 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-[var(--accent)]" />
            How to Get Access
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-[var(--accent-bg)] border border-[var(--accent-border)] flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-[var(--accent)]">1</span>
              </div>
              <div>
                <h3 className="text-h4">Request an invitation</h3>
                <p className="text-sm text-muted">Contact your HR department or company admin</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-[var(--accent-bg)] border border-[var(--accent-border)] flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-[var(--accent)]">2</span>
              </div>
              <div>
                <h3 className="text-h4">Check your email</h3>
                <p className="text-sm text-muted">You'll receive a secure invitation link</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-[var(--accent-bg)] border border-[var(--accent-border)] flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-[var(--accent)]">3</span>
              </div>
              <div>
                <h3 className="text-h4">Set up your account</h3>
                <p className="text-sm text-muted">Click the link to create your password and sign in</p>
              </div>
            </div>
          </div>
        </div>

        {/* Who Can Invite */}
        <div className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl p-4 mb-8">
          <div className="flex items-center gap-3 text-sm text-secondary">
            <Users className="w-4 h-4" />
            <span className="font-medium">Who can send invitations:</span>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3 text-[var(--success)]" />
              Super Administrators (Platform Level)
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3 text-[var(--success)]" />
              Company Administrators & HR Teams
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3 text-[var(--success)]" />
              Authorized Managers (Company Level)
            </li>
          </ul>
        </div>

        {/* Security Notice */}
        <div className="bg-[var(--info-bg)] border border-[var(--info-border)] rounded-xl p-4 mb-8">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-[var(--info)] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-[var(--info)]">Secure by Design</h3>
              <p className="text-sm text-[var(--info)] mt-1 leading-relaxed">
                Our invitation-only system ensures that only authorized personnel can access your organization's data. 
                All invitations are encrypted and expire automatically.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link 
            href="/sign-in" 
            className="btn btn-primary flex-1 justify-center"
          >
            Already have an account?
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link 
            href="/support" 
            className="btn btn-outline flex-1 justify-center"
          >
            Contact Support
          </Link>
        </div>

        {/* Footer note */}
        <div className="text-center mt-8">
          <p className="text-xs text-disabled">
            For technical issues, contact your IT administrator or reach out to our support team.
          </p>
        </div>
      </div>
    </div>
  );
}