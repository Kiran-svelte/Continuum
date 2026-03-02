/**
 * Cloudflare Security Integration for Continuum
 *
 * Provides:
 * 1. WAF (Web Application Firewall) management
 * 2. Rate limiting rules (edge-level)
 * 3. IP access rules (block/allow/challenge)
 * 4. Bot management
 * 5. DDoS protection settings
 * 6. Security analytics
 * 7. Turnstile CAPTCHA integration
 */

import { logger } from './logger';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WAFRule {
  id: string;
  description: string;
  expression: string;
  action: 'block' | 'challenge' | 'js_challenge' | 'managed_challenge' | 'log';
  enabled: boolean;
  priority?: number;
}

export interface WAFRuleInput {
  description: string;
  expression: string;
  action: 'block' | 'challenge' | 'js_challenge' | 'managed_challenge' | 'log';
  enabled?: boolean;
  priority?: number;
}

export interface IPAccessRule {
  id: string;
  mode: 'block' | 'whitelist' | 'challenge' | 'js_challenge';
  notes: string;
  configuration: {
    target: 'ip' | 'ip_range' | 'country';
    value: string;
  };
  created_on: string;
}

export interface RateLimitConfig {
  url: string;
  threshold: number;
  period: number;
  action: 'block' | 'challenge' | 'simulate';
  timeout?: number;
}

export interface RateLimitRule {
  id: string;
  match: { url: string };
  threshold: number;
  period: number;
  action: { mode: string; timeout: number };
  enabled: boolean;
}

export interface DDoSSettings {
  sensitivity_level: 'low' | 'medium' | 'high';
  action: string;
  enabled: boolean;
}

export interface SecurityEvent {
  action: string;
  clientIP: string;
  country: string;
  ruleId: string;
  source: string;
  timestamp: string;
  userAgent: string;
  uri: string;
}

export interface ThreatAnalytics {
  totalThreats: number;
  blockedRequests: number;
  challengedRequests: number;
  topCountries: Array<{ country: string; count: number }>;
  topIPs: Array<{ ip: string; count: number }>;
  topRules: Array<{ ruleId: string; count: number }>;
}

export interface BotAnalytics {
  totalRequests: number;
  botRequests: number;
  humanRequests: number;
  botPercentage: number;
  topBotCategories: Array<{ category: string; count: number }>;
}

export interface DNSRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  ttl: number;
  proxied: boolean;
}

export interface DNSRecordInput {
  type: string;
  name: string;
  content: string;
  ttl?: number;
  proxied?: boolean;
}

interface CloudflareAPIResponse<T = unknown> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: Array<{ code: number; message: string }>;
  result: T;
  result_info?: { page: number; per_page: number; total_count: number; count: number };
}

// ─── Pre-defined WAF Rules ──────────────────────────────────────────────────

export const PREDEFINED_WAF_RULES: WAFRuleInput[] = [
  {
    description: 'Block SQL injection patterns',
    expression:
      '(http.request.uri.query contains "UNION SELECT" or ' +
      'http.request.uri.query contains "DROP TABLE" or ' +
      'http.request.uri.query contains "\'; --" or ' +
      'http.request.body.raw contains "UNION SELECT")',
    action: 'block',
  },
  {
    description: 'Block XSS attempts',
    expression:
      '(http.request.uri.query contains "<script" or ' +
      'http.request.uri.query contains "javascript:" or ' +
      'http.request.body.raw contains "<script" or ' +
      'http.request.uri.query contains "onerror=")',
    action: 'block',
  },
  {
    description: 'Block path traversal',
    expression:
      '(http.request.uri.path contains "../" or ' +
      'http.request.uri.path contains "..%2f" or ' +
      'http.request.uri.path contains "%2e%2e/")',
    action: 'block',
  },
  {
    description: 'Rate limit auth endpoints',
    expression: '(http.request.uri.path matches "^/api/auth/")',
    action: 'managed_challenge',
  },
  {
    description: 'Challenge suspicious geo-locations',
    expression:
      '(ip.geoip.country in {"T1" "XX"} and ' +
      'http.request.uri.path matches "^/api/")',
    action: 'challenge',
  },
];

