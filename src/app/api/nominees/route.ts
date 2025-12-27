
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
    position: z.number().int().min(0).optional(),
});

const updateNomineeSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1).max(100).trim().optional(),
    description: z.string().max(500).optional(),
    imageUrl: z.string().max(500).optional(),
    categoryId: z.string().optional().nullable(),
    position: z.number().int().min(0).optional(),
});

const updatePositionsSchema = z.object({
    positions: z.array(z.object({
        id: z.string().min(1),
        position: z.number().int().min(0),
    })),
});

// GET /api/nominees?awardEventId=xxx&categoryId=xxx
export const GET = withErrorHandler(async (req: Request) => {
    const { searchParams } = new URL(req.url);
    const awardEventId = searchParams.get('awardEventId');
    const categoryId = searchParams.get('categoryId');

    if (!awardEventId || !isValidObjectId(awardEventId)) {
        return errorResponse('Valid award event ID is required', 400);
    }

    await connectDB();

    const filter: Record<string, unknown> = { awardEventId };
    if (categoryId && isValidObjectId(categoryId)) {
        filter.categoryId = categoryId;
    }

    const nominees = await Nominee.find(filter).sort({ categoryId: 1, position: 1, createdAt: -1 }).lean();

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
        position: n.position ?? 0,
        createdAt: n.createdAt,
    })));
});

// POST /api/nominees - Create new nominee
export const POST = withErrorHandler(async (req: Request) => {
    const body = await req.json();
    const validated = createNomineeSchema.parse(body);

    if (!isValidObjectId(validated.awardEventId)) {
        return errorResponse('Invalid award event ID', 400);
    }

    await connectDB();

    // Get max position for the category to auto-assign position
    const maxPosNominee = await Nominee.findOne({
        awardEventId: validated.awardEventId,
        categoryId: validated.categoryId || null
    }).sort({ position: -1 }).lean();
    const nextPosition = validated.position ?? ((maxPosNominee?.position ?? -1) + 1);

    const nominee = await Nominee.create({
        awardEventId: validated.awardEventId,
        categoryId: validated.categoryId || null,
        name: validated.name,
        description: validated.description || '',
        imageUrl: validated.imageUrl || '',
        position: nextPosition,
    });

    return successResponse({
        id: nominee._id.toString(),
        name: nominee.name,
        description: nominee.description,
    }, 201);
});

// PUT /api/nominees - Update nominee
export const PUT = withErrorHandler(async (req: Request) => {
    const body = await req.json();
    const validated = updateNomineeSchema.parse(body);

    if (!isValidObjectId(validated.id)) {
        return errorResponse('Invalid nominee ID', 400);
    }

    if (validated.categoryId && !isValidObjectId(validated.categoryId)) {
        return errorResponse('Invalid category ID', 400);
    }

    await connectDB();

    const updateData: Record<string, unknown> = {};
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.imageUrl !== undefined) updateData.imageUrl = validated.imageUrl;
    if (validated.categoryId !== undefined) updateData.categoryId = validated.categoryId || null;
    if (validated.position !== undefined) updateData.position = validated.position;

    const nominee = await Nominee.findByIdAndUpdate(
        validated.id,
        updateData,
        { new: true }
    );

    if (!nominee) {
        return errorResponse('Nominee not found', 404);
    }

    return successResponse({
        id: nominee._id.toString(),
        name: nominee.name,
        description: nominee.description || '',
        imageUrl: nominee.imageUrl || '',
        categoryId: nominee.categoryId?.toString() || null,
        position: nominee.position ?? 0,
    });
});

// DELETE /api/nominees?id=xxx
export const DELETE = withErrorHandler(async (req: Request) => {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

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

// PATCH /api/nominees - Bulk update positions
export const PATCH = withErrorHandler(async (req: Request) => {
    const body = await req.json();
    const validated = updatePositionsSchema.parse(body);

    // Validate all IDs are valid ObjectIds
    for (const item of validated.positions) {
        if (!isValidObjectId(item.id)) {
            return errorResponse(`Invalid nominee ID: ${item.id}`, 400);
        }
    }

    await connectDB();

    // Update all positions and verify they were updated
    const results = await Promise.all(
        validated.positions.map(async ({ id, position }) => {
            const result = await Nominee.findByIdAndUpdate(
                id,
                { $set: { position } },
                { new: true }
            );
            return { id, position, success: !!result, newPosition: result?.position };
        })
    );

    // Check if any updates failed
    const failed = results.filter(r => !r.success);
    if (failed.length > 0) {
        return errorResponse(`Failed to update some nominees: ${failed.map(f => f.id).join(', ')}`, 404);
    }

    return successResponse({ success: true, updated: validated.positions.length, results });
});
