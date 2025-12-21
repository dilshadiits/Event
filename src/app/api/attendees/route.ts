import dbConnect from '@/lib/mongodb';
import { Attendee, InviteCode } from '@/models';
import { createAttendeeSchema, sanitizeString, isValidObjectId } from '@/lib/validate';
import { errorResponse, successResponse, checkRateLimit, getClientIP } from '@/lib/api-utils';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');

        if (!eventId) {
            return errorResponse('Event ID required', 400);
        }

        if (!isValidObjectId(eventId)) {
            return errorResponse('Invalid Event ID format', 400);
        }

        await dbConnect();
        const attendees = await Attendee.find({ eventId }).sort({ created_at: -1 }).lean();

        const formatted = attendees.map(a => ({
            id: a._id.toString(),
            name: a.name,
            email: a.email,
            phone: a.phone,
            instagram: a.instagram,
            youtube: a.youtube,
            category: a.category,
            guest_names: a.guest_names,
            meal_preference: a.meal_preference,
            eventId: a.eventId,
            status: a.status,
            checked_in_at: a.checked_in_at,
            created_at: a.created_at
        }));

        return successResponse(formatted);
    } catch (error) {
        console.error('[Attendees GET]', error);
        return errorResponse('Failed to fetch attendees');
    }
}

export async function POST(req: Request) {
    try {
        // Rate limiting: 10 registrations per minute per IP
        const clientIP = getClientIP(req);
        const rateLimit = checkRateLimit(`attendee:${clientIP}`, 10, 60000);

        if (!rateLimit.allowed) {
            return errorResponse('Too many requests. Please try again later.', 429);
        }

        const body = await req.json();

        // Validate input with Zod
        const result = createAttendeeSchema.safeParse(body);
        if (!result.success) {
            const message = result.error.issues.map((e) => e.message).join(', ');
            return errorResponse(message, 400);
        }

        const { name, email, phone, instagram, youtube, category, guest_names, meal_preference, eventId, inviteCode } = result.data;

        if (!isValidObjectId(eventId)) {
            return errorResponse('Invalid Event ID format', 400);
        }

        await dbConnect();

        // Validate Invite Code (if provided)
        if (inviteCode) {
            const invite = await InviteCode.findOne({ code: inviteCode, eventId });

            if (!invite) {
                return errorResponse('Invalid invite code.', 400);
            }

            if (invite.isUsed) {
                return errorResponse('This invite link has already been used.', 409);
            }
        }

        const newAttendee = await Attendee.create({
            name: sanitizeString(name),
            email: email || undefined,
            phone: phone.trim(),
            instagram: instagram ? sanitizeString(instagram) : undefined,
            youtube: youtube ? sanitizeString(youtube) : undefined,
            category: category ? sanitizeString(category) : undefined,
            guest_names: guest_names ? sanitizeString(guest_names) : undefined,
            meal_preference,
            eventId
        });

        // Consume Invite Code
        if (inviteCode) {
            await InviteCode.updateOne({ code: inviteCode }, { isUsed: true });
        }

        return successResponse({
            id: newAttendee._id.toString(),
            name: newAttendee.name,
            email: newAttendee.email,
            phone: newAttendee.phone,
            instagram: newAttendee.instagram,
            youtube: newAttendee.youtube,
            category: newAttendee.category,
            guest_names: newAttendee.guest_names,
            meal_preference: newAttendee.meal_preference,
            eventId: newAttendee.eventId,
            status: newAttendee.status
        }, 201);
    } catch (error) {
        console.error('[Attendees POST]', error);
        return errorResponse('Failed to register attendee');
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return errorResponse('Attendee ID required', 400);
        }

        if (!isValidObjectId(id)) {
            return errorResponse('Invalid Attendee ID format', 400);
        }

        await dbConnect();
        const deletedAttendee = await Attendee.findByIdAndDelete(id);

        if (!deletedAttendee) {
            return errorResponse('Attendee not found', 404);
        }

        return successResponse({ success: true });
    } catch (error) {
        console.error('[Attendees DELETE]', error);
        return errorResponse('Failed to delete attendee');
    }
}
