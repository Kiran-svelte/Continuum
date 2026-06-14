"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface ModernFormCardProps {
  title: string
  description?: string
  className?: string
  children: React.ReactNode
  maxWidth?: "sm" | "md" | "lg"
}

export function ModernFormCard({
  title,
  description,
  className,
  children,
  maxWidth = "md",
}: ModernFormCardProps) {
  const widthClass = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
  }[maxWidth]

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <div className={cn("relative z-10 w-full", widthClass)}>
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">{title}</h1>
          {description && (
            <p className="text-muted-foreground text-sm">{description}</p>
          )}
        </div>

        {/* Form Card */}
        <div className={cn("bg-card border border-border rounded-2xl shadow-lg p-8", className)}>
          {children}
        </div>
      </div>
    </div>
  )
}
