import dbConnect from '@/lib/mongodb';
import { Program, ProgramEntry } from '@/models';
import { errorResponse, successResponse, withErrorHandler, requireFestAccess } from '@/lib/api-utils';
import { isValidObjectId } from '@/lib/validate';
import { computeRanks } from '@/lib/scoring';

// POST /api/programs/[id]/publish-results - computes and persists final ranks from
// each entry's current totalScore, then flips the program to results-published. This
// is the gate for the public results page and for certificate/poster generation.
export const POST = withErrorHandler(async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    if (!isValidObjectId(id)) return errorResponse('Invalid program ID', 400);

    await dbConnect();
    const program = await Program.findById(id);
    if (!program) return errorResponse('Program not found', 404);

    const caller = await requireFestAccess(program.festId.toString());
    if (!caller) return errorResponse('Unauthorized', 403);

    if (program.status !== 'judging-closed') {
        return errorResponse('Close judging before publishing results', 400);
    }

    const entries = await ProgramEntry.find({ programId: id, disqualified: false }).lean();
    const ranked = computeRanks(entries.map(e => ({ id: e._id.toString(), totalScore: e.totalScore })));

    await ProgramEntry.bulkWrite(
        ranked.map(r => ({
            updateOne: { filter: { _id: r.entryId }, update: { $set: { rank: r.rank } } },
        }))
    );

    program.status = 'results-published';
    program.resultsPublished = true;
    await program.save();

    return successResponse({ success: true, ranked: ranked.length, unranked: entries.length - ranked.length });
});