// ─── Pre-defined Rate Limits ────────────────────────────────────────────────

export const PREDEFINED_RATE_LIMITS: RateLimitConfig[] = [
  { url: '/api/leaves/submit', threshold: 5, period: 60, action: 'block', timeout: 60 },
  { url: '/api/auth/*', threshold: 10, period: 60, action: 'challenge', timeout: 300 },
  { url: '/api/*', threshold: 100, period: 60, action: 'simulate', timeout: 60 },
  { url: '/api/cron/*', threshold: 1, period: 60, action: 'block', timeout: 60 },
];

// ─── CloudflareClient ───────────────────────────────────────────────────────

export class CloudflareClient {
  private readonly apiToken: string | null;
  private readonly zoneId: string | null;
  private readonly accountId: string | null;
  private readonly baseUrl = 'https://api.cloudflare.com/client/v4';
  private readonly configured: boolean;
  private readonly turnstileSecret: string | null;

  constructor() {
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN || null;
    this.zoneId = process.env.CLOUDFLARE_ZONE_ID || null;
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID || null;
    this.turnstileSecret = process.env.CLOUDFLARE_TURNSTILE_SECRET || null;
    this.configured = !!(this.apiToken && this.zoneId);

    if (!this.configured) {
      logger.warn('Cloudflare not configured — using mock responses', {
        hasToken: !!this.apiToken,
        hasZone: !!this.zoneId,
      });
    }
  }

  // ─── Internal Helpers ───────────────────────────────────────────────────

