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

        // Check if this is a guest QR code (formats: {attendeeId}-GUEST-{number} or {attendeeId}_guest_{guestName})
        const isOldGuestFormat = scanData.includes('-GUEST-');
        const isNewGuestFormat = scanData.includes('_guest_');
        const isGuestQR = isOldGuestFormat || isNewGuestFormat;
        
        // Handle full URLs from older QR codes (extract ID)
        let rawData = scanData.trim();
        try {
            if (rawData.startsWith('http://') || rawData.startsWith('https://')) {
                const url = new URL(rawData);
                const idParam = url.searchParams.get('id');
                const eventIdParam = url.searchParams.get('eventId');
                if (idParam) {
                    rawData = idParam;
                }
            }
        } catch (e) {
            // Ignore URL parsing errors
        }

        let attendeeId = rawData;
        let guestName = '';


        if (isOldGuestFormat) {
            const parts = scanData.split('-GUEST-');
            attendeeId = parts[0];
        } else if (isNewGuestFormat) {
            const parts = scanData.split('_guest_');
            attendeeId = parts[0];
            guestName = parts[1] || '';
        }

        // Validate ObjectId format
        if (!isValidObjectId(attendeeId)) {
            return successResponse({
                success: false,
                message: 'Invalid QR Code Format.'
            });
        }

        await dbConnect();

        // Lean query — returns plain JS object, ~3-5x faster than full hydration
        const attendee = await Attendee.findById(attendeeId)
            .select('name email eventId status checked_in_at guest_names guest_checked_in guest_checked_in_at seatingNumber')
            .lean();

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

            // If specific guest name provided, verify it matches
            const displayName = guestName || attendee.guest_names;

            // Check if guest already checked in
            if (attendee.guest_checked_in) {
                return successResponse({
                    success: false,
                    message: `Guest already checked in at ${new Date(attendee.guest_checked_in_at).toLocaleTimeString()}`,
                    attendee: {
                        name: displayName,
                        email: `Guest of ${attendee.name}`,
                        guest_names: ''
                    }
                });
            }

            // Mark guest as checked in (atomic update, no re-fetch needed)
            await Attendee.findByIdAndUpdate(attendeeId, {
                guest_checked_in: true,
                guest_checked_in_at: new Date(),
            });

            return successResponse({
                success: true,
                message: 'Guest Check-in Successful!',
                attendee: {
                    name: displayName,
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
                attendee: { ...attendee, id: attendee._id.toString() }
            });
        }

        // Mark main attendee as checked in (atomic update)
        const now = new Date();
        await Attendee.findByIdAndUpdate(attendeeId, {
            status: 'checked-in',
            checked_in_at: now,
        });

        return successResponse({
            success: true,
            message: 'Check-in Successful!',
            attendee: { ...attendee, id: attendee._id.toString() }
        });

    } catch (error) {
        console.error('[Scan POST]', error);
        return errorResponse('Processing failed');
    }
}
