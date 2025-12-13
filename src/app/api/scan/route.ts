import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Attendee } from '@/models';

export async function POST(req: Request) {
    try {
        // scanData should be the attendee ID (MongoDB _id)
        const { scanData, eventId } = await req.json();

        if (!scanData) {
            return NextResponse.json({ error: 'No scan data provided' }, { status: 400 });
        }

        await dbConnect();

        // 1. Check if attendee exists
        // Handle invalid ObjectId format
        if (!scanData.match(/^[0-9a-fA-F]{24}$/)) {
            return NextResponse.json({
                success: false,
                message: 'Invalid QR Code Format.'
            });
        }

        const attendee = await Attendee.findById(scanData);

        if (!attendee) {
            return NextResponse.json({
                success: false,
                message: 'Invalid QR Code: Attendee not found.'
            });
        }

        // 1.5 Verify Event ID match (if provided)
        if (eventId && attendee.eventId.toString() !== eventId) {
            return NextResponse.json({
                success: false,
                message: 'Error: This ticket belongs to a different event.'
            });
        }

        // 2. Check if already checked in
        if (attendee.status === 'checked-in') {
            return NextResponse.json({
                success: false,
                message: `Already checked in at ${new Date(attendee.checked_in_at).toLocaleTimeString()}`,
                attendee: { ...attendee.toObject(), id: attendee._id.toString() }
            });
        }

        // 3. Mark as checked in
        attendee.status = 'checked-in';
        attendee.checked_in_at = new Date();
        await attendee.save();

        return NextResponse.json({
            success: true,
            message: 'Check-in Successful!',
            attendee: { ...attendee.toObject(), id: attendee._id.toString() }
        });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
    }
}
