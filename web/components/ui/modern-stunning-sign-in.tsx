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
  const messageIndexRef = React.useRef(0)
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

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

  React.useEffect(() => {
    let cancelled = false

    async function redirectIfAuthenticated() {
      try {
        const meResponse = await fetch('/api/auth/me', { credentials: 'include' })
        if (!meResponse.ok || cancelled) return

        const me = (await meResponse.json()) as PostSignInMe & {
          email_verification?: { verified?: boolean }
        }

        if (me.email_verification?.verified === false) {
          if (cancelled) return
          await fetch('/api/auth/email-verification/send', { method: 'POST', credentials: 'include' }).catch(() => null)
          if (!cancelled) {
            setError('Your email is not verified. A new verification link has been sent.')
          }
          return
        }

        router.replace(resolvePostSignInPath(me, { redirectTarget }))
      } catch {
        // Remain on sign-in when session lookup fails.
      }
    }

    void redirectIfAuthenticated()
    return () => {
      cancelled = true
    }
  }, [redirectTarget, router])

  React.useEffect(() => {
    const verifyToken = searchParams?.get("verify_token")
    if (!verifyToken) return
    void fetch('/api/auth/email-verification/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: verifyToken }),
    }).then(async (res) => {
      if (res.ok) {
        setInfo('Email verified. Sign in to continue.')
      } else {
        const payload = await res.json().catch(() => ({}))
        setError(payload.error || 'Verification failed. Request a new link.')
      }
    })
  }, [searchParams])

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
        await fetch('/api/auth/email-verification/send', { method: 'POST', credentials: 'include' }).catch(() => null)
        setError('Your email is not verified. A new verification link has been sent.')
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
