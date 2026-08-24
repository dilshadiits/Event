import dbConnect from '@/lib/mongodb';
import { Fest, Team, Participant, Program, ProgramEntry, User } from '@/models';
import { errorResponse, successResponse, withErrorHandler, requireOrgFestAccess } from '@/lib/api-utils';
import { isValidObjectId } from '@/lib/validate';

const STATUS_KEYS = ['scheduled', 'chest-numbers-shuffled', 'in-progress', 'judging-closed', 'results-published'] as const;

// GET /api/fests/[id]/overview - aggregate stats for the admin dashboard: entity
// counts, a program-status breakdown, and check-in/scoring progress across every
// program in the fest. All server-side counts, no client-side list downloads.
export const GET = withErrorHandler(async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    if (!isValidObjectId(id)) return errorResponse('Invalid fest ID', 400);

    await dbConnect();
    const fest = await Fest.findById(id).lean();
    if (!fest) return errorResponse('Fest not found', 404);

    const caller = await requireOrgFestAccess(id);
    if (!caller) return errorResponse('Unauthorized', 403);

    const [teamCount, participantCount, programs, judgeCount] = await Promise.all([
        Team.countDocuments({ festId: id }),
        Participant.countDocuments({ festId: id }),
        Program.find({ festId: id }).select('status').lean(),
        User.countDocuments({ role: 'judge', festIds: id }),
    ]);

    const programsByStatus: Record<string, number> = Object.fromEntries(STATUS_KEYS.map(k => [k, 0]));
    for (const p of programs) {
        programsByStatus[p.status] = (programsByStatus[p.status] || 0) + 1;
    }

    const programIds = programs.map(p => p._id);
    const [totalEntries, checkedInEntries, scoredEntries] = await Promise.all([
        ProgramEntry.countDocuments({ programId: { $in: programIds } }),
        ProgramEntry.countDocuments({ programId: { $in: programIds }, checkedIn: true }),
        ProgramEntry.countDocuments({ programId: { $in: programIds }, totalScore: { $ne: null } }),
    ]);

    return successResponse({
        fest: {
            id: fest._id.toString(),
            name: fest.name,
            startDate: fest.startDate,
            endDate: fest.endDate,
            resultsArePublic: fest.resultsArePublic,
        },
        counts: {
            teams: teamCount,
            participants: participantCount,
            programs: programs.length,
            judges: judgeCount,
        },
        programsByStatus,
        entries: {
            total: totalEntries,
            checkedIn: checkedInEntries,
            scored: scoredEntries,
        },
    });
});
