/**
 * Production security response headers (edge-safe — no Node crypto imports).
 */

const CONTENT_SECURITY_POLICY =
  "default-src 'self'; " +
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sdk.cashfree.com https://checkout.razorpay.com https://static.cloudflareinsights.com; " +
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
  "img-src 'self' data: https:; " +
  "font-src 'self' data: https://fonts.gstatic.com; " +
  "connect-src 'self' https://accounts.google.com wss://*.pusher.com https://*.pusher.com https://api.cashfree.com https://sandbox.cashfree.com https://api.razorpay.com https://cloudflareinsights.com https://*.cloudflareinsights.com; " +
  "frame-src 'self' https://accounts.google.com https://api.cashfree.com https://sandbox.cashfree.com https://api.razorpay.com;";

export function getProductionSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'Content-Security-Policy': CONTENT_SECURITY_POLICY,
    'X-DNS-Prefetch-Control': 'off',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-site',
    'X-Permitted-Cross-Domain-Policies': 'none',
  };
}
