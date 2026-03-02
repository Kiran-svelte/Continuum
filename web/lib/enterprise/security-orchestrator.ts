/**
 * Security Orchestrator
 * Coordinates all security layers: Cloudflare + Vault + Rate Limiting + Audit
 *
 * Implements the defense-in-depth architecture from the README:
 * Layer 1: Network (Cloudflare WAF, DDoS)
 * Layer 2: Authentication (Supabase Auth)
 * Layer 3: Authorization (RBAC)
 * Layer 4: Input Validation (Zod + sanitization)
 * Layer 5: Data Protection (Vault encryption, OTP)
 * Layer 6: Audit & Monitoring (SHA-256 chain, Prometheus)
 */

import { cloudflare } from './cloudflare';
import { logger } from './logger';
import { recordSuspiciousRequest, recordAuthFailure } from './metrics';

// ─── Types ───────────────────────────────────────────────────────────────────

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export interface SuspiciousRequestRecord {
  ip: string;
  reason: string;
  severity: SeverityLevel;
  timestamp: number;
}

export interface SecurityEvaluation {
  allowed: boolean;
  layer: string;
  reason?: string;
  requiresCaptcha: boolean;
  riskScore: number;
}

export interface SecurityDashboard {
  cloudflare: {
    configured: boolean;
    blockedIPs: number;
    wafRules: number;
    rateLimits: number;
    ddosSensitivity: string;
  };
  suspicious: {
    trackedIPs: number;
    recentBlocks: number;
  };
  threats: {
    totalThreats: number;
    blockedRequests: number;
    topCountries: Array<{ country: string; count: number }>;
  };
}

export interface SecurityReport {
  companyId: string;
  generatedAt: string;
  dateRange: { start: string; end: string };
  summary: {
    totalSecurityEvents: number;
    blockedRequests: number;
    suspiciousIPs: number;
    wafRulesActive: number;
    ddosAttacks: number;
  };
  layers: Array<{
    name: string;
    status: 'active' | 'inactive' | 'degraded';
    details: string;
  }>;
  recommendations: string[];
}

interface RequestInfo {
  ip: string;
  method: string;
  url: string;
  userAgent?: string;
  country?: string;
  companyId?: string;
}

// ─── IP Tracking with TTL ───────────────────────────────────────────────────

interface IPTrackingEntry {
  count: number;
  records: SuspiciousRequestRecord[];
  firstSeen: number;
  blocked: boolean;
}

class SuspiciousIPTracker {
  private entries = new Map<string, IPTrackingEntry>();
  private readonly ttlMs: number;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(ttlMinutes = 60) {
    this.ttlMs = ttlMinutes * 60 * 1000;
    this.cleanupTimer = setInterval(() => this.cleanup(), this.ttlMs / 2);
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  record(ip: string, reason: string, severity: SeverityLevel): number {
    const now = Date.now();
    const entry = this.entries.get(ip);

    const record: SuspiciousRequestRecord = { ip, reason, severity, timestamp: now };

    if (entry && now - entry.firstSeen < this.ttlMs) {
      entry.count++;
      entry.records.push(record);
      return entry.count;
    }

    this.entries.set(ip, {
      count: 1,
      records: [record],
      firstSeen: now,
      blocked: false,
    });
    return 1;
  }

  markBlocked(ip: string): void {
    const entry = this.entries.get(ip);
    if (entry) entry.blocked = true;
  }

  getCount(ip: string): number {
    const entry = this.entries.get(ip);
    if (!entry) return 0;
    if (Date.now() - entry.firstSeen >= this.ttlMs) {
      this.entries.delete(ip);
      return 0;
    }
    return entry.count;
  }

  getRecords(ip: string): SuspiciousRequestRecord[] {
    return this.entries.get(ip)?.records ?? [];
  }

  get trackedCount(): number {
    return this.entries.size;
  }

  get recentBlockCount(): number {
    let count = 0;
    this.entries.forEach((entry) => {
      if (entry.blocked) count++;
    });
    return count;
  }

  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];
    this.entries.forEach((entry, ip) => {
      if (now - entry.firstSeen >= this.ttlMs) {
        toDelete.push(ip);
      }
    });
    toDelete.forEach((ip) => this.entries.delete(ip));
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// ─── Severity Weights ───────────────────────────────────────────────────────

const SEVERITY_WEIGHTS: Record<SeverityLevel, number> = {
  low: 1,
  medium: 3,
  high: 5,
  critical: 10,
};

// ─── Security Orchestrator ──────────────────────────────────────────────────

export class SecurityOrchestrator {
  private readonly tracker: SuspiciousIPTracker;
  autoBlockThreshold: number;

