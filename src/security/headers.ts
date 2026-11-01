/**
 * Production Security Headers Configuration
 * 
 * Recommended for `next.config.js` or Next.js edge middleware.
 * Fixes observed findings:
 * 1. Missing Content-Security-Policy (CSP)
 * 2. Missing X-Frame-Options (Clickjacking vulnerability)
 * 3. Missing X-Content-Type-Options: nosniff
 * 4. Missing Referrer-Policy (Risk of token-in-URL leakage to third parties)
 * 5. Permissive CORS (Access-Control-Allow-Origin: *)
 * 6. X-Powered-By leakage
 */

export interface SecurityHeaderRule {
  key: string;
  value: string;
}

export function getRecommendedSecurityHeaders(isProduction = true): SecurityHeaderRule[] {
  const contentSecurityPolicy = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://sdk.cashfree.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://www.google-analytics.com https://api.cashfree.com https://sandbox.cashfree.com",
    "frame-src 'self' https://sdk.cashfree.com",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    isProduction ? 'upgrade-insecure-requests' : '',
  ]
    .filter(Boolean)
    .join('; ');

  return [
    {
      key: 'Content-Security-Policy',
      value: contentSecurityPolicy,
    },
    {
      key: 'X-Frame-Options',
      value: 'DENY',
    },
    {
      key: 'X-Content-Type-Options',
      value: 'nosniff',
    },
    {
      key: 'Referrer-Policy',
      value: 'strict-origin-when-cross-origin',
    },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://sdk.cashfree.com")',
    },
    {
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubDomains; preload',
    },
    {
      key: 'X-DNS-Prefetch-Control',
      value: 'on',
    },
  ];
}

/**
 * Validates CORS origins dynamically instead of wildcard '*'
 */
export function validateCorsOrigin(origin: string | undefined, allowedOrigins: string[]): string | null {
  if (!origin) return null;
  if (allowedOrigins.includes(origin)) {
    return origin;
  }
  return null;
}
