import dbConnect from '@/lib/mongodb';
import { Team, Participant, ProgramEntry } from '@/models';
import { errorResponse, successResponse, withErrorHandler, requireFestAccess } from '@/lib/api-utils';
import { updateTeamSchema, sanitizeString, isValidObjectId } from '@/lib/validate';

// PUT /api/teams/[id]
export const PUT = withErrorHandler(async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    if (!isValidObjectId(id)) return errorResponse('Invalid team ID', 400);

    await dbConnect();
    const team = await Team.findById(id);
    if (!team) return errorResponse('Team not found', 404);

    const caller = await requireFestAccess(team.festId.toString());
    if (!caller) return errorResponse('Unauthorized', 403);

    const body = await req.json();
    const validated = updateTeamSchema.parse({ ...body, id });

    if (validated.name !== undefined) team.name = sanitizeString(validated.name);
    if (validated.code !== undefined) team.code = validated.code;
    if (validated.color !== undefined) team.color = validated.color;
    if (validated.logoUrl !== undefined) team.logoUrl = validated.logoUrl;

    await team.save();

    return successResponse({ id: team._id.toString(), name: team.name });
});

// DELETE /api/teams/[id] - blocked if participants or program entries already reference this team
export const DELETE = withErrorHandler(async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    if (!isValidObjectId(id)) return errorResponse('Invalid team ID', 400);

    await dbConnect();
    const team = await Team.findById(id);
    if (!team) return errorResponse('Team not found', 404);

    const caller = await requireFestAccess(team.festId.toString());
    if (!caller) return errorResponse('Unauthorized', 403);

    const [participantCount, entryCount] = await Promise.all([
        Participant.countDocuments({ teamId: id }),
        ProgramEntry.countDocuments({ teamId: id }),
    ]);
    if (participantCount > 0 || entryCount > 0) {
        return errorResponse('Cannot delete a team with participants or program entries. Reassign them first.', 400);
    }

    await Team.findByIdAndDelete(id);

    return successResponse({ success: true });
});
