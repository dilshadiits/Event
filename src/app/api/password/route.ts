import { NextRequest, NextResponse } from 'next/server';

// Password verification for admin access
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { password } = body;

        // Get the admin password from environment
        const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

        if (password === ADMIN_PASSWORD) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
        }
    } catch {
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
