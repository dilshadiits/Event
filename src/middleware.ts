import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define public endpoints that do NOT require authentication
const publicPaths = [
  '/api/auth',          // NextAuth endpoints
  '/api/proxy-image',   // Public rendering of pass
  '/api/votes',         // Public voting & leaderboard
  '/api/award-votes',   // Public voting & leaderboard
  '/api/password',      // Login endpoint
  '/api/logout',        // Logout endpoint
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // 1. Allow non-API routes
  if (!pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // 2. Allow explicitly public paths
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // 3. Allow specific methods on certain paths for public actions
  if (pathname.startsWith('/api/attendees') && method === 'POST') {
    // Public event registration
    return NextResponse.next();
  }
  
  if (pathname.startsWith('/api/attendees') && method === 'GET') {
    // Public fetch of attendees for voting
    return NextResponse.next();
  }
  
  if (pathname.startsWith('/api/events') && method === 'GET') {
    // Public event details fetch for registration page
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/categories') && method === 'GET') {
    // Public fetch of categories for voting
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/nominees') && method === 'GET') {
    // Public fetch of nominees for voting
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/awards') && method === 'GET') {
    // Public fetch of standalone awards
    return NextResponse.next();
  }

  // 4. Any other /api/* request is PROTECTED and requires the admin token
  const token = request.cookies.get('admin_auth_token')?.value;
  
  if (!token) {
    return new NextResponse(
      JSON.stringify({ success: false, error: 'Unauthorized: Missing token' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Verify the token
  try {
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'king@2026';
    const secret = process.env.NEXTAUTH_SECRET || 'fallback_secret';
    
    const encoder = new TextEncoder();
    const data = encoder.encode(ADMIN_PASSWORD + secret);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const expectedToken = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (token !== expectedToken) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (err) {
    return new NextResponse(
      JSON.stringify({ success: false, error: 'Unauthorized: Verification failed' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
