import dbConnect from '@/lib/mongodb';
import { Fest, Team, Program } from '@/models';
import { errorResponse, successResponse, withErrorHandler, requireFestAccess, requireRole } from '@/lib/api-utils';
import { updateFestSchema, isValidObjectId } from '@/lib/validate';

// GET /api/fests/[id] - fest detail (Super Admin, or Event Admin scoped to this fest)
export const GET = withErrorHandler(async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    if (!isValidObjectId(id)) return errorResponse('Invalid fest ID', 400);

    const caller = await requireFestAccess(id);
    if (!caller) return errorResponse('Unauthorized', 403);

    await dbConnect();
    const fest = await Fest.findById(id).lean();
    if (!fest) return errorResponse('Fest not found', 404);

    return successResponse({
        id: fest._id.toString(),
        name: fest.name,
        description: fest.description,
        startDate: fest.startDate,
        endDate: fest.endDate,
        eventId: fest.eventId?.toString(),
        pointsScheme: fest.pointsScheme
            ? (fest.pointsScheme instanceof Map ? Object.fromEntries(fest.pointsScheme) : fest.pointsScheme)
            : {},
        teamPointsMultiplier: fest.teamPointsMultiplier,
        resultsArePublic: fest.resultsArePublic,
        certificateTemplate: fest.certificateTemplate,
        posterTemplate: fest.posterTemplate,
        isActive: fest.isActive,
    });
});

// PUT /api/fests/[id] - update fest settings
export const PUT = withErrorHandler(async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    if (!isValidObjectId(id)) return errorResponse('Invalid fest ID', 400);

    const caller = await requireFestAccess(id);
    if (!caller) return errorResponse('Unauthorized', 403);

    const body = await req.json();
    const validated = updateFestSchema.parse({ ...body, id });

    await dbConnect();
    const fest = await Fest.findById(id);
    if (!fest) return errorResponse('Fest not found', 404);

    if (validated.name !== undefined) fest.name = validated.name;
    if (validated.description !== undefined) fest.description = validated.description;
    if (validated.startDate !== undefined) fest.startDate = validated.startDate;
    if (validated.endDate !== undefined) fest.endDate = validated.endDate;
    if (validated.teamPointsMultiplier !== undefined) fest.teamPointsMultiplier = validated.teamPointsMultiplier;
    if (validated.resultsArePublic !== undefined) fest.resultsArePublic = validated.resultsArePublic;
    if (validated.certificateTemplate !== undefined) fest.certificateTemplate = validated.certificateTemplate;
    if (validated.posterTemplate !== undefined) fest.posterTemplate = validated.posterTemplate;
    if (validated.isActive !== undefined) fest.isActive = validated.isActive;
    if (validated.pointsScheme !== undefined) {
        fest.pointsScheme = new Map(Object.entries(validated.pointsScheme));
    }

    await fest.save();

    return successResponse({ id: fest._id.toString(), name: fest.name });
});

// DELETE /api/fests/[id] - Super Admin only, blocked if teams/programs already exist
export const DELETE = withErrorHandler(async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const caller = await requireRole(['super-admin']);
    if (!caller) return errorResponse('Unauthorized', 403);

    const { id } = await context.params;
    if (!isValidObjectId(id)) return errorResponse('Invalid fest ID', 400);

    await dbConnect();

    const [teamCount, programCount] = await Promise.all([
        Team.countDocuments({ festId: id }),
        Program.countDocuments({ festId: id }),
    ]);
    if (teamCount > 0 || programCount > 0) {
        return errorResponse('Cannot delete a fest that already has teams or programs. Deactivate it instead.', 400);
    }

    const deleted = await Fest.findByIdAndDelete(id);
    if (!deleted) return errorResponse('Fest not found', 404);

    return successResponse({ success: true });
});
