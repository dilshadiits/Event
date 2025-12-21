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
