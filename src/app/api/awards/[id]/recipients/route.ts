import connectDB from '@/lib/mongodb';
import { AwardRecipient } from '@/models';
import { errorResponse, successResponse, withErrorHandler } from '@/lib/api-utils';
import { isValidObjectId } from '@/lib/validate';
import * as XLSX from 'xlsx';


// GET /api/awards/[id]/recipients - Get recipients for an event
export const GET = withErrorHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    if (!isValidObjectId(id)) {
        return errorResponse('Valid award event ID is required', 400);
    }

    await connectDB();

    const recipients = await AwardRecipient.find({ awardEventId: id })
        .sort({ createdAt: -1 })
        .lean();

    return successResponse(recipients.map(r => ({
        id: r._id.toString(),
        name: r.name,
        additionalName: r.additionalName,
        category: r.category,
        followerCount: r.followerCount,
        token: r.token,
        status: r.status,
    })));
});

// PUT /api/awards/[id]/recipients - Update a recipient
export const PUT = withErrorHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    if (!isValidObjectId(id)) {
        return errorResponse('Valid award event ID is required', 400);
    }

    const body = await req.json();
    const { recipientId, name, additionalName, category, followerCount } = body;

    if (!isValidObjectId(recipientId)) {
        return errorResponse('Valid recipient ID is required', 400);
    }

    await connectDB();

    const recipient = await AwardRecipient.findOne({ _id: recipientId, awardEventId: id });

    if (!recipient) {
        return errorResponse('Recipient not found', 404);
    }

    // Update fields - NOTE: we specifically do NOT update the token to ensure QR codes remain valid
    if (name !== undefined) recipient.name = name;
    if (additionalName !== undefined) recipient.additionalName = additionalName;
    if (category !== undefined) recipient.category = category;
    if (followerCount !== undefined) recipient.followerCount = followerCount;

    await recipient.save();

    return successResponse({
        id: recipient._id.toString(),
        name: recipient.name,
        additionalName: recipient.additionalName,
        category: recipient.category,
        followerCount: recipient.followerCount,
        token: recipient.token,
        status: recipient.status
    });
});

// POST /api/awards/[id]/recipients - Upload Excel and create recipients
export const POST = withErrorHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    if (!isValidObjectId(id)) {
        return errorResponse('Valid award event ID is required', 400);
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
        return errorResponse('Excel file is required', 400);
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Assume first sheet
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet) as unknown[];

    if (!data || data.length === 0) {
        return errorResponse('Excel file is empty or invalid', 400);
    }

    await connectDB();

    const recipientsToCreate: Record<string, unknown>[] = [];
    const generatedTokens = new Set<string>();

    // Helper to generate unique token
    const generateToken = async (prefix: string) => {
        let token;
        let isUnique = false;
        let attempts = 0;

        while (!isUnique && attempts < 10) {
            const random = Math.random().toString(36).substring(2, 8).toUpperCase();
            token = `${prefix}-${random}`;

            // Check if we already generated this in current batch
            if (!generatedTokens.has(token)) {
                // Check DB
                const existing = await AwardRecipient.findOne({ token });
                if (!existing) {
                    isUnique = true;
                    generatedTokens.add(token);
                }
            }
            attempts++;
        }

        if (!token) throw new Error('Failed to generate unique token');
        return token;
    };

    for (const row of data) {
        // Expecting keys like "Name", "Follower Count", "Ticket Number"
        const r = row as Record<string, unknown>;
        const name = r['Name'] || r['name'];
        const followerCount = Number(r['Follower Count'] || r['follower count'] || r['Followers'] || r['followers'] || 0);

        // Check for ticket number in various common formats
        let ticketNumber = r['Ticket Number'] || r['ticket number'] || r['Ticket No'] || r['ticket no'] || r['Ticket'] || r['ticket'];

        // Ensure ticket number is a string if it exists
        if (ticketNumber) {
            ticketNumber = String(ticketNumber).trim();
        }

        if (name && typeof name === 'string') {
            let token = ticketNumber as string;

            // If no ticket number provided, generate one
            if (!token) {
                const prefix = followerCount >= 1000000 ? 'VIP' : 'GST';
                token = await generateToken(prefix);
            } else {
                generatedTokens.add(token);
            }

            if (token) {
                recipientsToCreate.push({
                    awardEventId: id,
                    name,
                    followerCount,
                    token,
                    status: 'generated'
                });
            }
        }
    }

    if (recipientsToCreate.length > 0) {
        try {
            await AwardRecipient.insertMany(recipientsToCreate);
        } catch (error) {
            // Handle duplicate key error if ticket numbers collide
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((error as any).code === 11000) {
                return errorResponse('Duplicate ticket numbers detected. Please ensure all ticket numbers are unique.', 400);
            }
            throw error;
        }
    }

    return successResponse({
        count: recipientsToCreate.length,
        message: `Successfully imported ${recipientsToCreate.length} recipients`
    });
});


