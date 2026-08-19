import dbConnect from '@/lib/mongodb';
import { Program, ProgramEntry, Score } from '@/models';
import { errorResponse, successResponse, withErrorHandler, requireRole } from '@/lib/api-utils';
import { isValidObjectId } from '@/lib/validate';

// GET /api/programs/[id]/judge/entries - a judge's own scoring worklist.
// Deliberately never returns participant/team names — only chest numbers — so a real
// name never crosses the network to a judge's device, regardless of any display flag.
export const GET = withErrorHandler(async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    if (!isValidObjectId(id)) return errorResponse('Invalid program ID', 400);

    const caller = await requireRole(['judge']);
    if (!caller) return errorResponse('Unauthorized', 403);

    await dbConnect();
    const program = await Program.findById(id).lean();
    if (!program) return errorResponse('Program not found', 404);

    const isPanelMember = (program.judgePanel || []).some((j: unknown) => String(j) === caller.id);
    if (!isPanelMember) return errorResponse('You are not on the judge panel for this program', 403);

    const entries = await ProgramEntry.find({ programId: id, chestNumber: { $exists: true }, disqualified: false })
        .select('_id chestNumber')
        .sort({ chestNumber: 1 })
        .lean();

    const myScores = await Score.find({ programId: id, judgeId: caller.id }).lean();
    const scoreByEntry = new Map(myScores.map(s => [
        s.entryId.toString(),
        s.criteriaScores instanceof Map ? Object.fromEntries(s.criteriaScores) : s.criteriaScores,
    ]));

    return successResponse({
        program: {
            id: program._id.toString(),
            name: program.name,
            status: program.status,
            criteria: program.criteria,
        },
        entries: entries.map(e => ({
            entryId: e._id.toString(),
            chestNumber: e.chestNumber,
            scored: scoreByEntry.has(e._id.toString()),
            criteriaScores: scoreByEntry.get(e._id.toString()),
        })),
    });
});
