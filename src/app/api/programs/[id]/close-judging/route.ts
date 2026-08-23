import dbConnect from '@/lib/mongodb';
import { Program, ProgramEntry } from '@/models';
import { errorResponse, successResponse, withErrorHandler, requireOrgFestAccess } from '@/lib/api-utils';
import { isValidObjectId } from '@/lib/validate';

// POST /api/programs/[id]/close-judging - admin action that locks further score writes.
// Rank computation itself happens at publish-results time (a later phase), not here -
// closing judging just freezes the scoring window.
export const POST = withErrorHandler(async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    if (!isValidObjectId(id)) return errorResponse('Invalid program ID', 400);

    await dbConnect();
    const program = await Program.findById(id);
    if (!program) return errorResponse('Program not found', 404);

    const caller = await requireOrgFestAccess(program.festId.toString());
    if (!caller) return errorResponse('Unauthorized', 403);

    if (program.status === 'judging-closed' || program.status === 'results-published') {
        return errorResponse('Judging is already closed for this program', 400);
    }

    const entryCount = await ProgramEntry.countDocuments({ programId: id });
    if (entryCount === 0) {
        return errorResponse('This program has no entries yet', 400);
    }

    program.status = 'judging-closed';
    await program.save();

    return successResponse({ success: true, status: program.status });
});
