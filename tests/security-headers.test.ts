import { describe, it, expect } from 'vitest';
import { getRecommendedSecurityHeaders, validateCorsOrigin } from '../src/security/headers.js';

describe('HTTP Security Headers & CORS Isolation', () => {
  it('generates all OWASP-recommended security headers', () => {
    const headers = getRecommendedSecurityHeaders(true);
    const headerMap = new Map(headers.map((h) => [h.key, h.value]));

    // 1. Content Security Policy
    expect(headerMap.has('Content-Security-Policy')).toBe(true);
    const csp = headerMap.get('Content-Security-Policy') || '';
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");

    // 2. Clickjacking protection
    expect(headerMap.get('X-Frame-Options')).toBe('DENY');

    // 3. MIME sniffing protection
    expect(headerMap.get('X-Content-Type-Options')).toBe('nosniff');

    // 4. Referrer protection (prevents secret URL path leakage)
    expect(headerMap.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');

    // 5. HSTS
    expect(headerMap.get('Strict-Transport-Security')).toContain('max-age=63072000');
  });

  it('restricts CORS origin validation to explicitly approved origins', () => {
    const allowed = ['https://cynbit.in', 'https://www.cynbit.in'];

    expect(validateCorsOrigin('https://cynbit.in', allowed)).toBe('https://cynbit.in');
    expect(validateCorsOrigin('https://www.cynbit.in', allowed)).toBe('https://www.cynbit.in');
    
    // Attacker origin must be rejected
    expect(validateCorsOrigin('https://evil-attacker.com', allowed)).toBeNull();
    expect(validateCorsOrigin(undefined, allowed)).toBeNull();
  });
});
