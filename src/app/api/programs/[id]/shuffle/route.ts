import dbConnect from '@/lib/mongodb';
import { Program, ProgramEntry, Score } from '@/models';
import { errorResponse, successResponse, withErrorHandler, requireFestAccess } from '@/lib/api-utils';
import { shuffleProgramSchema, isValidObjectId } from '@/lib/validate';
import { shuffleChestNumbers } from '@/lib/chestNumbers';

// POST /api/programs/[id]/shuffle - assign fresh chest numbers to every entry in this
// program. Blocked once judging has started (any Score exists) unless force=true is
// passed — re-shuffling after that would silently invalidate scores already tied to
// chest numbers a judge saw, so it requires an explicit admin confirmation.
export const POST = withErrorHandler(async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    if (!isValidObjectId(id)) return errorResponse('Invalid program ID', 400);

    await dbConnect();
    const program = await Program.findById(id);
    if (!program) return errorResponse('Program not found', 404);

    const caller = await requireFestAccess(program.festId.toString());
    if (!caller) return errorResponse('Unauthorized', 403);

    const body = await req.json().catch(() => ({}));
    const validated = shuffleProgramSchema.parse(body);

    const scoredCount = await Score.countDocuments({ programId: id });
    if (scoredCount > 0 && !validated.force) {
        return errorResponse('Judging has already started for this program. Pass force=true to confirm re-shuffling (this will not touch existing scores, but chest numbers judges already saw will change).', 409);
    }

    const entries = await ProgramEntry.find({ programId: id }).select('_id').lean();
    if (entries.length === 0) {
        return errorResponse('No entries to shuffle. Add participants or teams first.', 400);
    }

    await shuffleChestNumbers(id, entries.map(e => e._id.toString()));

    if (program.status === 'scheduled') {
        program.status = 'chest-numbers-shuffled';
        await program.save();
    }

    return successResponse({ success: true, count: entries.length });
});
