import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Event, Attendee } from '@/models';

export async function GET() {
    try {
        await dbConnect();
        const events = await Event.find({}).sort({ created_at: -1 });

        // Convert _id to id for frontend compatibility if needed, 
        // but Mongoose returns _id. Frontend expects 'id'.
        // Let's map it or ensure frontend handles _id.
        const formatted = events.map(e => ({
            id: e._id.toString(),
            name: e.name,
            date: e.date,
            created_at: e.created_at
        }));

        return NextResponse.json(formatted);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { name, date } = await req.json();

        if (!name || !date) {
            return NextResponse.json({ error: 'Name and Date are required' }, { status: 400 });
        }

        await dbConnect();
        const newEvent = await Event.create({ name, date });

        return NextResponse.json({
            id: newEvent._id.toString(),
            name: newEvent.name,
            date: newEvent.date
        }, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
    }

    try {
        await dbConnect();

        // Delete all attendees associated with this event
        await Attendee.deleteMany({ eventId: id });

        // Delete the event itself
        const deletedEvent = await Event.findByIdAndDelete(id);

        if (!deletedEvent) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
    }
}
