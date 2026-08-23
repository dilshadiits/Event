import dbConnect from '@/lib/mongodb';
import { Program, Fest, ProgramEntry, Participant, Team } from '@/models';
import { errorResponse, successResponse, withErrorHandler, requireOrgFestAccess } from '@/lib/api-utils';
import { isValidObjectId } from '@/lib/validate';

// GET /api/programs/[id]/results-export - admin-only structured results data for
// certificate/poster generation. Unlike the public /results route, this does NOT
// require Fest.resultsArePublic - admins should be able to prepare certificates
// before flipping results public. Still requires the program itself to be published
// (ranks only exist after that).
export const GET = withErrorHandler(async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    if (!isValidObjectId(id)) return errorResponse('Invalid program ID', 400);

    await dbConnect();
    const program = await Program.findById(id).lean();
    if (!program) return errorResponse('Program not found', 404);

    const caller = await requireOrgFestAccess(program.festId.toString());
    if (!caller) return errorResponse('Unauthorized', 403);

    if (!program.resultsPublished) {
        return errorResponse('Results have not been published for this program yet', 400);
    }

    const fest = await Fest.findById(program.festId).lean();

    const entries = await ProgramEntry.find({ programId: id, disqualified: false, rank: { $exists: true } })
        .sort({ rank: 1 })
        .lean();

    const participantIds = entries.map(e => e.participantId?.toString()).filter(Boolean);
    const teamIds = entries.map(e => e.teamId?.toString()).filter(Boolean);
    const [participants, teams] = await Promise.all([
        Participant.find({ _id: { $in: participantIds } }).lean(),
        Team.find({ _id: { $in: teamIds } }).lean(),
    ]);
    const participantMap = new Map(participants.map(p => [p._id.toString(), p]));
    const teamMap = new Map(teams.map(t => [t._id.toString(), t]));

    return successResponse({
        fest: fest ? { id: fest._id.toString(), name: fest.name, certificateTemplate: fest.certificateTemplate, posterTemplate: fest.posterTemplate } : null,
        program: { id: program._id.toString(), name: program.name },
        entries: entries.map(e => {
            const participant = e.participantId ? participantMap.get(e.participantId.toString()) : undefined;
            const team = e.teamId ? teamMap.get(e.teamId.toString()) : undefined;
            return {
                entryId: e._id.toString(),
                name: participant?.name || team?.name || 'Unknown',
                rank: e.rank,
                chestNumber: e.chestNumber,
            };
        }),
    });
});
