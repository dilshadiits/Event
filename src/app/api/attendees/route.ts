import dbConnect from '@/lib/mongodb';
import { Attendee, InviteCode } from '@/models';
import { createAttendeeSchema, updateAttendeeSchema, sanitizeString, isValidObjectId } from '@/lib/validate';
import { errorResponse, successResponse, checkRateLimit, getClientIP } from '@/lib/api-utils';

// Helper to determine seating range based on category
const getCategoryRange = (category: string) => {
    switch (category) {
        case '1m plus': return { start: 1, end: 200 };
        case '500k to 1m': return { start: 201, end: 400 };
        case '100k to 500k': return { start: 401, end: 1000 };
        case '10k to 100k': return { start: 1001, end: 2000 };
        case '5k to 10k': return { start: 2001, end: 9999 };
        default: return null; // Guest or unknown
    }
};

const allocateSeat = async (eventId: string, category: string): Promise<string | undefined> => {
    if (category === 'Guest') return undefined;

    const range = getCategoryRange(category);
    if (!range) return undefined;

    // Find all occupied seats for this event
    const attendees = await Attendee.find({
        eventId,
        seatingNumber: { $exists: true, $ne: null }
    }).select('seatingNumber').lean();

    // Extract numeric seats within range
    const occupied = attendees
        .map(a => parseInt(a.seatingNumber as string))
        .filter(n => !isNaN(n) && n >= range.start && n <= range.end)
        .sort((a, b) => a - b);

    // Find first gap or append
    let nextSeat = range.start;
    for (const seat of occupied) {
        if (seat === nextSeat) {
            nextSeat++;
        } else if (seat > nextSeat) {
            break; // Found a gap
        }
    }

    if (nextSeat > range.end) return undefined; // Range full (unlikely but safe)
    return nextSeat.toString();
};

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
            additionalName: a.additionalName,
            seatingNumber: a.seatingNumber,
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

        const { name, email, phone, additionalName, seatingNumber, instagram, youtube, category, guest_names, meal_preference, eventId, inviteCode } = result.data;

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

        // Auto-assign seating if not provided and category exists
        let autoSeating = undefined;
        if (category && category !== 'Guest') {
            autoSeating = await allocateSeat(eventId, category);
        }

        const newAttendee = await Attendee.create({
            name: sanitizeString(name),
            additionalName: additionalName ? sanitizeString(additionalName) : undefined,
            seatingNumber: seatingNumber || autoSeating,
            email: email || undefined,
            phone: phone?.trim() || undefined,
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
            additionalName: newAttendee.additionalName,
            seatingNumber: newAttendee.seatingNumber,
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

export async function PUT(req: Request) {
    try {
        const body = await req.json();

        // Validate input with Zod
        const result = updateAttendeeSchema.safeParse(body);
        if (!result.success) {
            const message = result.error.issues.map((e) => e.message).join(', ');
            return errorResponse(message, 400);
        }

        const { id, name, additionalName, seatingNumber, email, phone, instagram, youtube, category, guest_names, meal_preference } = result.data;

        if (!isValidObjectId(id)) {
            return errorResponse('Invalid Attendee ID format', 400);
        }

        // Fetch current attendee first to get eventId for allocation if needed
        const currentAttendee = await Attendee.findById(id);
        if (!currentAttendee) return errorResponse('Attendee not found', 404);

        await dbConnect();

        // Build update object with only provided fields
        const updateData: Record<string, unknown> = {};
        if (name !== undefined) updateData.name = sanitizeString(name);
        if (additionalName !== undefined) updateData.additionalName = additionalName ? sanitizeString(additionalName) : undefined;
        if (seatingNumber !== undefined) updateData.seatingNumber = seatingNumber ? sanitizeString(seatingNumber) : undefined;
        if (email !== undefined) updateData.email = email || undefined;
        if (phone !== undefined) updateData.phone = phone?.trim() || undefined;
        if (instagram !== undefined) updateData.instagram = instagram ? sanitizeString(instagram) : undefined;
        if (youtube !== undefined) updateData.youtube = youtube ? sanitizeString(youtube) : undefined;
        if (category !== undefined) {
            const newCategory = category ? sanitizeString(category) : undefined;
            updateData.category = newCategory;

            // Re-evaluate seating if category changes
            if (newCategory === 'Guest') {
                updateData.seatingNumber = undefined;
                updateData['$unset'] = { seatingNumber: 1 };
            } else if (newCategory) {
                // Determine if we should auto-allocate a new seat
                let shouldAllocate = false;

                const passedSeat = seatingNumber ? sanitizeString(seatingNumber) : undefined;
                // If passedSeat is empty/undefined, user didn't specify a new seat -> Allocate
                // If passedSeat is same as current, user didn't change it -> Allocate for new category
                if (!passedSeat || passedSeat === currentAttendee.seatingNumber) {
                    shouldAllocate = true;
                } else {
                    // User explicitly typed a DIFFERENT seat -> Respect it
                    updateData.seatingNumber = passedSeat;
                }

                if (shouldAllocate) {
                    const newSeat = await allocateSeat(currentAttendee?.eventId.toString() || '', newCategory);
                    if (newSeat) updateData.seatingNumber = newSeat;
                }
            }
        } else {
            // Category not changing, standard update for seat
            if (seatingNumber !== undefined) updateData.seatingNumber = seatingNumber ? sanitizeString(seatingNumber) : undefined;
        }
        if (guest_names !== undefined) updateData.guest_names = guest_names ? sanitizeString(guest_names) : undefined;
        if (meal_preference !== undefined) updateData.meal_preference = meal_preference;

        // Execute update

        const updatedAttendee = await Attendee.findByIdAndUpdate(
            id,
            { $set: updateData, ...(updateData['$unset'] ? { $unset: updateData['$unset'] } : {}) },
            { new: true }
        ).lean();

        if (!updatedAttendee) {
            return errorResponse('Attendee not found', 404);
        }

        return successResponse({
            id: updatedAttendee._id.toString(),
            name: updatedAttendee.name,
            additionalName: updatedAttendee.additionalName,
            seatingNumber: updatedAttendee.seatingNumber,
            email: updatedAttendee.email,
            phone: updatedAttendee.phone,
            instagram: updatedAttendee.instagram,
            youtube: updatedAttendee.youtube,
            category: updatedAttendee.category,
            guest_names: updatedAttendee.guest_names,
            meal_preference: updatedAttendee.meal_preference,
            eventId: updatedAttendee.eventId,
            status: updatedAttendee.status
        });
    } catch (error) {
        console.error('[Attendees PUT]', error);
        return errorResponse('Failed to update attendee');
    }
}
