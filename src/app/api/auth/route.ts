import { NextRequest, NextResponse } from 'next/server';

// Default password - can be overridden via environment variable APP_PASSWORD
const APP_PASSWORD = process.env.APP_PASSWORD || 'admin123';

export async function POST(req: NextRequest) {
    try {
        const { password } = await req.json();

        if (!password) {
            return NextResponse.json({ error: 'Password is required' }, { status: 400 });
        }

        if (password === APP_PASSWORD) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
        }
    } catch {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}
