import dbConnect from '@/lib/mongodb';
import { InviteCode } from '@/models';
import { createInviteSchema, isValidObjectId } from '@/lib/validate';
import { errorResponse, successResponse, checkRateLimit, getClientIP } from '@/lib/api-utils';
import crypto from 'crypto';

export async function POST(req: Request) {
    try {
        // Rate limiting: 20 invite codes per minute per IP
        const clientIP = getClientIP(req);
        const rateLimit = checkRateLimit(`invite:${clientIP}`, 20, 60000);

        if (!rateLimit.allowed) {
            return errorResponse('Too many requests. Please try again later.', 429);
        }

        const body = await req.json();

        // Validate input with Zod
        const result = createInviteSchema.safeParse(body);
        if (!result.success) {
            const message = result.error.issues.map((e) => e.message).join(', ');
            return errorResponse(message, 400);
        }

        const { eventId } = result.data;

        if (!isValidObjectId(eventId)) {
            return errorResponse('Invalid Event ID format', 400);
        }

        await dbConnect();

        // Generate a random 6-char code
        const code = crypto.randomBytes(3).toString('hex');

        const invite = await InviteCode.create({
            code,
            eventId,
            isUsed: false
        });

        return successResponse({ code: invite.code });
    } catch (error) {
        console.error('[Invites POST]', error);
        return errorResponse('Failed to create invite');
    }
}
