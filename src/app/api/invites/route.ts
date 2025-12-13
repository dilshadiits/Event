import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { InviteCode } from '@/models';
import crypto from 'crypto';

export async function POST(req: Request) {
    try {
        const { eventId } = await req.json();

        if (!eventId) {
            return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
        }

        await dbConnect();

        // Generate a random 6-char code
        const code = crypto.randomBytes(3).toString('hex');

        const invite = await InviteCode.create({
            code,
            eventId,
            isUsed: false
        });

        return NextResponse.json({ code: invite.code });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
    }
}
