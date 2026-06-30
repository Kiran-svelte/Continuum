"use client"

import type { ChangeEvent, FormEvent } from "react"
import { useEffect, useRef, useState } from "react"
import { Eye, EyeOff, Github, Linkedin, Moon, Sun, Twitter } from "lucide-react"
import "./animated-sign-in.css"

const validateEmail = (email: string) => {
  const re =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  return re.test(String(email).toLowerCase())
}

const AnimatedSignIn = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isEmailFocused, setIsEmailFocused] = useState(false)
  const [isPasswordFocused, setIsPasswordFocused] = useState(false)
  const [isEmailValid, setIsEmailValid] = useState(true)
  const [isFormSubmitted, setIsFormSubmitted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    if (e.target.value) {
      setIsEmailValid(validateEmail(e.target.value))
    } else {
      setIsEmailValid(true)
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setIsFormSubmitted(true)

    if (email && password && validateEmail(email)) {
      const form = containerRef.current?.querySelector(".login-form") as HTMLElement | null
      if (form) {
        form.classList.add("form-success")
        setTimeout(() => {
          form.classList.remove("form-success")
        }, 1500)
      }
    }
  }

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev)
    document.documentElement.classList.toggle("dark-mode")
  }

  const handleSocialSignIn = (provider: "github" | "twitter" | "linkedin") => {
    window.location.href = `/api/auth/oauth/${provider}`
  }

  useEffect(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    setIsDarkMode(prefersDark)
    if (prefersDark) {
      document.documentElement.classList.add("dark-mode")
    }
  }, [])

  useEffect(() => {
    const canvas = document.getElementById("particles") as HTMLCanvasElement | null
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const canvasEl = canvas
    const ctx2d = ctx

    let frameId = 0

    const setCanvasSize = () => {
      canvasEl.width = window.innerWidth
      canvasEl.height = window.innerHeight
    }

    setCanvasSize()
    window.addEventListener("resize", setCanvasSize)

    class Particle {
      x: number
      y: number
      size: number
      speedX: number
      speedY: number
      color: string

      constructor() {
        this.x = Math.random() * canvasEl.width
        this.y = Math.random() * canvasEl.height
        this.size = Math.random() * 3 + 1
        this.speedX = (Math.random() - 0.5) * 0.5
        this.speedY = (Math.random() - 0.5) * 0.5
        this.color = isDarkMode
          ? `rgba(255, 255, 255, ${Math.random() * 0.2})`
          : `rgba(0, 0, 100, ${Math.random() * 0.2})`
      }

      update() {
        this.x += this.speedX
        this.y += this.speedY

        if (this.x > canvasEl.width) this.x = 0
        if (this.x < 0) this.x = canvasEl.width
        if (this.y > canvasEl.height) this.y = 0
        if (this.y < 0) this.y = canvasEl.height
      }

      draw() {
        ctx2d.fillStyle = this.color
        ctx2d.beginPath()
        ctx2d.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx2d.fill()
      }
    }

    const particles: Particle[] = []
    const particleCount = Math.min(100, Math.floor((canvasEl.width * canvasEl.height) / 15000))

    for (let i = 0; i < particleCount; i += 1) {
      particles.push(new Particle())
    }

    const animate = () => {
      ctx2d.clearRect(0, 0, canvasEl.width, canvasEl.height)
      for (const particle of particles) {
        particle.update()
        particle.draw()
      }
      frameId = window.requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", setCanvasSize)
      window.cancelAnimationFrame(frameId)
    }
  }, [isDarkMode])

  return (
    <div ref={containerRef} className={`login-container ${isDarkMode ? "dark" : "light"}`}>
      <canvas id="particles" className="particles-canvas" />

      <button type="button" className="theme-toggle" onClick={toggleDarkMode}>
        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <div className="login-card">
        <div className="login-card-inner">
          <div className="login-header">
            <h1>Welcome</h1>
            <p>Please sign in to continue</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className={`form-field ${isEmailFocused || email ? "active" : ""} ${!isEmailValid && email ? "invalid" : ""}`}>
              <input
                type="email"
                id="email"
                value={email}
                onChange={handleEmailChange}
                onFocus={() => setIsEmailFocused(true)}
                onBlur={() => setIsEmailFocused(false)}
                required
              />
              <label htmlFor="email">Email Address</label>
              {!isEmailValid && email && <span className="error-message">Please enter a valid email</span>}
            </div>

            <div className={`form-field ${isPasswordFocused || password ? "active" : ""}`}>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
                required
              />
              <label htmlFor="password">Password</label>
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="form-options">
              <label className="remember-me">
                <input type="checkbox" checked={rememberMe} onChange={() => setRememberMe(!rememberMe)} />
                <span className="checkmark" />
                Remember me
              </label>

              <a href="#" className="forgot-password">
                Forgot Password?
              </a>
            </div>

            <button type="submit" className="login-button" disabled={isFormSubmitted && (!email || !password || !isEmailValid)}>
              Sign In
            </button>
          </form>

          <div className="separator">
            <span>or continue with</span>
          </div>

          <div className="social-login">
            <button className="social-button github" type="button" aria-label="Continue with GitHub" title="Continue with GitHub" onClick={() => handleSocialSignIn("github")}>
              <Github size={18} />
            </button>
            <button className="social-button twitter" type="button" aria-label="Continue with Twitter" title="Continue with Twitter" onClick={() => handleSocialSignIn("twitter")}>
              <Twitter size={18} />
            </button>
            <button className="social-button linkedin" type="button" aria-label="Continue with LinkedIn" title="Continue with LinkedIn" onClick={() => handleSocialSignIn("linkedin")}>
              <Linkedin size={18} />
            </button>
          </div>

          <p className="signup-prompt">
            Don&apos;t have an account? <a href="#">Sign up</a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default AnimatedSignIn
