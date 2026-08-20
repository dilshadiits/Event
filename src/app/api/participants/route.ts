import dbConnect from '@/lib/mongodb';
import { Participant, Team } from '@/models';
import { errorResponse, successResponse, withErrorHandler, requireOrgFestAccess } from '@/lib/api-utils';
import { createParticipantSchema, sanitizeString, isValidObjectId } from '@/lib/validate';

// GET /api/participants?festId=xxx
export const GET = withErrorHandler(async (req: Request) => {
    const { searchParams } = new URL(req.url);
    const festId = searchParams.get('festId');
    if (!festId || !isValidObjectId(festId)) return errorResponse('Valid fest ID is required', 400);

    const caller = await requireOrgFestAccess(festId);
    if (!caller) return errorResponse('Unauthorized', 403);

    await dbConnect();
    const participants = await Participant.find({ festId }).sort({ name: 1 }).lean();
    const teamIds = [...new Set(participants.map(p => p.teamId?.toString()).filter(Boolean))];
    const teams = await Team.find({ _id: { $in: teamIds } }).lean();
    const teamMap = new Map(teams.map(t => [t._id.toString(), t.name]));

    return successResponse(participants.map(p => ({
        id: p._id.toString(),
        name: p.name,
        email: p.email,
        phone: p.phone,
        teamId: p.teamId?.toString(),
        teamName: p.teamId ? teamMap.get(p.teamId.toString()) : undefined,
        hasLogin: !!p.userId,
    })));
});

// POST /api/participants
export const POST = withErrorHandler(async (req: Request) => {
    const body = await req.json();
    const validated = createParticipantSchema.parse(body);
    if (!isValidObjectId(validated.festId)) return errorResponse('Invalid fest ID', 400);
    if (validated.teamId && !isValidObjectId(validated.teamId)) return errorResponse('Invalid team ID', 400);

    const caller = await requireOrgFestAccess(validated.festId);
    if (!caller) return errorResponse('Unauthorized', 403);

    await dbConnect();

    if (validated.teamId) {
        const team = await Team.findOne({ _id: validated.teamId, festId: validated.festId });
        if (!team) return errorResponse('Team not found in this fest', 404);
    }

    const participant = await Participant.create({
        festId: validated.festId,
        teamId: validated.teamId || undefined,
        name: sanitizeString(validated.name),
        email: validated.email || undefined,
        phone: validated.phone || undefined,
    });

    return successResponse({ id: participant._id.toString(), name: participant.name }, 201);
});
