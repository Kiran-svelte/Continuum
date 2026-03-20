'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, Mail, AlertCircle, Loader2, Eye, EyeOff, AlertTriangle, Server, Database, Users } from 'lucide-react';

/**
 * Super Admin Login Page - Apex Dark UI
 * Enterprise-grade design with security focus
 */
export default function SuperAdminLoginPage() {
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
    } catch (err) {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Admin Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-[var(--accent)] rounded-full blur-3xl" />
        </div>
        
        {/* Content */}
        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-white">Continuum</span>
              <span className="block text-xs text-amber-400 font-medium uppercase tracking-wider">Platform Admin</span>
            </div>
          </div>
          
          {/* Headline */}
          <div className="mt-20">
            <h1 className="text-4xl font-bold text-white leading-tight">
              Platform Administration Console
            </h1>
            <p className="mt-4 text-lg text-slate-400 leading-relaxed max-w-md">
              Manage companies, users, system settings, and platform-wide configurations from a centralized control panel.
            </p>
          </div>
        </div>

        {/* Admin Features */}
        <div className="relative z-10 space-y-4">
          <div className="flex items-start gap-4 bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">User Management</h3>
              <p className="text-sm text-slate-400">Create and manage company owners, set permissions</p>
            </div>
          </div>

          <div className="flex items-start gap-4 bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Database className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">System Health</h3>
              <p className="text-sm text-slate-400">Monitor platform performance and audit logs</p>
            </div>
          </div>

          <div className="flex items-start gap-4 bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Server className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Platform Configuration</h3>
              <p className="text-sm text-slate-400">Global settings, feature flags, and maintenance</p>
            </div>
          </div>
        </div>

        {/* Security badges */}
        <div className="relative z-10 flex items-center gap-6 pt-8 border-t border-white/20">
          <div className="flex items-center gap-2 text-white/80">
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">Platform Level Access</span>
          </div>
          <div className="flex items-center gap-2 text-white/80">
            <Lock className="w-4 h-4" />
            <span className="text-sm font-medium">Encrypted Auth</span>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col">
        {/* Security Warning */}
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b border-amber-500/20 p-4">
          <div className="flex items-center gap-3 max-w-md mx-auto">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-400">Platform Administration Access</p>
              <p className="text-xs text-amber-500/80">This area is restricted to authorized super administrators only</p>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-10">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-h2 text-primary">Platform Admin</h1>
            </div>

            {/* Welcome Text */}
            <div className="mb-8">
              <h2 className="text-h1 text-amber-500">Administrator Login</h2>
              <p className="text-body mt-1">Enter your super admin credentials</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-[var(--danger-bg)] border border-[var(--danger-border)] flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[var(--danger)] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-[var(--danger)]">Authentication failed</p>
                  <p className="text-sm text-[var(--danger)] mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="input-group">
                <label className="input-label">Super Admin Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted" />
                  <input
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

              <div className="input-group">
                <label className="input-label">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pl-11 pr-11"
                    placeholder="Enter your password"
                    required
                    disabled={loading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted hover:text-primary transition-colors"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-block btn-lg"
                style={{ 
                  background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
                  borderColor: 'transparent'
                }}
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
              </button>
            </form>

            {/* Security Notice */}
            <div className="mt-8">
              <div className="p-4 rounded-xl bg-[var(--warning-bg)] border border-[var(--warning-border)]">
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-[var(--warning)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--warning)]">Security Notice</p>
                    <p className="text-sm text-[var(--warning)] mt-1">
                      This is a restricted area. All actions are logged and monitored. 
                      Unauthorized access attempts will be reported.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-8">
              <p className="text-xs text-disabled">
                Need help? Contact platform support or your system administrator.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
