import dbConnect from '@/lib/mongodb';
import { Fest } from '@/models';
import { errorResponse, successResponse, withErrorHandler, requireRole } from '@/lib/api-utils';
import { createFestSchema, sanitizeString } from '@/lib/validate';

// GET /api/fests - list fests. Super Admin sees all; Event Admin sees only their own (festIds).
export const GET = withErrorHandler(async () => {
    const caller = await requireRole(['super-admin', 'event-admin']);
    if (!caller) return errorResponse('Unauthorized', 403);

    await dbConnect();
    const filter = caller.role === 'super-admin' ? {} : { _id: { $in: caller.festIds || [] } };
    const fests = await Fest.find(filter).sort({ createdAt: -1 }).lean();

    return successResponse(fests.map(f => ({
        id: f._id.toString(),
        name: f.name,
        description: f.description,
        startDate: f.startDate,
        endDate: f.endDate,
        isActive: f.isActive,
        resultsArePublic: f.resultsArePublic,
        createdAt: f.createdAt,
    })));
});

// POST /api/fests - create a fest (Super Admin only)
export const POST = withErrorHandler(async (req: Request) => {
    const caller = await requireRole(['super-admin']);
    if (!caller) return errorResponse('Unauthorized', 403);

    const body = await req.json();
    const validated = createFestSchema.parse(body);

    await dbConnect();
    const fest = await Fest.create({
        name: sanitizeString(validated.name),
        description: validated.description,
        startDate: validated.startDate,
        endDate: validated.endDate,
        eventId: validated.eventId,
        createdBy: caller.id,
    });

    return successResponse({ id: fest._id.toString(), name: fest.name }, 201);
});
