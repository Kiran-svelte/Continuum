/**
 * Lightweight request threat heuristics (edge-safe).
 * Complements Cloudflare WAF and parameterized Prisma queries.
 */

const SQL_INJECTION_PATTERNS = [
  /(\bunion\b.+\bselect\b)/i,
  /(\bselect\b.+\bfrom\b)/i,
  /(\bdrop\b.+\btable\b)/i,
  /(\binsert\b.+\binto\b)/i,
  /(\bdelete\b.+\bfrom\b)/i,
  /(\bor\b\s+1\s*=\s*1\b)/i,
  /(\band\b\s+1\s*=\s*1\b)/i,
  /(--|\/\*)/,
  /;\s*shutdown\b/i,
  /xp_cmdshell/i,
];

const XSS_PROBE_PATTERNS = [
  /<script\b/i,
  /javascript\s*:/i,
  /on\w+\s*=/i,
  /data\s*:\s*text\/html/i,
];

export type ThreatKind = 'sql_injection' | 'xss_probe' | 'path_traversal';

export interface ThreatMatch {
  kind: ThreatKind;
  pattern: string;
  sample: string;
}

function matchesAny(value: string, patterns: RegExp[]): ThreatMatch | null {
  for (const pattern of patterns) {
    if (pattern.test(value)) {
      return {
        kind: patterns === SQL_INJECTION_PATTERNS ? 'sql_injection' : 'xss_probe',
        pattern: pattern.source,
        sample: value.slice(0, 200),
      };
    }
  }
  return null;
}

export function scanRequestForThreats(pathname: string, search: string): ThreatMatch | null {
  const decodedPath = safeDecode(pathname);
  const target = `${decodedPath}${search}`;

  if (decodedPath.includes('..') || /%2e/i.test(pathname)) {
    return { kind: 'path_traversal', pattern: '..', sample: decodedPath.slice(0, 200) };
  }

  return matchesAny(target, SQL_INJECTION_PATTERNS) || matchesAny(target, XSS_PROBE_PATTERNS);
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
