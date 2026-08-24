import { NextResponse } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';
import { verifySessionToken, COOKIE_NAME } from '@/lib/auth';

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Allow static assets, icons, next system files
  if (
    pathname.startsWith('/_next') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return await updateSession(request);
  }

  // Allow public auth API endpoints (login)
  if (pathname === '/api/auth/login') {
    return await updateSession(request);
  }

  // Read session cookie
  const sessionToken = request.cookies.get(COOKIE_NAME)?.value;
  // Legacy cookie fallback for existing active browser sessions during transition
  const legacyAuth = request.cookies.get('nfsti_authenticated')?.value === 'true';

  const session = await verifySessionToken(sessionToken);
  const isAuthenticated = Boolean(session || legacyAuth);

  // Secure API routes: return 401 JSON if not authenticated
  if (pathname.startsWith('/api')) {
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized access. Please log in.' },
        { status: 401 }
      );
    }
    return await updateSession(request);
  }

  // Application Page Routes Protection
  const isAuthPage = pathname === '/auth/admin/login' || pathname === '/login';

  if (!isAuthenticated && !isAuthPage) {
    const loginUrl = new URL('/auth/admin/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated user away from login pages to dashboard /
  if (isAuthenticated && isAuthPage) {
    const homeUrl = new URL('/', request.url);
    return NextResponse.redirect(homeUrl);
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
