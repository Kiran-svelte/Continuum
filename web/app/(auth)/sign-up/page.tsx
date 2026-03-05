'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { firebaseSignUp, firebaseSignIn, getIdToken } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type Mode = 'admin' | 'employee';

const ROLES = [
  { value: 'employee', label: 'Employee' },
  { value: 'manager', label: 'Manager' },
  { value: 'hr', label: 'HR Admin' },
  { value: 'team_lead', label: 'Team Lead' },
];

export default function SignUpPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('admin');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Admin-mode fields
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  // Employee-mode fields
  const [companyCode, setCompanyCode] = useState('');
  const [role, setRole] = useState('employee');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Create Firebase auth user (or sign in if already exists)
      try {
        await firebaseSignUp(email, password);
      } catch (signUpErr: unknown) {
        const firebaseError = signUpErr as { code?: string };
        // If user already exists, try to sign in instead
        if (firebaseError.code === 'auth/email-already-in-use') {
          await firebaseSignIn(email, password);
        } else {
          throw signUpErr;
        }
      }
      
      // Get the ID token
      const idToken = await getIdToken();
      if (!idToken) {
        setError('Failed to get authentication token');
        setLoading(false);
        return;
      }

      // Set the session cookie via API
      const sessionController = new AbortController();
      const sessionTimeoutId = setTimeout(() => sessionController.abort(), 30000); // 30 second timeout
      const sessionRes = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
        signal: sessionController.signal,
      });
      clearTimeout(sessionTimeoutId);
      
      if (!sessionRes.ok) {
        const sessionData = await sessionRes.json().catch(() => ({}));
        setError(sessionData.details || sessionData.error || 'Failed to create session');
        setLoading(false);
        return;
      }

      const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      };

      // 2. Call appropriate API to create company/employee records
      if (mode === 'admin') {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            company_name: companyName,
            industry: industry || undefined,
            size: companySize || undefined,
            timezone,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const json = await res.json();
        if (!res.ok) {
          // If account already registered, redirect to dashboard
          if (res.status === 409) {
            router.push('/employee/dashboard');
            return;
          }
          setError(json.error ?? 'Registration failed');
          setLoading(false);
          return;
        }
        router.push('/onboarding');
      } else {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);
        const res = await fetch('/api/auth/join', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            company_code: companyCode,
            role,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const json = await res.json();
        if (!res.ok) {
          // If account already registered, redirect to dashboard
          if (res.status === 409) {
            router.push('/employee/dashboard');
            return;
          }
          setError(json.error ?? 'Join failed');
          setLoading(false);
          return;
        }
        router.push('/employee/dashboard');
      }
    } catch (err) {
      const firebaseErr = err as { code?: string; message?: string; name?: string };
      // Provide better error messages
      let message = firebaseErr.message || 'Registration failed';
      if (firebaseErr.name === 'AbortError') {
        message = 'Request timed out. Please check your connection and try again.';
      } else if (firebaseErr.code === 'auth/wrong-password' || firebaseErr.code === 'auth/invalid-credential') {
        message = 'This email is already registered. Please use the correct password or sign in.';
      } else if (firebaseErr.code === 'auth/weak-password') {
        message = 'Password must be at least 6 characters.';
      } else if (firebaseErr.code === 'auth/invalid-email') {
        message = 'Invalid email address.';
      } else if (firebaseErr.code === 'auth/network-request-failed') {
        message = 'Network error. Please check your internet connection and try again.';
      } else if (firebaseErr.code === 'auth/too-many-requests') {
        message = 'Too many attempts. Please try again later.';
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-blue-600">Continuum</h1>
          <p className="text-gray-500 mt-2">Create your account</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-6">
          <button
            type="button"
            onClick={() => setMode('admin')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              mode === 'admin' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Start a Company
          </button>
          <button
            type="button"
            onClick={() => setMode('employee')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              mode === 'employee' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Join a Company
          </button>
        </div>

        <Card>
          <CardContent className="pt-6">
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Shared fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Rahul"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Sharma"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="you@company.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
                <p className="text-xs text-gray-400 mt-1">Must be at least 8 characters</p>
              </div>

              {/* Admin-mode fields */}
              {mode === 'admin' && (
                <>
                  <div>
                    <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name
                    </label>
                    <input
                      id="companyName"
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="Acme Corporation"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">
                        Industry
                      </label>
                      <select
                        id="industry"
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="">Select</option>
                        <option value="technology">Technology</option>
                        <option value="finance">Finance</option>
                        <option value="healthcare">Healthcare</option>
                        <option value="manufacturing">Manufacturing</option>
                        <option value="retail">Retail</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="companySize" className="block text-sm font-medium text-gray-700 mb-1">
                        Company Size
                      </label>
                      <select
                        id="companySize"
                        value={companySize}
                        onChange={(e) => setCompanySize(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="">Select</option>
                        <option value="1-50">1–50</option>
                        <option value="51-200">51–200</option>
                        <option value="201-1000">201–1,000</option>
                        <option value="1001+">1,001+</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1">
                      Timezone
                    </label>
                    <select
                      id="timezone"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                      <option value="America/New_York">America/New_York (EST)</option>
                      <option value="Europe/London">Europe/London (GMT)</option>
                    </select>
                  </div>
                </>
              )}

              {/* Employee-mode fields */}
              {mode === 'employee' && (
                <>
                  <div>
                    <label htmlFor="companyCode" className="block text-sm font-medium text-gray-700 mb-1">
                      Company Code
                    </label>
                    <input
                      id="companyCode"
                      type="text"
                      value={companyCode}
                      onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 font-mono tracking-widest focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="e.g., A1B2C3D4"
                      required
                    />
                    <p className="text-xs text-gray-400 mt-1">Provided by your HR administrator</p>
                  </div>

                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <select
                      id="role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? 'Please wait…'
                  : mode === 'admin'
                  ? 'Create Company & Account'
                  : 'Join Company'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              Already have an account?{' '}
              <Link href="/sign-in" className="text-blue-600 hover:text-blue-700 font-medium">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

