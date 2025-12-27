import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { AwardRecipient } from '@/models';
import { errorResponse, successResponse, withErrorHandler } from '@/lib/api-utils';
import { isValidObjectId } from '@/lib/validate';
import { z } from 'zod';
import * as XLSX from 'xlsx';

// GET /api/awards/[id]/recipients - Get recipients for an event
export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
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
        followerCount: r.followerCount,
        token: r.token,
        status: r.status,
    })));
});

// POST /api/awards/[id]/recipients - Upload Excel and create recipients
export const POST = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
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
    const data = XLSX.utils.sheet_to_json(sheet) as any[];

    if (!data || data.length === 0) {
        return errorResponse('Excel file is empty or invalid', 400);
    }

    await connectDB();

    const recipientsToCreate: any[] = [];
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
        return token;
    };

    for (const row of data) {
        // Expecting keys like "Name" and "Follower Count" (case insensitive logic would be better but keeping simple for now)
        const name = row['Name'] || row['name'];
        const followerCount = Number(row['Follower Count'] || row['follower count'] || row['Followers'] || row['followers'] || 0);

        if (name) {
            // Determine prefix based on follower count
            const prefix = followerCount >= 1000000 ? 'VIP' : 'GST';
            const token = await generateToken(prefix);

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
        await AwardRecipient.insertMany(recipientsToCreate);
    }

    return successResponse({
        count: recipientsToCreate.length,
        message: `Successfully imported ${recipientsToCreate.length} recipients`
    });
});
