import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';
  
  // Use the documented fallback: keep 'unsafe-inline' ONLY for style-src
  // For script-src: 'self' 'nonce-${nonce}' plus conditionally 'unsafe-eval' in dev
  const scriptSrc = isDev 
    ? `script-src 'self' 'nonce-${nonce}' 'unsafe-eval';` 
    : `script-src 'self' 'nonce-${nonce}';`;

  const cspHeader = `default-src 'self'; ${scriptSrc} style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self' https://generativelanguage.googleapis.com https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none';`;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspHeader);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set('Content-Security-Policy', cspHeader);
  return response;
}

export const config = {
  matcher: [
    // Apply proxy to page routes, skipping static files/images/api/favicon
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
