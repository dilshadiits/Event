import dbConnect from '@/lib/mongodb';
import { Participant, Team, Fest, User } from '@/models';
import { errorResponse, successResponse, withErrorHandler, requireRole } from '@/lib/api-utils';

// GET /api/student/me - the signed-in student's own profile.
export const GET = withErrorHandler(async () => {
    const caller = await requireRole(['student']);
    if (!caller || !caller.participantId) return errorResponse('Unauthorized', 403);

    await dbConnect();
    const [participant, user] = await Promise.all([
        Participant.findById(caller.participantId).lean(),
        User.findById(caller.id).select('username').lean(),
    ]);
    if (!participant) return errorResponse('Participant record not found', 404);

    const [team, fest] = await Promise.all([
        participant.teamId ? Team.findById(participant.teamId).lean() : null,
        Fest.findById(participant.festId).lean(),
    ]);

    return successResponse({
        name: participant.name,
        username: user?.username,
        team: team ? { id: team._id.toString(), name: team.name, color: team.color } : null,
        fest: fest ? { id: fest._id.toString(), name: fest.name } : null,
    });
});
