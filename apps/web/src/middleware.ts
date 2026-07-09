import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Per-request Content-Security-Policy with a nonce.
 *
 * Why middleware (not next.config headers): a strict `script-src` that drops
 * `'unsafe-inline'` needs a fresh nonce per response, and the Next.js App Router only
 * applies that nonce to its own hydration/streaming scripts when it reads the CSP from the
 * *request* headers. `'strict-dynamic'` then lets those trusted scripts load the rest
 * (chunks, Tone.js dynamic imports) without a host allowlist.
 *
 * `style-src` still allows `'unsafe-inline'` because the app uses inline `style={{}}`
 * attributes (dynamic colors, the scanline position); that's a style vector, not the
 * script-execution vector that matters for token exfiltration.
 */
export function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const isDev = process.env.NODE_ENV !== 'production';

  const scriptSrc = isDev
    ? // Next dev/HMR + React Refresh need eval; never in production.
      `'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`
    : `'self' 'nonce-${nonce}' 'strict-dynamic'`;

  const csp = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https: wss:",
    "media-src 'self' blob: data:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');

  // Propagate the nonce + CSP on the request so Next tags its scripts with the nonce.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  // Enforce it in the browser.
  response.headers.set('content-security-policy', csp);
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets, image optimization, and the favicon.
     * Also skip prefetch requests (they don't render HTML that needs a nonce).
     */
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
