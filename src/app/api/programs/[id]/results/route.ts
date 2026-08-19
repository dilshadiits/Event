import dbConnect from '@/lib/mongodb';
import { Program, Fest, ProgramEntry, Participant, Team } from '@/models';
import { errorResponse, successResponse, withErrorHandler } from '@/lib/api-utils';
import { isValidObjectId } from '@/lib/validate';

// GET /api/programs/[id]/results - PUBLIC, unauthenticated per-program result page data.
// Names are safe to reveal here (unlike the judge worklist) since judging is over and
// this is the official announcement. Gated by both the program's own resultsPublished
// flag and the fest-wide resultsArePublic kill switch.
export const GET = withErrorHandler(async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    if (!isValidObjectId(id)) return errorResponse('Invalid program ID', 400);

    await dbConnect();
    const program = await Program.findById(id).lean();
    if (!program) return errorResponse('Program not found', 404);

    if (!program.resultsPublished) {
        return errorResponse('Results have not been published for this program yet', 404);
    }

    const fest = await Fest.findById(program.festId).lean();
    if (!fest || !fest.resultsArePublic) {
        return errorResponse('Results are not public yet', 404);
    }

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
        fest: { id: fest._id.toString(), name: fest.name },
        program: { id: program._id.toString(), name: program.name, type: program.type, mode: program.mode },
        results: entries.map(e => {
            const participant = e.participantId ? participantMap.get(e.participantId.toString()) : undefined;
            const team = e.teamId ? teamMap.get(e.teamId.toString()) : undefined;
            return {
                rank: e.rank,
                name: participant?.name || team?.name || 'Unknown',
                chestNumber: e.chestNumber,
            };
        }),
    });
});
