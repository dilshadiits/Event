import dbConnect from '@/lib/mongodb';
import { Program, ProgramEntry, Score } from '@/models';
import { errorResponse, successResponse, withErrorHandler, requireOrgFestAccess } from '@/lib/api-utils';
import { isValidObjectId } from '@/lib/validate';

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
