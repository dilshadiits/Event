import dbConnect from '@/lib/mongodb';
import { Team } from '@/models';
import { errorResponse, successResponse, withErrorHandler, requireFestAccess } from '@/lib/api-utils';
import { createTeamSchema, sanitizeString, isValidObjectId } from '@/lib/validate';

// GET /api/teams?festId=xxx
export const GET = withErrorHandler(async (req: Request) => {
    const { searchParams } = new URL(req.url);
    const festId = searchParams.get('festId');
    if (!festId || !isValidObjectId(festId)) return errorResponse('Valid fest ID is required', 400);

    const caller = await requireFestAccess(festId);
    if (!caller) return errorResponse('Unauthorized', 403);

    await dbConnect();
    const teams = await Team.find({ festId }).sort({ name: 1 }).lean();

    return successResponse(teams.map(t => ({
        id: t._id.toString(),
        name: t.name,
        code: t.code,
        color: t.color,
        logoUrl: t.logoUrl,
    })));
});

// POST /api/teams
export const POST = withErrorHandler(async (req: Request) => {
    const body = await req.json();
    const validated = createTeamSchema.parse(body);
    if (!isValidObjectId(validated.festId)) return errorResponse('Invalid fest ID', 400);

    const caller = await requireFestAccess(validated.festId);
    if (!caller) return errorResponse('Unauthorized', 403);

    await dbConnect();

    const existing = await Team.findOne({ festId: validated.festId, name: sanitizeString(validated.name) });
    if (existing) return errorResponse('A team with this name already exists in this fest', 409);

    const team = await Team.create({
        festId: validated.festId,
        name: sanitizeString(validated.name),
        code: validated.code,
        color: validated.color,
        logoUrl: validated.logoUrl,
    });

    return successResponse({ id: team._id.toString(), name: team.name }, 201);
});
