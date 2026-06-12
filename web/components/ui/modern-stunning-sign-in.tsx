"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Lock, Mail, ArrowRight, Loader2 } from "lucide-react"
import { isDemoAuthEnabled } from "@/lib/auth-routing"
import { resolvePostSignInPath } from '@/lib/post-sign-in-routing'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AuthShell } from "@/components/design-system"
import type { ModuleSlug } from "@/lib/core-functions/catalog"

const SIGN_IN_MESSAGES = [
  'Signing in...',
  'Verifying credentials...',
  'Loading your workspace...',
  'Almost there...',
];

const MESSAGE_INTERVAL_MS = 5_500;
const VERIFICATION_POLL_MS = 4_000;

type SignInMeResponse = {
  primary_role?: string
  secondary_roles?: string[] | null
  status?: string
  org_id?: string | null
  email?: string
  company?: { onboarding_completed?: boolean } | null
  employee_onboarding_completed?: boolean
  employee_welcome_pending?: boolean
  enabledModules?: ModuleSlug[]
  email_verification?: { verified?: boolean; required?: boolean }
}

function canSendLocalDebugIngest(): boolean {
  return typeof window !== 'undefined' && (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost');
}

function sendLocalDebugIngest(location: string, message: string, data?: Record<string, unknown>) {
  if (!canSendLocalDebugIngest()) {
    return;
  }

  // #region agent log
  fetch('http://127.0.0.1:7577/ingest/ec7a1340-542e-4274-b841-908eaf79e631',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4c3985'},body:JSON.stringify({sessionId:'4c3985',location,message,data,timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
}

export const SignIn1 = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTarget = searchParams?.get("redirect") ?? null
  const demoAuthEnabled = isDemoAuthEnabled()

  const [identifier, setIdentifier] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState("")
  const [info, setInfo] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [progressMessage, setProgressMessage] = React.useState(SIGN_IN_MESSAGES[0])
  const [verificationPending, setVerificationPending] = React.useState(false)
  const [verificationEmail, setVerificationEmail] = React.useState("")
  const [verificationSending, setVerificationSending] = React.useState(false)
  const [verificationSent, setVerificationSent] = React.useState(false)
  const [awaitingVerification, setAwaitingVerification] = React.useState(false)
  const messageIndexRef = React.useRef(0)
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null)
  const verificationPollRef = React.useRef<ReturnType<typeof setInterval> | null>(null)
  const processedVerifyTokenRef = React.useRef<string | null>(null)

  function startProgressMessages() {
    messageIndexRef.current = 0
    setProgressMessage(SIGN_IN_MESSAGES[0])
    timerRef.current = setInterval(() => {
      messageIndexRef.current = (messageIndexRef.current + 1) % SIGN_IN_MESSAGES.length
      setProgressMessage(SIGN_IN_MESSAGES[messageIndexRef.current])
    }, MESSAGE_INTERVAL_MS)
  }

  function stopProgressMessages() {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  function stopVerificationPoll() {
    if (verificationPollRef.current) {
      clearInterval(verificationPollRef.current)
      verificationPollRef.current = null
    }
  }

  React.useEffect(() => () => {
    stopProgressMessages()
    stopVerificationPoll()
  }, [])

  const completeSignInNavigation = React.useCallback(async (me: SignInMeResponse, signedInEmail: string) => {
    const primaryRole = (me.primary_role || '').toLowerCase()
    let destination = resolvePostSignInPath(me, { redirectTarget })
    if (demoAuthEnabled && signedInEmail === 'super@demo.continuum.io') {
      destination = '/super-admin/dashboard'
    }

    sendLocalDebugIngest('modern-stunning-sign-in.tsx:navigate', 'router.push success path', {
      destination,
      primaryRole,
    })
    router.push(destination)
  }, [demoAuthEnabled, redirectTarget, router])

  const verificationCredentialBody = React.useCallback(
    () =>
      JSON.stringify({
        identifier: verificationEmail || identifier,
        password,
      }),
    [identifier, password, verificationEmail]
  )

  const checkVerificationAndContinue = React.useCallback(async () => {
    const statusRes = await fetch('/api/auth/email-verification/status', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: verificationCredentialBody(),
    })
    if (statusRes.status === 401) {
      setError('Could not check verification status. Click Verify now again with your password.')
      return false
    }
    if (!statusRes.ok) return false

    const status = (await statusRes.json()) as { verified?: boolean }
    if (!status.verified) return false

    stopVerificationPoll()
    setVerificationPending(false)
    setVerificationSent(false)
    setAwaitingVerification(false)
    setError('')
    setInfo('Email verified! Opening your workspace...')

    const meRes = await fetch('/api/auth/me', { credentials: 'include' })
    if (!meRes.ok) {
      window.location.reload()
      return true
    }

    const me = (await meRes.json()) as SignInMeResponse
    const signedInEmail = (me.email || verificationEmail || identifier).trim().toLowerCase()
    await completeSignInNavigation(me, signedInEmail)
    return true
  }, [completeSignInNavigation, identifier, verificationEmail, verificationCredentialBody, password])

  const sendVerificationEmail = React.useCallback(async () => {
    setVerificationSending(true)
    setError('')
    try {
      const res = await fetch('/api/auth/email-verification/send', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: verificationCredentialBody(),
      })
      const payload = ((await res.json().catch(() => null)) ?? {}) as { error?: string; message?: string }

      if (!res.ok) {
        setError(payload.error || 'Could not send verification email. Try again.')
        return false
      }

      setVerificationSent(true)
      setAwaitingVerification(true)
      setInfo(
        payload.message ||
          `Verification link sent${verificationEmail ? ` to ${verificationEmail}` : ''}. Open the email and click Verify — this page will update automatically.`
      )
      return true
    } catch {
      setError('Could not send verification email. Check your connection and try again.')
      return false
    } finally {
      setVerificationSending(false)
    }
  }, [verificationEmail, verificationCredentialBody])

  React.useEffect(() => {
    if (!awaitingVerification) return

    void checkVerificationAndContinue()
    verificationPollRef.current = setInterval(() => {
      void checkVerificationAndContinue()
    }, VERIFICATION_POLL_MS)

    return () => stopVerificationPoll()
  }, [awaitingVerification, checkVerificationAndContinue])

    React.useEffect(() => {
    const legacyInvite = searchParams?.get('invite');
    if (legacyInvite) {
      router.replace(`/invite/accept/${encodeURIComponent(legacyInvite)}`);
      return;
    }
    if (searchParams?.get('inviteOnly') === '1') {
      setInfo('Access is invite-only. Use the link and temporary password from your invitation email, then sign in here.');
    } else if (searchParams?.get('tempReady') === '1') {
      setInfo(
        'Use the temporary password from your invitation email. You can change it later in Settings after signing in.'
      );
      const invitedEmail = searchParams?.get('email');
      if (invitedEmail) {
        setIdentifier(decodeURIComponent(invitedEmail));
      }
    } else if (searchParams?.get('inviteReady') === '1') {
      setInfo('Your password is set. Sign in with your email and the password you just created.');
      const invitedEmail = searchParams?.get('email');
      if (invitedEmail) {
        setIdentifier(decodeURIComponent(invitedEmail));
      }
    }
  }, [searchParams, router])

    React.useEffect(() => {
    const verifyToken = searchParams?.get('verify_token')
    if (!verifyToken || processedVerifyTokenRef.current === verifyToken) return
    processedVerifyTokenRef.current = verifyToken

    void (async () => {
      const res = await fetch('/api/auth/email-verification/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verifyToken }),
      })

      const params = new URLSearchParams(searchParams?.toString() || '')
      params.delete('verify_token')
      const nextQuery = params.toString()
      router.replace(nextQuery ? `/sign-in?${nextQuery}` : '/sign-in')

      if (res.ok) {
        setVerificationPending(true)
        setAwaitingVerification(true)
        setError('')
        setInfo('Email verified! This page will refresh automatically...')
        const continued = await checkVerificationAndContinue()
        if (!continued) {
          window.location.reload()
        }
        return
      }

      const contentType = res.headers.get('content-type') || ''
      const payload = contentType.includes('application/json')
        ? ((await res.json()) as { error?: string })
        : null
      setError(payload?.error || 'Verification failed. Sign in and click Verify now to request a new link.')
    })()
  }, [searchParams, router, checkVerificationAndContinue])

  const validateIdentifier = (value: string) => {
    const candidate = value.trim()
    if (!candidate) return false
    if (candidate.includes("@")) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate)
    }
    return /^[a-zA-Z0-9._-]{3,40}$/.test(candidate)
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return

    if (!identifier || !password) {
      setError("Please enter both username/email and password.")
      return
    }

    if (!validateIdentifier(identifier)) {
      setError("Enter a valid email or username.")
      return
    }

    setError("")
    setLoading(true)
    startProgressMessages()

    try {
      const email = identifier.trim().toLowerCase()
      if (demoAuthEnabled && email.toLowerCase() === "super@demo.continuum.io") {
        sendLocalDebugIngest('modern-stunning-sign-in.tsx:handleSignIn:superDemo', 'super demo sign-in', { email })
      }
      const isSuperDemo = demoAuthEnabled && email.toLowerCase() === "super@demo.continuum.io"
      sendLocalDebugIngest('modern-stunning-sign-in.tsx:handleSignIn:start', 'signin started', {
        isSuperDemo,
        hasRedirect: !!redirectTarget,
      })

      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          password,
          ...(isSuperDemo ? { is_super_admin: true } : {}),
        }),
        credentials: "include",
      })

      const contentType = response.headers.get('content-type') || ""
      const data = contentType.includes('application/json')
        ? ((await response.json()) as {
            error?: string
            user?: { role?: string; roles?: string[] }
          })
        : null

      if (!response.ok) {
        sendLocalDebugIngest('modern-stunning-sign-in.tsx:signin:fail', 'signin failed', {
          status: response.status,
        })
        setError(data?.error || "Sign in failed. Please try again.")
        return
      }

      const meResponse = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include",
      })

      if (!meResponse.ok) {
        const fallbackDest = resolvePostSignInPath({
          primary_role: data?.user?.role,
        })
        sendLocalDebugIngest('modern-stunning-sign-in.tsx:navigate', 'router.push me failed fallback', {
          destination: fallbackDest,
          meStatus: meResponse.status,
        })
        router.push(fallbackDest)
        return
      }

      const me = (await meResponse.json()) as SignInMeResponse

      if (me.email_verification?.required && me.email_verification?.verified !== true) {
        setVerificationEmail(me.email || email)
        setVerificationPending(true)
        setVerificationSent(false)
        setAwaitingVerification(false)
        setError('Your email is not verified yet. Click Verify now to receive a confirmation link.')
        return
      }

      await completeSignInNavigation(me, email)
    } catch {
      setError("Sign in failed. Please check your connection.")
    } finally {
      stopProgressMessages()
      setLoading(false)
    }
  }

  const demoAccounts = [
    { label: "Super Admin", mail: "super@demo.continuum.io" },
    { label: "Company Admin", mail: "admin@demo.continuum.io" },
    { label: "HR Manager", mail: "hr@demo.continuum.io" },
    { label: "Employee", mail: "employee@demo.continuum.io" },
  ]

  const DEMO_TEST_PASSWORD = "Demo@123"

  return (
    <AuthShell
      eyebrow="Sign in"
      title="Welcome back"
      subtitle="Use your credentials to access your Continuum dashboard."
      footer={
        <p className="text-xs text-[var(--muted-foreground)]">
          <Link href="/forgot-password" className="text-[var(--primary)] hover:underline">Forgot password?</Link>
          {' · '}
          Access is by invitation only
        </p>
      }
    >
      <form onSubmit={handleSignIn} className="space-y-4">
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            type="text"
            placeholder="name@company.com or username"
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value)
              if (error) setError("")
            }}
            className="pl-10"
            autoComplete="username"
          />
        </div>

        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (error) setError("")
            }}
            className="pl-10"
            autoComplete="current-password"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-[var(--destructive)]/35 bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">
            {error}
          </div>
        )}
        {verificationPending && (
          <div className="rounded-xl border border-[var(--primary)]/35 bg-[var(--primary)]/10 px-3 py-3 text-sm text-[var(--foreground)] space-y-3">
            <p>
              {verificationSent
                ? `Check your inbox${verificationEmail ? ` at ${verificationEmail}` : ''} and click the verification link. This page will continue automatically once verified.`
                : 'Your account needs email verification before you can access the dashboard.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={verificationSending}
                onClick={() => void sendVerificationEmail()}
              >
                {verificationSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : verificationSent ? (
                  'Resend verification email'
                ) : (
                  'Verify now'
                )}
              </Button>
            </div>
            {awaitingVerification && (
              <p className="text-xs text-[var(--muted-foreground)] flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Waiting for email verification...
              </p>
            )}
          </div>
        )}
        {info && (
          <div className="rounded-xl border border-[var(--primary)]/35 bg-[var(--primary)]/10 px-3 py-2 text-sm text-[var(--foreground)]">
            {info}
          </div>
        )}

        <Button type="submit" disabled={loading} className="h-11 w-full" size="lg">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {progressMessage}
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      {demoAuthEnabled && (
        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Demo shortcuts</p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {demoAccounts.map((acc) => (
              <Button
                key={acc.label}
                type="button"
                variant="outline"
                onClick={() => {
                  setIdentifier(acc.mail)
                  setPassword(DEMO_TEST_PASSWORD)
                  setError("")
                }}
              >
                {acc.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </AuthShell>
  )
}
