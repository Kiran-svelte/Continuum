'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseSignIn } from '@/lib/supabase';
import { Zap, CheckCircle, Building2, Users, Check, X, Mail, ArrowRight, ShieldCheck, TrendingUp, Sparkles } from 'lucide-react';
import { validatePassword, getPasswordRequirements } from '@/lib/password-validation';
import { AmbientBackground, TiltCard, FadeIn, GlowCard, MagneticButton, StaggerContainer, ScrollReveal } from '@/components/motion';

type Mode = 'select' | 'admin' | 'employee';

interface InviteData {
  email: string;
  role: string;
  department: string | null;
  company_name: string;
  company_join_code: string | null;
}

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const [mode, setMode] = useState<Mode>(inviteToken ? 'employee' : 'select');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [companyCodeValid, setCompanyCodeValid] = useState<boolean | null>(null);
  const [companyCodeName, setCompanyCodeName] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [inviteError, setInviteError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const meRes = await fetch('/api/auth/me', { credentials: 'include' });
        if (meRes.ok) {
          router.replace('/onboarding');
          return;
        }
      } catch { } finally {
        setCheckingAuth(false);
      }
    })();
  }, [router]);

  useEffect(() => {
    if (!inviteToken) return;
    (async () => {
      try {
        const res = await fetch(`/api/auth/invite?token=${encodeURIComponent(inviteToken)}`);
        if (!res.ok) {
          setInviteError('Invalid or expired invite link');
          return;
        }
        const data = await res.json();
        if (data.valid && data.invite) {
          setInviteData(data.invite);
          setEmail(data.invite.email);
          if (data.invite.company_join_code) {
            setCompanyCode(data.invite.company_join_code);
            setCompanyCodeValid(true);
            setCompanyCodeName(data.invite.company_name);
          }
          setMode('employee');
        }
      } catch {
        setInviteError('Failed to validate invite. Please try again.');
      }
    })();
  }, [inviteToken]);

  async function createSession(accessToken: string): Promise<boolean> {
    try {
      const sessionRes = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken }),
      });
      return sessionRes.ok;
    } catch { return false; }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) { setError(passwordValidation.errors[0]); return; }
    setLoading(true);

    try {
      if (mode === 'employee') {
        const codeRes = await fetch(`/api/company/validate-code?code=${encodeURIComponent(companyCode)}`);
        const codeData = await codeRes.json().catch(() => ({ valid: false }));
        if (!codeData.valid) {
          setError('Invalid company code.');
          setCompanyCodeValid(false);
          setLoading(false);
          return;
        }
      }

      const intent = mode === 'admin' ? 'hr' : 'employee';
      const inviteParam = inviteToken ? `&invite=${encodeURIComponent(inviteToken)}` : '';
      const onboardingUrl = `/onboarding?intent=${intent}&firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}${mode === 'employee' ? `&companyCode=${encodeURIComponent(companyCode)}` : ''}${inviteParam}`;

      const signupRes = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName }),
      });
      const signupData = await signupRes.json();

      if (!signupRes.ok) {
        if (signupData.code === 'USER_EXISTS') {
          const { data: signInData, error: signInError } = await supabaseSignIn(email, password);
          if (!signInError && signInData.session) {
            await createSession(signInData.session.access_token);
            router.push(onboardingUrl);
            return;
          }
          setError('This email is already registered.');
          setLoading(false);
          return;
        }
        setError(signupData.error || 'Registration failed.');
        setLoading(false);
        return;
      }

      if (signupData.emailConfirmationRequired) { setSuccess(true); setLoading(false); return; }

      const { data: signInData, error: signInError } = await supabaseSignIn(email, password);
      if (signInError || !signInData.session) { setSuccess(true); setLoading(false); return; }
      await createSession(signInData.session.access_token);
      router.push(onboardingUrl);
    } catch (err) {
      setError('Registration failed. Please try again.');
    } finally { setLoading(false); }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(34,211,238,0.4)]" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <AmbientBackground />
        <FadeIn className="w-full max-w-md text-center z-20">
          <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.1)]">
            <CheckCircle className="w-12 h-12 text-emerald-400 animate-bounce" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-4">Account Verified</h1>
          <p className="text-white/40 mb-10 font-bold uppercase tracking-widest text-xs">Access protocols established for {email}</p>
          <MagneticButton variant="gradient" size="lg" onClick={() => router.push('/sign-in')} className="w-full">
            Proceed to Command Center
          </MagneticButton>
        </FadeIn>
      </div>
    );
  }

  if (mode === 'select') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-black overflow-hidden">
        <AmbientBackground />
        <FadeIn className="w-full max-w-4xl z-20">
          <div className="text-center mb-16">
            <div className="w-20 h-20 mx-auto mb-8 rounded-3xl bg-primary/20 border border-primary/30 flex items-center justify-center shadow-[0_0_30px_rgba(0,255,255,0.2)]">
              <Zap className="w-10 h-10 text-primary animate-pulse" />
            </div>
            <h1 className="text-6xl font-black text-white tracking-tightest mb-4">Initialize Continuum</h1>
            <p className="text-white/30 text-xl font-bold uppercase tracking-[0.2em]">Select your operational deployment</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <TiltCard>
              <GlowCard className="p-10 h-full group" color="#06B6D4">
                <button onClick={() => setMode('admin')} className="w-full text-left h-full flex flex-col items-start">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-10 border border-white/10 group-hover:scale-110 transition-transform group-hover:bg-primary/20">
                    <Building2 className="w-8 h-8 text-white group-hover:text-primary transition-colors" />
                  </div>
                  <h3 className="text-3xl font-black text-white mb-4 tracking-tighter">Command HQ</h3>
                  <p className="text-white/40 font-medium mb-10 flex-grow leading-relaxed">
                    Initialize a company workspace, manage personnel, and set organizational protocols.
                  </p>
                  <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs group-hover:translate-x-2 transition-transform">
                    Start Company <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              </GlowCard>
            </TiltCard>

            <TiltCard>
              <GlowCard className="p-10 h-full group" color="#A855F7">
                <button onClick={() => setMode('employee')} className="w-full text-left h-full flex flex-col items-start">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-10 border border-white/10 group-hover:scale-110 transition-transform group-hover:bg-purple-500/20">
                    <Users className="w-8 h-8 text-white group-hover:text-purple-400 transition-colors" />
                  </div>
                  <h3 className="text-3xl font-black text-white mb-4 tracking-tighter">Field Intelligence</h3>
                  <p className="text-white/40 font-medium mb-10 flex-grow leading-relaxed">
                    Join an existing unit using a join-code or invite link from your organization.
                  </p>
                  <div className="flex items-center gap-2 text-purple-400 font-black uppercase tracking-widest text-xs group-hover:translate-x-2 transition-transform">
                    Join Pipeline <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              </GlowCard>
            </TiltCard>
          </div>

          <div className="mt-16 text-center">
            <p className="text-white/20 font-black uppercase tracking-widest text-xs">
              Already Active?{' '}
              <Link href="/sign-in" className="text-primary hover:text-white transition-colors">Authorize Sync</Link>
            </p>
          </div>
        </FadeIn>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-black overflow-hidden">
      <AmbientBackground />
      <FadeIn className="w-full max-w-md mt-10 mb-10 z-20" direction="up">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-6 border border-primary/20 shadow-[0_0_20px_rgba(0,255,255,0.1)]">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2">New Operative</h1>
          <p className="text-white/20 font-black uppercase tracking-widest text-[10px]">Configuring {mode} access parameters</p>
        </div>

        <TiltCard>
          <GlowCard className="p-8 pb-10" color={mode === 'admin' ? '#06B6D4' : '#A855F7'}>
            <form onSubmit={handleSubmit} className="space-y-6">
              {inviteData && (
                <div className="p-5 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-start gap-4">
                  <Mail className="w-5 h-5 text-blue-400 mt-1 shrink-0" />
                  <div className="text-xs">
                    <p className="font-black text-white uppercase tracking-tighter mb-1">Invite Validated</p>
                    <p className="text-blue-200/60 font-medium leading-relaxed">Assigned to: {inviteData.company_name}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">First Name</label>
                  <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl text-white font-medium focus:ring-2 focus:ring-primary/50 transition-all" placeholder="John" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Last Name</label>
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl text-white font-medium focus:ring-2 focus:ring-primary/50 transition-all" placeholder="Doe" required />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Neural ID (Email)</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={!!inviteData} className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl text-white font-medium focus:ring-2 focus:ring-primary/50 transition-all disabled:opacity-40" placeholder="name@enterprise.com" required />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Access Protocol (Password)</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl text-white font-medium focus:ring-2 focus:ring-primary/50 transition-all" placeholder="••••••••" required />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Confirm Protocol</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl text-white font-medium focus:ring-2 focus:ring-primary/50 transition-all" placeholder="••••••••" required />
              </div>

              {mode === 'employee' && !inviteToken && (
                <div className="space-y-2 p-4 bg-purple-500/5 rounded-2xl border border-purple-500/10">
                  <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest ml-1">Company Join Code</label>
                  <input type="text" value={companyCode} onChange={e => setCompanyCode(e.target.value.toUpperCase())} className="w-full h-12 px-4 bg-white/5 border border-purple-500/20 rounded-xl text-white font-black text-center tracking-widest text-lg focus:ring-2 focus:ring-purple-500/50" placeholder="H3X-SYNC" required maxLength={8} />
                  {companyCodeValid === true && <p className="text-[10px] text-emerald-500 font-black uppercase text-center mt-2 italic">Signal Found: {companyCodeName}</p>}
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                  <p className="text-[10px] text-red-400 font-black uppercase tracking-tighter text-center">{error}</p>
                </div>
              )}

              <MagneticButton disabled={loading} variant="gradient" className="w-full h-14 !rounded-2xl shadow-[0_20px_40px_rgba(0,255,255,0.1)] !font-black !uppercase !tracking-widest">
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Establish Baseline Sync'}
              </MagneticButton>
            </form>
          </GlowCard>
        </TiltCard>

        <div className="mt-10 text-center space-y-4">
          <button onClick={() => setMode('select')} className="text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white transition-colors">Change Ops Mode</button>
          <p className="text-[10px] text-white/10 font-black uppercase tracking-[0.2em]">End-to-End Encrypted Handshake</p>
        </div>
      </FadeIn>
    </div>
  );
}
