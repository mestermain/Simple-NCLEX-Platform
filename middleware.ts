import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET_KEY || process.env.JWT_SECRET || 'simple-nclex-platform-dev-secret-key-change-in-prod-2026';

interface DecodedToken {
  id: number;
  email: string;
  role: 'admin' | 'student';
  exp?: number;
}

/**
 * Edge-compatible JWT verification using standard Web Crypto API.
 */
async function verifyJwt(token: string): Promise<DecodedToken | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const encoder = new TextEncoder();

    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Decode base64url signature
    const base64Sig = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
    const binarySig = Uint8Array.from(atob(base64Sig), c => c.charCodeAt(0));
    const data = encoder.encode(`${headerB64}.${payloadB64}`);

    const isValid = await crypto.subtle.verify('HMAC', key, binarySig, data);
    if (!isValid) return null;

    // Decode payload
    const base64Payload = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64Payload));

    // Expiry check
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }

    return {
      id: payload.id || payload.sub,
      email: payload.email,
      role: payload.role || 'student',
      exp: payload.exp,
    };
  } catch (err) {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. CSRF Protection for state-mutating API requests
  if (pathname.startsWith('/api/') && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const origin = req.headers.get('origin');
    const host = req.headers.get('host');

    // If an Origin header is provided by the browser, verify it matches the current host
    if (origin && host) {
      try {
        const originUrl = new URL(origin);
        if (originUrl.host !== host) {
          return NextResponse.json(
            { success: false, message: 'Cross-Site Request Forgery blocked.' },
            { status: 403 }
          );
        }
      } catch (_) {
        return NextResponse.json(
          { success: false, message: 'Invalid request origin.' },
          { status: 403 }
        );
      }
    }
  }

  // Extract auth token from cookie or Authorization header
  let token = req.cookies.get('nclex_token')?.value || '';
  if (!token) {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
  }

  const session = token ? await verifyJwt(token) : null;

  // 2. Admin API Protection: /api/admin/*
  if (pathname.startsWith('/api/admin')) {
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Authentication required to access administrative API.' },
        { status: 401 }
      );
    }
    if (session.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Administrator privileges required.' },
        { status: 403 }
      );
    }
    return NextResponse.next();
  }

  // 3. Admin Page Protection: /admin and /admin/*
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (!session) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('returnUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (session.role !== 'admin') {
      return new NextResponse(
        `<!DOCTYPE html>
        <html lang="en">
          <head>
            <title>403 Forbidden | Simple NCLEX Academy</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: system-ui, sans-serif; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .card { background: #1e293b; padding: 2.5rem; border-radius: 1rem; border: 1px solid #334155; text-align: center; max-width: 420px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
              h1 { font-size: 2rem; color: #f43f5e; margin-bottom: 0.5rem; }
              p { color: #94a3b8; font-size: 0.875rem; line-height: 1.5; margin-bottom: 1.5rem; }
              a { display: inline-block; background: #0284c7; color: white; padding: 0.75rem 1.5rem; border-radius: 0.5rem; text-decoration: none; font-weight: bold; font-size: 0.875rem; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>403 Forbidden</h1>
              <p>You are authenticated as a candidate student. Administrator privileges are required to view the faculty administration panel.</p>
              <a href="/profile">Return to Student Portal</a>
            </div>
          </body>
        </html>`,
        { status: 403, headers: { 'Content-Type': 'text/html' } }
      );
    }
    return NextResponse.next();
  }

  // 4. Student API Protection: /api/student/*
  if (pathname.startsWith('/api/student')) {
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Authentication required.' },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // 5. Student Profile Page Protection: /profile and /profile/*
  if (pathname === '/profile' || pathname.startsWith('/profile/')) {
    if (!session) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('returnUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/admin',
    '/profile/:path*',
    '/profile',
    '/api/admin/:path*',
    '/api/student/:path*',
  ],
};
