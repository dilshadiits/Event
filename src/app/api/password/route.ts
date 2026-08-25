import { NextRequest, NextResponse } from 'next/server';

// Password verification for admin access
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { username, password } = body;

        // Get credentials from environment or defaults
        const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
        const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'super123';

        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            // Generate a secure token
            const encoder = new TextEncoder();
            const secret = process.env.NEXTAUTH_SECRET || 'fallback_secret';
            const data = encoder.encode(ADMIN_PASSWORD + secret);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const token = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            const response = NextResponse.json({ success: true });
            
            // Set HttpOnly cookie
            response.cookies.set({
                name: 'admin_auth_token',
                value: token,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 60 * 60 * 24 * 7 // 7 days
            });

            return response;
        } else {
            return NextResponse.json({ success: false, error: 'Invalid username or password' }, { status: 401 });
        }
    } catch {
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
