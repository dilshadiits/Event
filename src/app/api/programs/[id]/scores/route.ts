import dbConnect from '@/lib/mongodb';
import { Fest, Program, ProgramEntry, Score, User } from '@/models';
import { errorResponse, successResponse, withErrorHandler, requireRole } from '@/lib/api-utils';
import { submitScoreSchema, isValidObjectId } from '@/lib/validate';

// POST /api/programs/[id]/scores - submit or update a judge's scores for one entry.
// Upserts on the (programId, entryId, judgeId) unique index, so resubmitting just
// edits the same Score doc rather than creating duplicates. Recomputes the entry's
// cached totalScore (average of every judge's total who has scored it so far) in the
// same request, so the standings/worklist views never need to re-aggregate raw scores.
//
// Admins (event-admin/super-admin/product-admin) may also pass `judgeId` to submit or
// correct a score on behalf of a specific judge - e.g. fixing a typo'd mark, or entering
// a score for a judge who couldn't use the app. A plain judge can only ever write their
// own judgeId (enforced below), and event-admin may only use this to edit an *existing*
// judge's entry, not add their own as an extra judge (that stays super-admin/product-admin
// only, mirroring who else in this app is allowed to act as a judge).
export const POST = withErrorHandler(async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    if (!isValidObjectId(id)) return errorResponse('Invalid program ID', 400);

    const caller = await requireRole(['judge', 'super-admin', 'product-admin', 'event-admin']);
    if (!caller) return errorResponse('Unauthorized', 403);

    await dbConnect();
    const program = await Program.findById(id);
    if (!program) return errorResponse('Program not found', 404);

    const isAdmin = caller.role === 'super-admin' || caller.role === 'product-admin' || caller.role === 'event-admin';

    if (caller.role === 'judge') {
        const isPanelMember = (program.judgePanel || []).some((j: unknown) => String(j) === caller.id);
        if (!isPanelMember) return errorResponse('You are not on the judge panel for this program', 403);
    } else if (caller.role === 'super-admin' || caller.role === 'event-admin') {
        const fest = await Fest.findById(program.festId).select('organizationId').lean();
        if (!fest || String(fest.organizationId) !== caller.organizationId) return errorResponse('Program not found', 404);
        if (caller.role === 'event-admin' && !caller.festIds?.includes(program.festId.toString())) {
            return errorResponse('Program not found', 404);
        }
    }

    if (program.status === 'judging-closed' || program.status === 'results-published') {
        return errorResponse('Judging is closed for this program', 400);
    }

    const body = await req.json();
    const validated = submitScoreSchema.parse(body);
    if (!isValidObjectId(validated.entryId)) return errorResponse('Invalid entry ID', 400);

    let targetJudgeId = caller.id;
    if (validated.judgeId && validated.judgeId !== caller.id) {
        if (!isAdmin) return errorResponse('Only admins can submit scores on behalf of another judge', 403);
        if (!isValidObjectId(validated.judgeId)) return errorResponse('Invalid judge ID', 400);
        const targetJudge = await User.findById(validated.judgeId).select('role').lean();
        if (!targetJudge || targetJudge.role !== 'judge') return errorResponse('Target user is not a judge', 400);
        targetJudgeId = validated.judgeId;
    } else if (caller.role === 'event-admin') {
        return errorResponse('Event admins may only edit an existing judge\'s score, not submit as themselves', 403);
    }

    const entry = await ProgramEntry.findOne({ _id: validated.entryId, programId: id });
    if (!entry) return errorResponse('Entry not found in this program', 404);
    if (!entry.chestNumber) return errorResponse('This entry has not been assigned a chest number yet', 400);

    const criteriaIds = new Set(program.criteria.map((c: { id: string }) => c.id));
    const submittedIds = Object.keys(validated.criteriaScores);
    if (submittedIds.length !== criteriaIds.size || !submittedIds.every(cid => criteriaIds.has(cid))) {
        return errorResponse('Scores must be submitted for every judging criterion, no more and no less', 400);
    }

    let total = 0;
    for (const criterion of program.criteria) {
        const score = validated.criteriaScores[criterion.id];
        if (score < 0 || score > criterion.maxScore) {
            return errorResponse(`Score for "${criterion.label}" must be between 0 and ${criterion.maxScore}`, 400);
        }
        total += score * criterion.weight;
    }

    await Score.findOneAndUpdate(
        { programId: id, entryId: validated.entryId, judgeId: targetJudgeId },
        {
            programId: id,
            entryId: validated.entryId,
            judgeId: targetJudgeId,
            criteriaScores: validated.criteriaScores,
            total,
            submittedAt: new Date(),
        },
        { upsert: true }
    );

    const allScoresForEntry = await Score.find({ entryId: validated.entryId }).select('total').lean();
    const avgTotal = allScoresForEntry.reduce((sum, s) => sum + s.total, 0) / allScoresForEntry.length;

    entry.totalScore = avgTotal;
    if (program.status === 'chest-numbers-shuffled') {
        program.status = 'in-progress';
        await program.save();
    }
    await entry.save();

    return successResponse({ success: true, total, entryTotalScore: avgTotal });
});
