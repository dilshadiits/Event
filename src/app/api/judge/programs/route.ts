import dbConnect from '@/lib/mongodb';
import { Program, ProgramEntry, Score } from '@/models';
import { errorResponse, successResponse, withErrorHandler, requireRole } from '@/lib/api-utils';

// GET /api/judge/programs - every program the signed-in judge is on the panel for,
// across all fests, with their own scoring progress.
export const GET = withErrorHandler(async () => {
    const caller = await requireRole(['judge']);
    if (!caller) return errorResponse('Unauthorized', 403);

    await dbConnect();
    const programs = await Program.find({ judgePanel: caller.id }).sort({ scheduledAt: 1, name: 1 }).lean();

    const results = await Promise.all(programs.map(async (p) => {
        const [totalEntries, scoredCount] = await Promise.all([
            ProgramEntry.countDocuments({ programId: p._id, chestNumber: { $exists: true }, disqualified: false }),
            Score.countDocuments({ programId: p._id, judgeId: caller.id }),
        ]);
        return {
            id: p._id.toString(),
            name: p.name,
            type: p.type,
            mode: p.mode,
            status: p.status,
            totalEntries,
            scoredCount,
        };
    }));

    return successResponse(results);
});
