import dbConnect from '@/lib/mongodb';
import { Attendee, Event } from '@/models';
import { sanitizeString, isValidObjectId } from '@/lib/validate';
import { errorResponse, successResponse } from '@/lib/api-utils';
import * as XLSX from 'xlsx';

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

const allocateSeat = async (eventId: string, category: string, existingSeats: Set<number>): Promise<string | undefined> => {
    if (category === 'Guest') return undefined;

    const range = getCategoryRange(category);
    if (!range) return undefined;

    // Find first available seat in range
    let nextSeat = range.start;
    while (existingSeats.has(nextSeat) && nextSeat <= range.end) {
        nextSeat++;
    }

    if (nextSeat > range.end) return undefined; // Range full
    
    // Mark seat as taken for this batch
    existingSeats.add(nextSeat);
    return nextSeat.toString();
};

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file');
        const eventId = formData.get('eventId') as string;

        if (!eventId) {
            return errorResponse('Event ID is required', 400);
        }

        if (!isValidObjectId(eventId)) {
            return errorResponse('Invalid Event ID format', 400);
        }

        if (!file || !(file instanceof File)) {
            return errorResponse('Excel file is required', 400);
        }

        await dbConnect();

        // Check if event exists and registration is open
        const event = await Event.findById(eventId);
        if (!event) {
            return errorResponse('Event not found', 404);
        }
        if (event.registrationOpen === false) {
            return errorResponse('Registration is closed for this event', 403);
        }

        // Parse Excel file
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'buffer' });

        // Assume first sheet
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet) as unknown[];

        if (!data || data.length === 0) {
            return errorResponse('Excel file is empty or invalid', 400);
        }

        // Get existing occupied seats
        const existingAttendees = await Attendee.find({
            eventId,
            seatingNumber: { $exists: true, $ne: null }
        }).select('seatingNumber').lean();

        const occupiedSeats = new Set<number>(
            existingAttendees
                .map(a => parseInt(a.seatingNumber as string))
                .filter(n => !isNaN(n))
        );

        const attendeesToCreate: Array<Record<string, unknown>> = [];
        const errors: Array<{ row: number; error: string }> = [];

        for (let i = 0; i < data.length; i++) {
            const row = data[i] as Record<string, unknown>;
            const rowNumber = i + 2; // +2 because Excel rows start at 1 and we have a header row

            try {
                // Extract fields - support multiple column name variations
                const name = (row['Name'] || row['name'] || row['NAME']) as string;
                const email = (row['Email'] || row['email'] || row['EMAIL']) as string;
                const phone = (row['Phone'] || row['phone'] || row['PHONE'] || row['Phone Number'] || row['phone number']) as string;
                const additionalName = (row['Additional Name'] || row['additional name'] || row['additionalName']) as string;
                const instagram = (row['Instagram'] || row['instagram'] || row['INSTAGRAM']) as string;
                const youtube = (row['YouTube'] || row['youtube'] || row['YOUTUBE'] || row['Youtube']) as string;
                const category = (row['Category'] || row['category'] || row['CATEGORY']) as string;
                const guestNames = (row['Guest Names'] || row['guest names'] || row['guest_names'] || row['Guests']) as string;
                const mealPref = (row['Meal Preference'] || row['meal preference'] || row['meal_preference'] || row['Meal']) as string;

                // Validate required fields
                if (!name || typeof name !== 'string' || name.trim() === '') {
                    errors.push({ row: rowNumber, error: 'Name is required' });
                    continue;
                }

                // Validate email format if provided
                if (email && typeof email === 'string' && email.trim() !== '') {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(email.trim())) {
                        errors.push({ row: rowNumber, error: 'Invalid email format' });
                        continue;
                    }
                }

                // Validate phone if provided
                if (phone && typeof phone === 'string' && phone.trim() !== '') {
                    const cleanPhone = phone.replace(/\D/g, ''); // Remove non-digits
                    if (cleanPhone.length < 10) {
                        errors.push({ row: rowNumber, error: 'Phone must be at least 10 digits' });
                        continue;
                    }
                }

                // Auto-assign seating based on category
                let autoSeating: string | undefined = undefined;
                if (category && typeof category === 'string' && category.trim() !== '' && category !== 'Guest') {
                    autoSeating = await allocateSeat(eventId, category.trim(), occupiedSeats);
                }

                // Normalize meal preference
                let mealPreference: 'veg' | 'non-veg' = 'veg';
                if (mealPref && typeof mealPref === 'string') {
                    const normalized = mealPref.toLowerCase().trim();
                    if (normalized === 'non-veg' || normalized === 'nonveg' || normalized === 'non veg') {
                        mealPreference = 'non-veg';
                    }
                }

                attendeesToCreate.push({
                    eventId,
                    name: sanitizeString(name.trim()),
                    email: email && typeof email === 'string' ? email.trim() : undefined,
                    phone: phone && typeof phone === 'string' ? phone.toString().trim() : undefined,
                    additionalName: additionalName && typeof additionalName === 'string' ? sanitizeString(additionalName.trim()) : undefined,
                    instagram: instagram && typeof instagram === 'string' ? sanitizeString(instagram.trim()) : undefined,
                    youtube: youtube && typeof youtube === 'string' ? sanitizeString(youtube.trim()) : undefined,
                    category: category && typeof category === 'string' ? sanitizeString(category.trim()) : undefined,
                    guest_names: guestNames && typeof guestNames === 'string' ? sanitizeString(guestNames.trim()) : undefined,
                    meal_preference: mealPreference,
                    seatingNumber: autoSeating,
                    status: 'registered',
                    customResponses: {},
                    created_at: new Date()
                });
            } catch (err) {
                errors.push({ row: rowNumber, error: err instanceof Error ? err.message : 'Unknown error' });
            }
        }

        // Insert valid attendees
        let createdCount = 0;
        if (attendeesToCreate.length > 0) {
            try {
                const result = await Attendee.insertMany(attendeesToCreate, { ordered: false });
                createdCount = result.length;
            } catch (err) {
                // Handle duplicate key errors or other insert errors
                console.error('Bulk insert error:', err);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if ((err as any).writeErrors) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const writeErrors = (err as any).writeErrors as Array<{ index: number; err: { message: string } }>;
                    writeErrors.forEach((writeErr: { index: number; err: { message: string } }) => {
                        errors.push({
                            row: writeErr.index + 2,
                            error: writeErr.err.message || 'Failed to insert'
                        });
                    });
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    createdCount = (err as any).result?.nInserted || 0;
                } else {
                    return errorResponse('Failed to insert attendees: ' + (err instanceof Error ? err.message : 'Unknown error'));
                }
            }
        }

        return successResponse({
            success: true,
            created: createdCount,
            errors: errors.length > 0 ? errors : undefined,
            message: errors.length > 0
                ? `Imported ${createdCount} attendee(s). ${errors.length} row(s) had errors.`
                : `Successfully imported ${createdCount} attendee(s).`
        }, 201);

    } catch (error) {
        console.error('[Attendees Bulk POST]', error);
        return errorResponse('Failed to process bulk import: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
}
