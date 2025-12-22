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

        // Check if this is a guest QR code (format: {attendeeId}-GUEST-{number})
        const isGuestQR = scanData.includes('-GUEST-');
        let attendeeId = scanData;

        if (isGuestQR) {
            const parts = scanData.split('-GUEST-');
            attendeeId = parts[0];
        }

        // Validate ObjectId format
        if (!isValidObjectId(attendeeId)) {
            return successResponse({
                success: false,
                message: 'Invalid QR Code Format.'
            });
        }

        await dbConnect();

        const attendee = await Attendee.findById(attendeeId);

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

        // For guest QR codes, verify the attendee has a guest registered
        if (isGuestQR) {
            if (!attendee.guest_names || !attendee.guest_names.trim()) {
                return successResponse({
                    success: false,
                    message: 'Invalid Guest QR: No guest registered for this attendee.'
                });
            }

            // Check if guest already checked in
            if (attendee.guest_checked_in) {
                return successResponse({
                    success: false,
                    message: `Guest already checked in at ${new Date(attendee.guest_checked_in_at).toLocaleTimeString()}`,
                    attendee: {
                        name: attendee.guest_names,
                        email: `Guest of ${attendee.name}`,
                        guest_names: ''
                    }
                });
            }

            // Mark guest as checked in
            attendee.guest_checked_in = true;
            attendee.guest_checked_in_at = new Date();
            await attendee.save();

            return successResponse({
                success: true,
                message: 'Guest Check-in Successful!',
                attendee: {
                    name: attendee.guest_names,
                    email: `Guest of ${attendee.name}`,
                    guest_names: ''
                }
            });
        }

        // Check if main attendee already checked in
        if (attendee.status === 'checked-in') {
            return successResponse({
                success: false,
                message: `Already checked in at ${new Date(attendee.checked_in_at).toLocaleTimeString()}`,
                attendee: { ...attendee.toObject(), id: attendee._id.toString() }
            });
        }

        // Mark main attendee as checked in
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