  constructor(options?: { autoBlockThreshold?: number; ttlMinutes?: number }) {
    this.autoBlockThreshold = options?.autoBlockThreshold ?? 10;
    this.tracker = new SuspiciousIPTracker(options?.ttlMinutes ?? 60);
  }

  /**
   * Record a suspicious request and auto-block after threshold is reached.
   * The count is weighted by severity.
   */
  async handleSuspiciousRequest(
    ip: string,
    reason: string,
    severity: SeverityLevel
  ): Promise<{ blocked: boolean; count: number }> {
    const weight = SEVERITY_WEIGHTS[severity];
    let totalCount = 0;

    for (let i = 0; i < weight; i++) {
      totalCount = this.tracker.record(ip, reason, severity);
    }

    recordSuspiciousRequest(severity);

    logger.security('Suspicious request detected', {
      ip,
      reason,
      severity,
      totalCount,
      threshold: this.autoBlockThreshold,
    });

    if (totalCount >= this.autoBlockThreshold) {
      return this.blockIP(ip, reason, totalCount);
    }

    return { blocked: false, count: totalCount };
  }

  private async blockIP(
    ip: string,
    reason: string,
    count: number
  ): Promise<{ blocked: boolean; count: number }> {
    this.tracker.markBlocked(ip);

    logger.security('Auto-blocking IP — threshold exceeded', {
      ip,
      count,
      threshold: this.autoBlockThreshold,
    });

    await cloudflare.blockIP(ip, `Auto-blocked: ${reason} (count: ${count})`);

    return { blocked: true, count };
  }

  /**
   * Evaluate a request against all security layers and return a risk assessment.
   */
  async evaluateRequestSecurity(req: RequestInfo): Promise<SecurityEvaluation> {
    let riskScore = 0;

    // Layer 1: Check if IP is already blocked at Cloudflare
    const ipBlocked = await cloudflare.isIPBlocked(req.ip);
    if (ipBlocked) {
      return {
        allowed: false,
        layer: 'network',
        reason: 'IP is blocked at network level',
        requiresCaptcha: false,
        riskScore: 100,
      };
    }

    // Check local suspicious IP tracker
    const suspiciousCount = this.tracker.getCount(req.ip);
    if (suspiciousCount > 0) {
      riskScore += Math.min(suspiciousCount * 5, 50);
    }

    // Check if endpoint requires Turnstile
    const requiresCaptcha = cloudflare.isTurnstileRequired(req.url);
    if (requiresCaptcha) {
      riskScore += 10;
    }

    // Evaluate auth endpoints with higher scrutiny
    if (req.url.startsWith('/api/auth/')) {
      riskScore += 15;
    }

    // Missing or suspicious user agent
    if (!req.userAgent || req.userAgent.length < 10) {
      riskScore += 20;
    }

    const allowed = riskScore < 80;

    if (!allowed) {
      recordAuthFailure('high_risk_score');
      logger.security('Request denied — high risk score', {
        ip: req.ip,
        url: req.url,
        riskScore,
      });
    }

    return {
      allowed,
      layer: allowed ? 'passed' : 'risk_assessment',
      reason: allowed ? undefined : `Risk score ${riskScore} exceeds threshold`,
      requiresCaptcha,
      riskScore,
    };
  }

