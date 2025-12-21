import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { AwardCategory, Event, AwardEvent } from '@/models';
import { errorResponse, successResponse, withErrorHandler } from '@/lib/api-utils';
import { createCategorySchema, updateCategorySchema, isValidObjectId } from '@/lib/validate';

// GET /api/categories?eventId=xxx - Get all categories for an event
export const GET = withErrorHandler(async (req: NextRequest) => {
    const eventId = req.nextUrl.searchParams.get('eventId');

    if (!eventId || !isValidObjectId(eventId)) {
        return errorResponse('Valid event ID is required', 400);
    }

    await connectDB();

    const categories = await AwardCategory.find({ eventId })
        .sort({ createdAt: -1 })
        .lean();

    return successResponse(categories.map(cat => ({
        id: cat._id.toString(),
        eventId: cat.eventId.toString(),
        name: cat.name,
        description: cat.description || '',
        isActive: cat.isActive,
        showResults: cat.showResults,
        createdAt: cat.createdAt,
    })));
});

// POST /api/categories - Create new category
export const POST = withErrorHandler(async (req: NextRequest) => {
    const body = await req.json();
    const validated = createCategorySchema.parse(body);

    if (!isValidObjectId(validated.eventId)) {
        return errorResponse('Invalid event ID format', 400);
    }

    await connectDB();

    // Check both Event (attendance) and AwardEvent (standalone awards)
    const event = await Event.findById(validated.eventId);
    const awardEvent = await AwardEvent.findById(validated.eventId);

    if (!event && !awardEvent) {
        return errorResponse('Event not found', 404);
    }

    const category = await AwardCategory.create({
        eventId: validated.eventId,
        name: validated.name,
        description: validated.description || '',
    });

    return successResponse({
        id: category._id.toString(),
        name: category.name,
        description: category.description,
        isActive: category.isActive,
        showResults: category.showResults,
    }, 201);
});

// PUT /api/categories - Update category
export const PUT = withErrorHandler(async (req: NextRequest) => {
    const body = await req.json();
    const validated = updateCategorySchema.parse(body);

    if (!isValidObjectId(validated.id)) {
        return errorResponse('Invalid category ID format', 400);
    }

    await connectDB();

    const updateData: Record<string, unknown> = {};
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.isActive !== undefined) updateData.isActive = validated.isActive;
    if (validated.showResults !== undefined) updateData.showResults = validated.showResults;

    const category = await AwardCategory.findByIdAndUpdate(
        validated.id,
        updateData,
        { new: true }
    );

    if (!category) {
        return errorResponse('Category not found', 404);
    }

    return successResponse({
        id: category._id.toString(),
        name: category.name,
        description: category.description,
        isActive: category.isActive,
        showResults: category.showResults,
    });
});

// DELETE /api/categories?id=xxx - Delete category
export const DELETE = withErrorHandler(async (req: NextRequest) => {
    const id = req.nextUrl.searchParams.get('id');

    if (!id || !isValidObjectId(id)) {
        return errorResponse('Valid category ID is required', 400);
    }

    await connectDB();

    const result = await AwardCategory.findByIdAndDelete(id);

    if (!result) {
        return errorResponse('Category not found', 404);
    }

    return successResponse({ success: true });
});
