import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

// Judges sign in through the same /login gateway as Admins (password tab) - only
// Students use a distinct query param to preselect the phone/OTP tab.
function loginPathFor(pathname: string): string {
    if (pathname.startsWith('/student')) return '/login?mode=student';
    return '/login';
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

        // /login itself isn't under any matched prefix below, so it's never
        // intercepted by this middleware at all - always reachable by design.
        const role = req.nextauth.token?.role as string | undefined;
        if (!roleAllowed(pathname, role)) {
            const url = req.nextUrl.clone();
            const [loginPathname, loginSearch] = loginPathFor(pathname).split('?');
            url.pathname = loginPathname;
            url.search = loginSearch ? `?${loginSearch}` : '';
            return NextResponse.redirect(url);
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
            // Always let requests through to our own middleware function above -
            // it does the real role check per-prefix (the login gateway needs to stay
            // reachable for unauthenticated users, which a single static `authorized`
            // gate can't express).
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
