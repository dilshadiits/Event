import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

const LOGIN_PATHS = ['/admin/competitions/login', '/judge/login', '/student/login'];

function loginPathFor(pathname: string): string | null {
    if (pathname.startsWith('/product-admin')) return '/admin/competitions/login';
    if (pathname.startsWith('/admin/competitions')) return '/admin/competitions/login';
    if (pathname.startsWith('/judge')) return '/judge/login';
    if (pathname.startsWith('/student')) return '/student/login';
    return null;
}

function roleAllowed(pathname: string, role: string | undefined): boolean {
    if (pathname.startsWith('/product-admin')) return role === 'product-admin';
    if (pathname.startsWith('/admin/competitions')) return role === 'product-admin' || role === 'super-admin' || role === 'event-admin';
    if (pathname.startsWith('/judge')) return role === 'judge' || role === 'super-admin';
    if (pathname.startsWith('/student')) return role === 'student';
    return true;
}

export default withAuth(
    function middleware(req) {
        const { pathname } = req.nextUrl;

        // Login pages themselves are always reachable, whether or not a session exists.
        if (LOGIN_PATHS.includes(pathname)) {
            return NextResponse.next();
        }

        const role = req.nextauth.token?.role as string | undefined;
        if (!roleAllowed(pathname, role)) {
            const loginPath = loginPathFor(pathname);
            if (loginPath) {
                const url = req.nextUrl.clone();
                url.pathname = loginPath;
                url.search = '';
                return NextResponse.redirect(url);
            }
        }

        // A Super Admin who hasn't finished onboarding (no organization yet) gets
        // routed to create one before they can reach the admin console.
        if (
            role === 'super-admin' &&
            !req.nextauth.token?.organizationId &&
            pathname.startsWith('/admin/competitions')
        ) {
            const url = req.nextUrl.clone();
            url.pathname = '/onboarding/organization';
            url.search = '';
            return NextResponse.redirect(url);
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            // Always let requests through to our own middleware function above —
            // it does the real role check per-prefix (login pages need to stay reachable
            // for unauthenticated users, which a single static `authorized` gate can't express).
            authorized: () => true,
        },
    }
);

export const config = {
    matcher: [
        '/admin/competitions/:path*',
        '/judge/:path*',
        '/student/:path*',
        '/product-admin/:path*',
    ],
};
