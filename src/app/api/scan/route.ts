import dbConnect from '@/lib/mongodb';
import { Attendee } from '@/models';
import { scanDataSchema, isValidObjectId } from '@/lib/validate';
import { errorResponse, successResponse } from '@/lib/api-utils';

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Validate input with Zod
        const result = scanDataSchema.safeParse(body);
        if (!result.success) {
            const message = result.error.issues.map((e) => e.message).join(', ');
            return errorResponse(message, 400);
        }

        const { scanData, eventId } = result.data;

        // Validate ObjectId format
        if (!isValidObjectId(scanData)) {
            return successResponse({
                success: false,
                message: 'Invalid QR Code Format.'
            });
        }

        await dbConnect();

        const attendee = await Attendee.findById(scanData);

        if (!attendee) {
            return successResponse({
                success: false,
                message: 'Invalid QR Code: Attendee not found.'
            });
        }

        // Verify Event ID match (if provided)
        if (eventId && attendee.eventId.toString() !== eventId) {
            return successResponse({
                success: false,
                message: 'Error: This ticket belongs to a different event.'
            });
        }

        // Check if already checked in
        if (attendee.status === 'checked-in') {
            return successResponse({
                success: false,
                message: `Already checked in at ${new Date(attendee.checked_in_at).toLocaleTimeString()}`,
                attendee: { ...attendee.toObject(), id: attendee._id.toString() }
            });
        }

        // Mark as checked in
        attendee.status = 'checked-in';
        attendee.checked_in_at = new Date();
        await attendee.save();

        return successResponse({
            success: true,
            message: 'Check-in Successful!',
            attendee: { ...attendee.toObject(), id: attendee._id.toString() }
        });

    } catch (error) {
        console.error('[Scan POST]', error);
        return errorResponse('Processing failed');
    }
}
