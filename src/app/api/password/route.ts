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
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ success: false, error: 'Invalid username or password' }, { status: 401 });
        }
    } catch {
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