  private get headers(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<CloudflareAPIResponse<T>> {
    if (!this.configured) {
      return { success: true, errors: [], messages: [], result: [] as unknown as T };
    }

    const url = `${this.baseUrl}${path}`;
    try {
      const response = await fetch(url, {
        method,
        headers: this.headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = (await response.json()) as CloudflareAPIResponse<T>;

      if (!data.success) {
        logger.error('Cloudflare API error', null, {
          path,
          errors: data.errors.map((e) => e.message),
        });
      }

      return data;
    } catch (error) {
      logger.error('Cloudflare API request failed', error instanceof Error ? error : null, {
        path,
        method,
      });
      return { success: false, errors: [{ code: 0, message: 'Request failed' }], messages: [], result: [] as unknown as T };
    }
  }

  private zonePath(suffix: string): string {
    return `/zones/${this.zoneId}${suffix}`;
  }

  // ─── WAF Management ─────────────────────────────────────────────────────

  async getWAFRules(): Promise<WAFRule[]> {
    if (!this.configured) return [];

    const resp = await this.request<WAFRule[]>('GET', this.zonePath('/firewall/rules'));
    return resp.success ? resp.result : [];
  }

  async createWAFRule(rule: WAFRuleInput): Promise<WAFRule | null> {
    if (!this.configured) {
      logger.info('Cloudflare not configured — skipping WAF rule creation', {
        description: rule.description,
      });
      return null;
    }

    const filterResp = await this.request<{ id: string }>('POST', this.zonePath('/filters'), [
      { expression: rule.expression, description: rule.description },
    ]);

    if (!filterResp.success || !Array.isArray(filterResp.result)) return null;

    const filters = filterResp.result as Array<{ id: string }>;
    const filterId = filters[0]?.id;
    if (!filterId) return null;

    const resp = await this.request<WAFRule[]>('POST', this.zonePath('/firewall/rules'), [
      {
        filter: { id: filterId },
        action: rule.action,
        description: rule.description,
        enabled: rule.enabled ?? true,
        priority: rule.priority,
      },
    ]);

    if (resp.success && Array.isArray(resp.result)) {
      logger.security('WAF rule created', { description: rule.description });
      return resp.result[0] ?? null;
    }
    return null;
  }

  async updateWAFRule(ruleId: string, updates: Partial<WAFRuleInput>): Promise<WAFRule | null> {
    if (!this.configured) return null;

    const resp = await this.request<WAFRule>(
      'PUT',
      this.zonePath(`/firewall/rules/${ruleId}`),
      updates
    );

    if (resp.success) {
      logger.security('WAF rule updated', { ruleId });
    }
    return resp.success ? resp.result : null;
  }

  async deleteWAFRule(ruleId: string): Promise<boolean> {
    if (!this.configured) return false;

    const resp = await this.request<unknown>('DELETE', this.zonePath(`/firewall/rules/${ruleId}`));
    if (resp.success) {
      logger.security('WAF rule deleted', { ruleId });
    }
    return resp.success;
  }

  // ─── IP Access Control ──────────────────────────────────────────────────

  async blockIP(ip: string, reason: string): Promise<IPAccessRule | null> {
    return this.createIPRule(ip, 'block', reason);
  }

  async allowIP(ip: string, reason: string): Promise<IPAccessRule | null> {
    return this.createIPRule(ip, 'whitelist', reason);
  }

  async challengeIP(ip: string, reason: string): Promise<IPAccessRule | null> {
    return this.createIPRule(ip, 'challenge', reason);
  }

  private async createIPRule(
    ip: string,
    mode: 'block' | 'whitelist' | 'challenge',
    notes: string
  ): Promise<IPAccessRule | null> {
    if (!this.configured) {
      logger.info('Cloudflare not configured — skipping IP rule', { ip, mode });
      return null;
    }

    const resp = await this.request<IPAccessRule>(
      'POST',
      this.zonePath('/firewall/access_rules/rules'),
      { mode, configuration: { target: 'ip', value: ip }, notes }
    );

    if (resp.success) {
      logger.security(`IP ${mode} rule created`, { ip, reason: notes });
    }
    return resp.success ? resp.result : null;
  }

  async removeIPRule(ruleId: string): Promise<boolean> {
    if (!this.configured) return false;

    const resp = await this.request<unknown>(
      'DELETE',
      this.zonePath(`/firewall/access_rules/rules/${ruleId}`)
    );
    if (resp.success) {
      logger.security('IP rule removed', { ruleId });
    }
    return resp.success;
  }

  async getBlockedIPs(): Promise<IPAccessRule[]> {
    if (!this.configured) return [];

    const resp = await this.request<IPAccessRule[]>(
      'GET',
      this.zonePath('/firewall/access_rules/rules?mode=block&page=1&per_page=100')
    );
    return resp.success ? resp.result : [];
  }

  async isIPBlocked(ip: string): Promise<boolean> {
    if (!this.configured) return false;

    const resp = await this.request<IPAccessRule[]>(
      'GET',
      this.zonePath(
        `/firewall/access_rules/rules?configuration.value=${encodeURIComponent(ip)}&mode=block`
      )
    );

    return resp.success && Array.isArray(resp.result) && resp.result.length > 0;
  }

  // ─── Rate Limiting (Edge) ───────────────────────────────────────────────

  async createRateLimit(config: RateLimitConfig): Promise<RateLimitRule | null> {
    if (!this.configured) {
      logger.info('Cloudflare not configured — skipping rate limit', { url: config.url });
      return null;
    }

    const resp = await this.request<RateLimitRule>(
      'POST',
      this.zonePath('/rate_limits'),
      {
        match: { request: { url_pattern: `*${config.url}*`, methods: ['_ALL_'] } },
        threshold: config.threshold,
        period: config.period,
        action: { mode: config.action, timeout: config.timeout ?? 60 },
        enabled: true,
      }
    );

    if (resp.success) {
      logger.security('Rate limit created', {
        url: config.url,
        threshold: config.threshold,
        period: config.period,
      });
    }
    return resp.success ? resp.result : null;
  }

  async getRateLimits(): Promise<RateLimitRule[]> {
    if (!this.configured) return [];

    const resp = await this.request<RateLimitRule[]>('GET', this.zonePath('/rate_limits'));
    return resp.success ? resp.result : [];
  }

  async deleteRateLimit(ruleId: string): Promise<boolean> {
    if (!this.configured) return false;

    const resp = await this.request<unknown>('DELETE', this.zonePath(`/rate_limits/${ruleId}`));
    if (resp.success) {
      logger.security('Rate limit deleted', { ruleId });
    }
    return resp.success;
  }

  // ─── DDoS Protection ───────────────────────────────────────────────────

  async getDDoSSettings(): Promise<DDoSSettings> {
    if (!this.configured) {
      return { sensitivity_level: 'medium', action: 'managed_challenge', enabled: true };
    }

    const resp = await this.request<DDoSSettings>(
      'GET',
      this.zonePath('/firewall/ddos_protection')
    );
    return resp.success
      ? resp.result
      : { sensitivity_level: 'medium', action: 'managed_challenge', enabled: true };
  }

  async updateDDoSSettings(sensitivity: 'low' | 'medium' | 'high'): Promise<DDoSSettings | null> {
    if (!this.configured) return null;

    const resp = await this.request<DDoSSettings>(
      'PUT',
      this.zonePath('/firewall/ddos_protection'),
      { sensitivity_level: sensitivity }
    );

    if (resp.success) {
      logger.security('DDoS settings updated', { sensitivity });
    }
    return resp.success ? resp.result : null;
  }

  async getDDoSAnalytics(
    timeRange: '1h' | '24h' | '7d'
  ): Promise<{ totalAttacks: number; mitigatedRequests: number; peakRps: number }> {
    if (!this.configured) {
      return { totalAttacks: 0, mitigatedRequests: 0, peakRps: 0 };
    }

    const since = this.timeRangeToISO(timeRange);
    const resp = await this.request<{
      totals: { totalAttacks: number; mitigatedRequests: number; peakRps: number };
    }>('GET', this.zonePath(`/firewall/ddos_analytics?since=${since}`));

    return resp.success && resp.result?.totals
      ? resp.result.totals
      : { totalAttacks: 0, mitigatedRequests: 0, peakRps: 0 };
  }

  // ─── Security Analytics ─────────────────────────────────────────────────

  async getSecurityEvents(
    timeRange: '1h' | '24h' | '7d',
    filters?: { action?: string; country?: string; ip?: string }
  ): Promise<SecurityEvent[]> {
    if (!this.configured) return [];

    const since = this.timeRangeToISO(timeRange);
    let queryParams = `since=${since}`;
    if (filters?.action) queryParams += `&action=${encodeURIComponent(filters.action)}`;
    if (filters?.country) queryParams += `&country=${encodeURIComponent(filters.country)}`;
    if (filters?.ip) queryParams += `&ip=${encodeURIComponent(filters.ip)}`;

    const resp = await this.request<SecurityEvent[]>(
      'GET',
      this.zonePath(`/security/events?${queryParams}`)
    );
    return resp.success ? resp.result : [];
  }

  async getThreatAnalytics(timeRange: '1h' | '24h' | '7d'): Promise<ThreatAnalytics> {
    const empty: ThreatAnalytics = {
      totalThreats: 0,
      blockedRequests: 0,
      challengedRequests: 0,
      topCountries: [],
      topIPs: [],
      topRules: [],
    };

    if (!this.configured) return empty;

    const since = this.timeRangeToISO(timeRange);
    const resp = await this.request<ThreatAnalytics>(
      'GET',
      this.zonePath(`/security/analytics/threats?since=${since}`)
    );
    return resp.success ? resp.result : empty;
  }

  async getTopThreats(
    timeRange: '1h' | '24h' | '7d',
    limit = 10
  ): Promise<{ ips: Array<{ ip: string; count: number }>; countries: Array<{ country: string; count: number }> }> {
    if (!this.configured) return { ips: [], countries: [] };

    const since = this.timeRangeToISO(timeRange);
    const resp = await this.request<{
      ips: Array<{ ip: string; count: number }>;
      countries: Array<{ country: string; count: number }>;
    }>('GET', this.zonePath(`/security/analytics/top?since=${since}&limit=${limit}`));

    return resp.success ? resp.result : { ips: [], countries: [] };
  }

  async getBotAnalytics(timeRange: '1h' | '24h' | '7d'): Promise<BotAnalytics> {
    const empty: BotAnalytics = {
      totalRequests: 0,
      botRequests: 0,
      humanRequests: 0,
      botPercentage: 0,
      topBotCategories: [],
    };

    if (!this.configured) return empty;

    const since = this.timeRangeToISO(timeRange);
    const resp = await this.request<BotAnalytics>(
      'GET',
      this.zonePath(`/bot_analytics?since=${since}`)
    );
    return resp.success ? resp.result : empty;
  }

  // ─── Turnstile (CAPTCHA) ────────────────────────────────────────────────

  async validateTurnstileToken(token: string, ip: string): Promise<boolean> {
    if (!this.turnstileSecret) {
      logger.warn('Turnstile secret not configured — skipping validation');
      return true;
    }

    try {
      const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: this.turnstileSecret,
          response: token,
          remoteip: ip,
        }),
      });

      const data = (await response.json()) as { success: boolean; 'error-codes'?: string[] };

      if (!data.success) {
        logger.security('Turnstile validation failed', { ip, errors: data['error-codes'] });
      }

      return data.success;
    } catch (error) {
      logger.error(
        'Turnstile validation error',
        error instanceof Error ? error : null,
        { ip }
      );
      return false;
    }
  }

  private static readonly TURNSTILE_REQUIRED_ENDPOINTS = new Set([
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/reset-password',
    '/api/leaves/submit',
  ]);

  isTurnstileRequired(endpoint: string): boolean {
    return CloudflareClient.TURNSTILE_REQUIRED_ENDPOINTS.has(endpoint);
  }

  // ─── DNS Management ─────────────────────────────────────────────────────

  async getDNSRecords(): Promise<DNSRecord[]> {
    if (!this.configured) return [];

    const resp = await this.request<DNSRecord[]>(
      'GET',
      this.zonePath('/dns_records?per_page=100')
    );
    return resp.success ? resp.result : [];
  }

  async createDNSRecord(record: DNSRecordInput): Promise<DNSRecord | null> {
    if (!this.configured) return null;

    const resp = await this.request<DNSRecord>('POST', this.zonePath('/dns_records'), {
      type: record.type,
      name: record.name,
      content: record.content,
      ttl: record.ttl ?? 1,
      proxied: record.proxied ?? true,
    });

    if (resp.success) {
      logger.info('DNS record created', { name: record.name, type: record.type });
    }
    return resp.success ? resp.result : null;
  }

  async updateDNSRecord(
    recordId: string,
    updates: Partial<DNSRecordInput>
  ): Promise<DNSRecord | null> {
    if (!this.configured) return null;

    const resp = await this.request<DNSRecord>(
      'PUT',
      this.zonePath(`/dns_records/${recordId}`),
      updates
    );

    if (resp.success) {
      logger.info('DNS record updated', { recordId });
    }
    return resp.success ? resp.result : null;
  }

  // ─── Utility ────────────────────────────────────────────────────────────

  get isConfigured(): boolean {
    return this.configured;
  }

  private timeRangeToISO(timeRange: '1h' | '24h' | '7d'): string {
    const ms: Record<string, number> = { '1h': 3600000, '24h': 86400000, '7d': 604800000 };
    return new Date(Date.now() - (ms[timeRange] ?? 86400000)).toISOString();
  }
}

// ─── Singleton Export ────────────────────────────────────────────────────────

export const cloudflare = new CloudflareClient();
export default cloudflare;
