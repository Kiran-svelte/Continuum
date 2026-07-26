"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Lock, Mail, ArrowRight, Loader2 } from "lucide-react"
import { getDefaultPortalForRoles, isDemoAuthEnabled } from "@/lib/auth-routing"
import { resolvePostSignInPath, type PostSignInMe } from '@/lib/post-sign-in-routing'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AuthShell } from "@/components/design-system"

const SIGN_IN_MESSAGES = [
  'Signing in...',
  'Verifying credentials...',
  'Loading your workspace...',
  'Almost there...',
];

const MESSAGE_INTERVAL_MS = 5_500;
const COMPANY_ONBOARDING_PATH = '/onboarding';

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
  const [needsVerification, setNeedsVerification] = React.useState(false)
  const [resending, setResending] = React.useState(false)
  const messageIndexRef = React.useRef(0)
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

  const resendVerification = React.useCallback(async () => {
    setResending(true)
    setError("")
    try {
      const res = await fetch('/api/auth/email-verification/send', {
        method: 'POST',
        credentials: 'include',
      })
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string
        throttled?: boolean
        delivered?: boolean
        alreadyVerified?: boolean
      }
      if (!res.ok) {
        setError(payload.error || 'Could not send a verification link. Try again shortly.')
        return
      }
      if (payload.alreadyVerified) {
        setNeedsVerification(false)
        setInfo('Your email is already verified — sign in to continue.')
        return
      }
      setInfo(
        payload.throttled
          ? 'A verification link was sent moments ago. Check your inbox and spam folder.'
          : 'Verification link sent. Check your inbox and spam folder.'
      )
    } catch {
      setError('Could not send a verification link. Check your connection.')
    } finally {
      setResending(false)
    }
  }, [])

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

  React.useEffect(() => () => stopProgressMessages(), [])

  const verifyToken = searchParams?.get("verify_token") ?? null
  const verifiedFlag = searchParams?.get("verified") ?? null
  const verifyErrorCode = searchParams?.get("verify_error") ?? null

  // Verification and the authenticated-redirect check must run in sequence, not
  // in parallel. When they raced, the session check would read the stale
  // "unverified" state, show the failure banner and trigger another email while
  // the token was still being confirmed — so a user who had just verified was
  // told they had not.
  React.useEffect(() => {
    let cancelled = false

    async function confirmToken(): Promise<boolean> {
      if (!verifyToken) return false
      try {
        const res = await fetch('/api/auth/email-verification/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ token: verifyToken }),
        })
        if (cancelled) return false
        if (res.ok) {
          setInfo('Email verified. Sign in to continue.')
          return true
        }
        const payload = (await res.json().catch(() => ({}))) as { error?: string }
        setError(payload.error || 'That verification link is no longer valid.')
        setNeedsVerification(true)
        return false
      } catch {
        return false
      }
    }

    async function run() {
      if (verifiedFlag === '1') {
        setInfo('Email verified. Sign in to continue.')
      } else if (verifyErrorCode) {
        setError(
          verifyErrorCode === 'expired'
            ? 'That verification link has expired. Sign in and we will send a fresh one.'
            : 'That verification link is not valid. Sign in and we will send a fresh one.'
        )
      }

      const justVerified = await confirmToken()
      if (cancelled) return

      try {
        const meResponse = await fetch('/api/auth/me', { credentials: 'include' })
        if (!meResponse.ok || cancelled) return

        const me = (await meResponse.json()) as PostSignInMe & {
          email_verification?: { verified?: boolean }
        }

        if (me.email_verification?.verified === false) {
          if (justVerified || cancelled) return
          setNeedsVerification(true)
          setError('Your email is not verified yet. Use the link we emailed you, or send a new one below.')
          return
        }

        router.replace(resolvePostSignInPath(me, { redirectTarget }))
      } catch {
        // Remain on sign-in when session lookup fails.
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [redirectTarget, router, verifyToken, verifiedFlag, verifyErrorCode])

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
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: identifier.trim(), password }),
        credentials: "include",
      })

      const data = (await response.json().catch(() => ({}))) as {
        error?: string
        user?: { role?: string; roles?: string[] }
      }

      if (!response.ok) {
        setError(data.error || "Sign in failed. Please try again.")
        return
      }

      const meResponse = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include",
      })

      if (!meResponse.ok) {
        router.push(getDefaultPortalForRoles(data.user?.role, data.user?.roles))
        return
      }

      const me = (await meResponse.json()) as PostSignInMe & {
        email_verification?: { verified?: boolean }
      }

      if (me.email_verification?.verified === false) {
        setNeedsVerification(true)
        setError('Your email is not verified yet. Use the link we emailed you, or send a new one below.')
        return
      }

      const email = identifier.trim()
      let destination = resolvePostSignInPath(me, { redirectTarget })
      if (destination === COMPANY_ONBOARDING_PATH) {
        router.push(COMPANY_ONBOARDING_PATH)
        return
      }
      if (demoAuthEnabled && email.toLowerCase() === "super@demo.continuum.io") {
        destination = '/super-admin/dashboard'
      }

      router.push(destination)
    } catch {
      setError("Sign in failed. Please check your connection.")
    } finally {
      stopProgressMessages()
      setLoading(false)
    }
  }

  const demoAccounts = [
    { label: "Super Admin", mail: "super@demo.continuum.io" },
    { label: "Company Admin", mail: "aarav.sharma0@technova.test" },
    { label: "HR Manager", mail: "priya.patel1@technova.test" },
    { label: "Employee", mail: "sneha.nair3@technova.test" },
  ]

  return (
    <AuthShell
      eyebrow="Sign in"
      title="Welcome back"
      subtitle="Use your credentials to access your Continuum dashboard."
      footer={
        <p className="text-xs text-[var(--text-secondary)]">
          <Link href="/forgot-password" className="text-[var(--primary)] hover:underline">Forgot password?</Link>
          {' · '}
          <Link href="/sign-up" className="text-[var(--primary)] hover:underline">Create workspace</Link>
        </p>
      }
    >
      <form onSubmit={handleSignIn} className="space-y-4">
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
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
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
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
        {info && (
          <div className="rounded-xl border border-[var(--primary)]/35 bg-[var(--primary)]/10 px-3 py-2 text-sm text-[var(--foreground)]">
            {info}
          </div>
        )}
        {needsVerification && (
          <Button
            type="button"
            variant="outline"
            disabled={resending}
            onClick={() => { void resendVerification() }}
            className="h-10 w-full"
          >
            {resending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending verification link...
              </>
            ) : (
              'Send me a new verification link'
            )}
          </Button>
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
                  setPassword(acc.mail === "super@demo.continuum.io" ? "Demo@123" : "Test@1234")
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