  /**
   * Aggregate security metrics into a dashboard view.
   */
  async getSecurityDashboard(companyId?: string): Promise<SecurityDashboard> {
    const [wafRules, rateLimits, blockedIPs, ddosSettings, threats] = await Promise.all([
      cloudflare.getWAFRules(),
      cloudflare.getRateLimits(),
      cloudflare.getBlockedIPs(),
      cloudflare.getDDoSSettings(),
      cloudflare.getThreatAnalytics('24h'),
    ]);

    const dashboard: SecurityDashboard = {
      cloudflare: {
        configured: cloudflare.isConfigured,
        blockedIPs: blockedIPs.length,
        wafRules: wafRules.length,
        rateLimits: rateLimits.length,
        ddosSensitivity: ddosSettings.sensitivity_level,
      },
      suspicious: {
        trackedIPs: this.tracker.trackedCount,
        recentBlocks: this.tracker.recentBlockCount,
      },
      threats: {
        totalThreats: threats.totalThreats,
        blockedRequests: threats.blockedRequests,
        topCountries: threats.topCountries,
      },
    };

    if (companyId) {
      logger.audit('Security dashboard accessed', { companyId });
    }

    return dashboard;
  }

  /**
   * Generate a compliance security report for a company.
   */
  async generateSecurityReport(
    companyId: string,
    dateRange: { start: string; end: string }
  ): Promise<SecurityReport> {
    const [wafRules, ddosSettings, ddosAnalytics, threats] = await Promise.all([
      cloudflare.getWAFRules(),
      cloudflare.getDDoSSettings(),
      cloudflare.getDDoSAnalytics('7d'),
      cloudflare.getThreatAnalytics('7d'),
    ]);

    const layers = [
      {
        name: 'Layer 1: Network (Cloudflare WAF, DDoS)',
        status: cloudflare.isConfigured ? ('active' as const) : ('inactive' as const),
        details: cloudflare.isConfigured
          ? `${wafRules.length} WAF rules active, DDoS sensitivity: ${ddosSettings.sensitivity_level}`
          : 'Cloudflare not configured',
      },
      {
        name: 'Layer 2: Authentication (Supabase Auth)',
        status: 'active' as const,
        details: 'Supabase Auth with OTP verification',
      },
      {
        name: 'Layer 3: Authorization (RBAC)',
        status: 'active' as const,
        details: 'Role-based access control with tenant isolation',
      },
      {
        name: 'Layer 4: Input Validation (Zod + sanitization)',
        status: 'active' as const,
        details: 'Zod schema validation on all API endpoints',
      },
      {
        name: 'Layer 5: Data Protection (Vault encryption, OTP)',
        status: 'active' as const,
        details: 'AES-256-GCM with Vault Transit fallback',
      },
      {
        name: 'Layer 6: Audit & Monitoring (SHA-256 chain, Prometheus)',
        status: 'active' as const,
        details: 'Immutable audit logs with hash chain integrity',
      },
    ];

    const recommendations: string[] = [];
    if (!cloudflare.isConfigured) {
      recommendations.push('Configure Cloudflare for network-level protection');
    }
    if (wafRules.length === 0 && cloudflare.isConfigured) {
      recommendations.push('Deploy predefined WAF rules for SQL injection and XSS protection');
    }
    if (ddosSettings.sensitivity_level === 'low') {
      recommendations.push('Consider increasing DDoS sensitivity to medium or high');
    }
    if (threats.totalThreats > 100) {
      recommendations.push('High threat volume detected — review top threat sources');
    }

    const report: SecurityReport = {
      companyId,
      generatedAt: new Date().toISOString(),
      dateRange,
      summary: {
        totalSecurityEvents: threats.totalThreats,
        blockedRequests: threats.blockedRequests,
        suspiciousIPs: this.tracker.trackedCount,
        wafRulesActive: wafRules.length,
        ddosAttacks: ddosAnalytics.totalAttacks,
      },
      layers,
      recommendations,
    };

    logger.audit('Security report generated', {
      companyId,
      dateRange: JSON.stringify(dateRange),
    });

    return report;
  }

  destroy(): void {
    this.tracker.destroy();
  }
}

// ─── Singleton Export ────────────────────────────────────────────────────────

export const securityOrchestrator = new SecurityOrchestrator();
export default securityOrchestrator;
