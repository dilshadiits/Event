import dbConnect from '@/lib/mongodb';
import { Event, Attendee } from '@/models';
import { createEventSchema, sanitizeString, isValidObjectId } from '@/lib/validate';
import { errorResponse, successResponse } from '@/lib/api-utils';

export async function GET() {
    try {
        await dbConnect();
        const events = await Event.find({}).sort({ created_at: -1 }).lean();

        const formatted = events.map(e => ({
            id: e._id.toString(),
            name: e.name,
            date: e.date,
            registrationOpen: e.registrationOpen ?? true,
            created_at: e.created_at
        }));

        return successResponse(formatted);
    } catch (error) {
        console.error('[Events GET]', error);
        return errorResponse('Failed to fetch events');
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Validate input with Zod
        const result = createEventSchema.safeParse(body);
        if (!result.success) {
            const message = result.error.issues.map((e) => e.message).join(', ');
            return errorResponse(message, 400);
        }

        const { name, date } = result.data;

        await dbConnect();
        const newEvent = await Event.create({
            name: sanitizeString(name),
            date
        });

        return successResponse({
            id: newEvent._id.toString(),
            name: newEvent.name,
            date: newEvent.date
        }, 201);
    } catch (error) {
        console.error('[Events POST]', error);
        return errorResponse('Failed to create event');
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return errorResponse('Event ID required', 400);
        }

        if (!isValidObjectId(id)) {
            return errorResponse('Invalid Event ID format', 400);
        }

        await dbConnect();

        // Delete all attendees associated with this event
        await Attendee.deleteMany({ eventId: id });

        // Delete the event itself
        const deletedEvent = await Event.findByIdAndDelete(id);

        if (!deletedEvent) {
            return errorResponse('Event not found', 404);
        }

        return successResponse({ success: true });
    } catch (error) {
        console.error('[Events DELETE]', error);
        return errorResponse('Failed to delete event');
    }
}

// Helper to get category priority for sorting
const getCategoryPriority = (category?: string): number => {
    switch (category) {
        case '1m plus': return 1;
        case '500k to 1m': return 2;
        case '100k to 500k': return 3;
        case '10k to 100k': return 4;
        case '5k to 10k': return 5;
        case 'Guest': return 6;
        default: return 7;
    }
};

export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { id, registrationOpen } = body;

        if (!id) {
            return errorResponse('Event ID required', 400);
        }

        if (!isValidObjectId(id)) {
            return errorResponse('Invalid Event ID format', 400);
        }

        await dbConnect();

        const event = await Event.findById(id);
        if (!event) {
            return errorResponse('Event not found', 404);
        }

        // If stopping registration, finalize seats in order
        if (registrationOpen === false && event.registrationOpen !== false) {
            // Get all attendees for this event
            const attendees = await Attendee.find({ eventId: id }).lean();

            // Sort by category priority
            const sorted = [...attendees].sort((a, b) =>
                getCategoryPriority(a.category as string) - getCategoryPriority(b.category as string)
            );

            // Reassign seats sequentially (1, 2, 3, ...)
            for (let i = 0; i < sorted.length; i++) {
                const attendee = sorted[i];
                // Skip guests - they don't get seats
                if (attendee.category === 'Guest') {
                    await Attendee.findByIdAndUpdate(attendee._id, {
                        $unset: { seatingNumber: 1 }
                    });
                } else {
                    await Attendee.findByIdAndUpdate(attendee._id, {
                        seatingNumber: (i + 1).toString()
                    });
                }
            }
        }

        // Update registration status
        event.registrationOpen = registrationOpen;
        await event.save();

        return successResponse({
            id: event._id.toString(),
            name: event.name,
            date: event.date,
            registrationOpen: event.registrationOpen,
            message: registrationOpen ? 'Registration opened' : 'Registration closed and seats finalized'
        });
    } catch (error) {
        console.error('[Events PUT]', error);
        return errorResponse('Failed to update event');
    }
}
