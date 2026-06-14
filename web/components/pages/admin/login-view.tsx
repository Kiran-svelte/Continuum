'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, Mail, AlertCircle, Loader2, Eye, EyeOff, AlertTriangle, Server, Database, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Super Admin Login Page - Apex Dark UI
 * Enterprise-grade design with security focus
 */
export default function LoginView() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          is_super_admin: true,
        }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      // Call /api/auth/me to set role cookies for middleware
      await fetch('/api/auth/me', { credentials: 'include' });

      router.push('/super-admin/dashboard');
    } catch {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] relative overflow-hidden">
      <div className="ambient-glow" />

      <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
        <aside className="hidden lg:flex flex-col justify-between p-12 border-r border-[var(--border)] bg-[var(--card)]/60 backdrop-blur-sm">
          <div className="space-y-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/10 border border-[var(--border)] flex items-center justify-center text-[var(--primary)] shadow-sm">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xl font-semibold">Continuum</span>
                <span className="block text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Platform Admin</span>
              </div>
            </div>

            <div className="max-w-xl space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                Restricted access
              </span>
              <h1 className="text-display leading-[1.05]">Platform administration, without the noise.</h1>
              <p className="text-body text-base max-w-lg">
                Manage companies, users, system settings, and audit posture from one calm control surface.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="card p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><Users className="w-5 h-5" /></div>
              <div>
                <h3 className="font-semibold">User Management</h3>
                <p className="text-sm text-muted-foreground">Create and manage company owners, set permissions.</p>
              </div>
            </div>
            <div className="card p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><Database className="w-5 h-5" /></div>
              <div>
                <h3 className="font-semibold">System Health</h3>
                <p className="text-sm text-muted-foreground">Monitor platform performance and audit logs.</p>
              </div>
            </div>
            <div className="card p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><Server className="w-5 h-5" /></div>
              <div>
                <h3 className="font-semibold">Platform Configuration</h3>
                <p className="text-sm text-muted-foreground">Global settings, feature flags, and maintenance.</p>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md space-y-8">
            <div className="lg:hidden flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/10 border border-[var(--border)] flex items-center justify-center text-[var(--primary)] shadow-sm">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xl font-semibold">Continuum</span>
                <span className="block text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Platform Admin</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5" /> Restricted area
              </span>
              <h2 className="text-h1">Administrator login</h2>
              <p className="text-body">Enter your super admin credentials.</p>
            </div>

            {error && (
              <div className="card border-destructive/20 bg-destructive/5 p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">Authentication failed</p>
                  <p className="text-sm text-destructive mt-1">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 card p-6 sm:p-8 shadow-lg">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Super Admin Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input pl-11"
                    placeholder="admin@platform.com"
                    required
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pl-11 pr-11"
                    placeholder="Enter your password"
                    required
                    disabled={loading}
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    variant="ghost"
                    size="sm"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full h-12 font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    Sign In to Platform
                  </>
                )}
              </Button>
            </form>

            <div className="card p-4 border-amber-500/20 bg-amber-500/5">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-amber-600 dark:text-amber-300 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Security Notice</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    This is a restricted area. All actions are logged and monitored.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">Need help? Contact platform support or your system administrator.</p>
          </div>
        </main>
      </div>
    </div>
  );
}

