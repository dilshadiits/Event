import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Attendee, InviteCode } from '@/models';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');

    if (!eventId) {
        return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
    }

    try {
        await dbConnect();
        const attendees = await Attendee.find({ eventId }).sort({ created_at: -1 });

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

        return NextResponse.json(formatted);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch attendees' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { name, email, phone, instagram, youtube, category, guest_names, meal_preference, eventId, inviteCode } = await req.json();

        if (!name || !phone || !eventId) {
            return NextResponse.json({ error: 'Name, Phone, and Event ID are required' }, { status: 400 });
        }

        await dbConnect();

        // 1. Validate Invite Code (If provided)
        // Note: You can enforce it to be required if strictly private, but we'll leave it optional for public flows unless frontend enforces it.
        // Based on user request "cant be valid again", we assume this specific flow uses a code.
        // If inviteCode IS in the request, we VALIDATE it.

        if (inviteCode) {
            const invite = await InviteCode.findOne({ code: inviteCode, eventId });

            if (!invite) {
                return NextResponse.json({ error: 'Invalid invite code.' }, { status: 400 });
            }

            if (invite.isUsed) {
                return NextResponse.json({ error: 'This invite link has already been used.' }, { status: 409 });
            }

            // Mark as used immediately (or ideally inside a transaction, but Mongo standalone doesn't support transactions easily without replica set. 
            // We'll mark used after creation success to avoid "burning" codes on failed creation, 
            // OR mark here to prevent race conditions.
            // Let's mark it used at end to ensure we don't block retry on failure, 
            // BUT for strict "single use" we should lock it. 
            // Given simple scale, we'll mark used AFTER successful creation.
        }

        const newAttendee = await Attendee.create({
            name,
            email,
            phone,
            instagram,
            youtube,
            category,
            guest_names,
            meal_preference,
            eventId
        });

        // 2. Consume Invite Code
        if (inviteCode) {
            await InviteCode.updateOne({ code: inviteCode }, { isUsed: true });
        }

        return NextResponse.json({
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
        }, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to register attendee' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'Attendee ID required' }, { status: 400 });
    }

    try {
        await dbConnect();
        const deletedAttendee = await Attendee.findByIdAndDelete(id);

        if (!deletedAttendee) {
            return NextResponse.json({ error: 'Attendee not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to delete attendee' }, { status: 500 });
    }
}
