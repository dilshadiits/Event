import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Nominee, AwardCategory } from '@/models';
import { errorResponse, successResponse, withErrorHandler } from '@/lib/api-utils';
import { isValidObjectId } from '@/lib/validate';
import { z } from 'zod';

const createNomineeSchema = z.object({
    awardEventId: z.string().min(1),
    categoryId: z.string().optional(),
    name: z.string().min(1).max(100).trim(),
    description: z.string().max(500).optional(),
    imageUrl: z.string().max(500).optional(),
});

// GET /api/nominees?awardEventId=xxx&categoryId=xxx
export const GET = withErrorHandler(async (req: NextRequest) => {
    const awardEventId = req.nextUrl.searchParams.get('awardEventId');
    const categoryId = req.nextUrl.searchParams.get('categoryId');

    if (!awardEventId || !isValidObjectId(awardEventId)) {
        return errorResponse('Valid award event ID is required', 400);
    }

    await connectDB();

    const filter: Record<string, unknown> = { awardEventId };
    if (categoryId && isValidObjectId(categoryId)) {
        filter.categoryId = categoryId;
    }

    const nominees = await Nominee.find(filter).sort({ createdAt: -1 }).lean();

    // Get category names
    const categoryIds = [...new Set(nominees.map(n => n.categoryId?.toString()).filter(Boolean))];
    const categories = await AwardCategory.find({ _id: { $in: categoryIds } }).lean();
    const categoryMap = new Map(categories.map(c => [c._id.toString(), c.name]));

    return successResponse(nominees.map(n => ({
        id: n._id.toString(),
        awardEventId: n.awardEventId.toString(),
        categoryId: n.categoryId?.toString() || null,
        categoryName: n.categoryId ? categoryMap.get(n.categoryId.toString()) || 'Uncategorized' : 'All Categories',
        name: n.name,
        description: n.description || '',
        imageUrl: n.imageUrl || '',
        createdAt: n.createdAt,
    })));
});

// POST /api/nominees - Create new nominee
export const POST = withErrorHandler(async (req: NextRequest) => {
    const body = await req.json();
    const validated = createNomineeSchema.parse(body);

    if (!isValidObjectId(validated.awardEventId)) {
        return errorResponse('Invalid award event ID', 400);
    }

    await connectDB();

    const nominee = await Nominee.create({
        awardEventId: validated.awardEventId,
        categoryId: validated.categoryId || null,
        name: validated.name,
        description: validated.description || '',
        imageUrl: validated.imageUrl || '',
    });

    return successResponse({
        id: nominee._id.toString(),
        name: nominee.name,
        description: nominee.description,
    }, 201);
});

// DELETE /api/nominees?id=xxx
export const DELETE = withErrorHandler(async (req: NextRequest) => {
    const id = req.nextUrl.searchParams.get('id');

    if (!id || !isValidObjectId(id)) {
        return errorResponse('Valid nominee ID is required', 400);
    }

    await connectDB();

    const result = await Nominee.findByIdAndDelete(id);

    if (!result) {
        return errorResponse('Nominee not found', 404);
    }

    return successResponse({ success: true });
});
