import dbConnect from '@/lib/mongodb';
import { Program, ProgramEntry, Score, User } from '@/models';
import { errorResponse, successResponse, withErrorHandler, requireOrgFestAccess } from '@/lib/api-utils';
import { isValidObjectId } from '@/lib/validate';

// GET /api/programs/[id]/entries/[entryId] - every judge's individual score breakdown
// for this entry (admin-only - a judge's own scores stay visible only through their own
// worklist at /api/programs/[id]/judge/entries, never another judge's marks).
export const GET = withErrorHandler(async (req: Request, context: { params: Promise<{ id: string; entryId: string }> }) => {
    const { id, entryId } = await context.params;
    if (!isValidObjectId(id) || !isValidObjectId(entryId)) return errorResponse('Invalid ID', 400);

    await dbConnect();
    const program = await Program.findById(id).lean();
    if (!program) return errorResponse('Program not found', 404);

    const caller = await requireOrgFestAccess(program.festId.toString());
    if (!caller) return errorResponse('Unauthorized', 403);

    const entry = await ProgramEntry.findOne({ _id: entryId, programId: id }).lean();
    if (!entry) return errorResponse('Entry not found', 404);

    const scores = await Score.find({ entryId }).lean();
    const judges = await User.find({ _id: { $in: scores.map(s => s.judgeId) } }).select('name').lean();
    const judgeNameById = new Map(judges.map(j => [j._id.toString(), j.name]));

    return successResponse({
        criteria: program.criteria,
        entryTotalScore: entry.totalScore,
        scores: scores.map(s => ({
            judgeId: s.judgeId.toString(),
            judgeName: judgeNameById.get(s.judgeId.toString()) || 'Unknown judge',
            criteriaScores: s.criteriaScores instanceof Map ? Object.fromEntries(s.criteriaScores) : s.criteriaScores,
            total: s.total,
            submittedAt: s.submittedAt,
        })),
    });
});

// DELETE /api/programs/[id]/entries/[entryId] - remove an entry, blocked once judged
export const DELETE = withErrorHandler(async (req: Request, context: { params: Promise<{ id: string; entryId: string }> }) => {
    const { id, entryId } = await context.params;
    if (!isValidObjectId(id) || !isValidObjectId(entryId)) return errorResponse('Invalid ID', 400);

    await dbConnect();
    const program = await Program.findById(id);
    if (!program) return errorResponse('Program not found', 404);

    const caller = await requireOrgFestAccess(program.festId.toString());
    if (!caller) return errorResponse('Unauthorized', 403);

    const entry = await ProgramEntry.findOne({ _id: entryId, programId: id });
    if (!entry) return errorResponse('Entry not found', 404);

    const scoredCount = await Score.countDocuments({ entryId });
    if (scoredCount > 0) {
        return errorResponse('Cannot remove an entry that has already been scored', 400);
    }

    await ProgramEntry.findByIdAndDelete(entryId);

    return successResponse({ success: true });
});
