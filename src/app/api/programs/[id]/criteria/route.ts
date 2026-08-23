import dbConnect from '@/lib/mongodb';
import { Program, Score } from '@/models';
import { errorResponse, successResponse, withErrorHandler, requireOrgFestAccess } from '@/lib/api-utils';
import { updateProgramCriteriaSchema, isValidObjectId } from '@/lib/validate';

// PUT /api/programs/[id]/criteria - replace the criteria list.
// Blocked once any judge has submitted a score, since Score.criteriaScores keys
// are criterion ids - changing the list would silently orphan existing scores.
export const PUT = withErrorHandler(async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    if (!isValidObjectId(id)) return errorResponse('Invalid program ID', 400);

    await dbConnect();
    const program = await Program.findById(id);
    if (!program) return errorResponse('Program not found', 404);

    const caller = await requireOrgFestAccess(program.festId.toString());
    if (!caller) return errorResponse('Unauthorized', 403);

    const body = await req.json();
    const validated = updateProgramCriteriaSchema.parse({ ...body, id });

    const scoredCount = await Score.countDocuments({ programId: id });
    if (scoredCount > 0) {
        return errorResponse('Cannot change criteria after judging has started for this program.', 400);
    }

    program.criteria = validated.criteria;
    await program.save();

    return successResponse({ id: program._id.toString(), criteria: program.criteria });
});
