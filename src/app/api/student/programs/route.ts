import dbConnect from '@/lib/mongodb';
import { Participant, Program, ProgramEntry } from '@/models';
import { errorResponse, successResponse, withErrorHandler, requireRole } from '@/lib/api-utils';

// GET /api/student/programs - every program the signed-in student is entered in,
// either directly (solo programs) or via their team (team programs), with their
// schedule, chest number, check-in status, and rank/result once published.
export const GET = withErrorHandler(async () => {
    const caller = await requireRole(['student']);
    if (!caller || !caller.participantId) return errorResponse('Unauthorized', 403);

    await dbConnect();
    const participant = await Participant.findById(caller.participantId).lean();
    if (!participant) return errorResponse('Participant record not found', 404);

    const entryFilter = participant.teamId
        ? { $or: [{ participantId: participant._id }, { teamId: participant.teamId }] }
        : { participantId: participant._id };

    const entries = await ProgramEntry.find(entryFilter).lean();
    const programs = await Program.find({ _id: { $in: entries.map(e => e.programId) } }).lean();
    const programMap = new Map(programs.map(p => [p._id.toString(), p]));

    const results = entries
        .map(e => {
            const program = programMap.get(e.programId.toString());
            if (!program) return null;
            return {
                entryId: e._id.toString(),
                programId: program._id.toString(),
                programName: program.name,
                type: program.type,
                mode: program.mode,
                scheduledAt: program.scheduledAt,
                venue: program.venue,
                status: program.status,
                chestNumber: e.chestNumber,
                checkedIn: e.checkedIn,
                disqualified: e.disqualified,
                rank: program.resultsPublished ? e.rank : undefined,
            };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .sort((a, b) => {
            if (!a.scheduledAt) return 1;
            if (!b.scheduledAt) return -1;
            return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
        });

    return successResponse(results);
});
