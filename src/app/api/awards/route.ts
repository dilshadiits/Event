import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { AwardEvent } from '@/models';
import { errorResponse, successResponse, withErrorHandler } from '@/lib/api-utils';
import { isValidObjectId } from '@/lib/validate';
import { z } from 'zod';

const createAwardEventSchema = z.object({
    name: z.string().min(1, 'Name is required').max(200).trim(),
    description: z.string().max(500).optional(),
    headerImage: z.string().max(1000).optional(),
    sponsorImages: z.array(z.string().max(1000)).max(10).optional(),
});

// GET /api/awards - Get all award events
export const GET = withErrorHandler(async () => {
    await connectDB();

    const events = await AwardEvent.find()
        .sort({ createdAt: -1 })
        .lean();

    return successResponse(events.map(e => ({
        id: e._id.toString(),
        name: e.name,
        description: e.description || '',
        headerImage: e.headerImage || '',
        sponsorImages: e.sponsorImages || [],
        isActive: e.isActive,
        createdAt: e.createdAt,
    })));
});

// POST /api/awards - Create new award event
export const POST = withErrorHandler(async (req: NextRequest) => {
    const body = await req.json();
    const validated = createAwardEventSchema.parse(body);

    await connectDB();

    const event = await AwardEvent.create({
        name: validated.name,
        description: validated.description || '',
        headerImage: validated.headerImage || '',
        sponsorImages: validated.sponsorImages || [],
    });

    return successResponse({
        id: event._id.toString(),
        name: event.name,
        description: event.description,
        headerImage: event.headerImage,
        sponsorImages: event.sponsorImages,
        isActive: event.isActive,
    }, 201);
});

// PUT /api/awards - Update award event
export const PUT = withErrorHandler(async (req: NextRequest) => {
    const body = await req.json();
    const { id, ...updateData } = body;

    // console.log('[Awards PUT] Request body:', { id, updateData });

    if (!id || !isValidObjectId(id)) {
        return errorResponse('Valid event ID is required', 400);
    }

    await connectDB();

    // Use findById + save pattern to ensure schema updates are applied
    const event = await AwardEvent.findById(id);

    if (!event) {
        return errorResponse('Award event not found', 404);
    }

    // Manually set each field
    if (updateData.name !== undefined) event.name = updateData.name;
    if (updateData.description !== undefined) event.description = updateData.description;
    if (updateData.headerImage !== undefined) event.headerImage = updateData.headerImage;
    if (updateData.sponsorImages !== undefined) event.sponsorImages = updateData.sponsorImages;
    if (updateData.isActive !== undefined) event.isActive = updateData.isActive;

    await event.save();

    return successResponse({
        id: event._id.toString(),
        name: event.name || '',
        description: event.description || '',
        headerImage: event.headerImage || '',
        sponsorImages: event.sponsorImages || [],
        isActive: event.isActive ?? true,
    });
});

// DELETE /api/awards?id=xxx - Delete award event
export const DELETE = withErrorHandler(async (req: NextRequest) => {
    const id = req.nextUrl.searchParams.get('id');

    if (!id || !isValidObjectId(id)) {
        return errorResponse('Valid event ID is required', 400);
    }

    await connectDB();

    const result = await AwardEvent.findByIdAndDelete(id);

    if (!result) {
        return errorResponse('Award event not found', 404);
    }

    return successResponse({ success: true });
});
