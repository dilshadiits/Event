import dbConnect from '@/lib/mongodb';
import { Fest } from '@/models';
import { errorResponse, successResponse, withErrorHandler, requireRole } from '@/lib/api-utils';
import { createFestSchema, sanitizeString, isValidObjectId } from '@/lib/validate';

// GET /api/fests[?organizationId=] - list fests.
// Product Admin sees every organization's fests (optionally narrowed to one via
// ?organizationId=). Super Admin sees only their own organization's fests.
// Event Admin sees only the specific fests they're scoped to (festIds).
export const GET = withErrorHandler(async (req: Request) => {
    const caller = await requireRole(['product-admin', 'super-admin', 'event-admin']);
    if (!caller) return errorResponse('Unauthorized', 403);

    const { searchParams } = new URL(req.url);
    const orgParam = searchParams.get('organizationId');

    await dbConnect();

    let filter: Record<string, unknown>;
    if (caller.role === 'product-admin') {
        filter = orgParam && isValidObjectId(orgParam) ? { organizationId: orgParam } : {};
    } else if (caller.role === 'super-admin') {
        filter = { organizationId: caller.organizationId };
    } else {
        filter = { _id: { $in: caller.festIds || [] } };
    }

    const fests = await Fest.find(filter).sort({ createdAt: -1 }).lean();

    return successResponse(fests.map(f => ({
        id: f._id.toString(),
        organizationId: f.organizationId?.toString(),
        name: f.name,
        description: f.description,
        startDate: f.startDate,
        endDate: f.endDate,
        isActive: f.isActive,
        resultsArePublic: f.resultsArePublic,
        createdAt: f.createdAt,
    })));
});

// POST /api/fests - create a fest (Super Admin, within their own org; Product Admin,
// on behalf of any org via a required organizationId in the body)
export const POST = withErrorHandler(async (req: Request) => {
    const caller = await requireRole(['product-admin', 'super-admin']);
    if (!caller) return errorResponse('Unauthorized', 403);

    const body = await req.json();
    const validated = createFestSchema.parse(body);

    let organizationId: string;
    if (caller.role === 'product-admin') {
        if (!body.organizationId || !isValidObjectId(body.organizationId)) {
            return errorResponse('A valid organizationId is required', 400);
        }
        organizationId = body.organizationId;
    } else {
        if (!caller.organizationId) return errorResponse('Your account has no organization', 400);
        organizationId = caller.organizationId;
    }

    await dbConnect();
    const fest = await Fest.create({
        organizationId,
        name: sanitizeString(validated.name),
        description: validated.description,
        startDate: validated.startDate,
        endDate: validated.endDate,
        eventId: validated.eventId,
        createdBy: caller.id,
    });

    return successResponse({ id: fest._id.toString(), name: fest.name }, 201);
});
