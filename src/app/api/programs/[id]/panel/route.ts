import dbConnect from '@/lib/mongodb';
import { Program, User } from '@/models';
import { errorResponse, successResponse, withErrorHandler, requireOrgFestAccess } from '@/lib/api-utils';
import { updateProgramPanelSchema, isValidObjectId } from '@/lib/validate';

// PUT /api/programs/[id]/panel - assign/replace the judge panel for a program
export const PUT = withErrorHandler(async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    if (!isValidObjectId(id)) return errorResponse('Invalid program ID', 400);

    await dbConnect();
    const program = await Program.findById(id);
    if (!program) return errorResponse('Program not found', 404);

    const caller = await requireOrgFestAccess(program.festId.toString());
    if (!caller) return errorResponse('Unauthorized', 403);

    const body = await req.json();
    const validated = updateProgramPanelSchema.parse({ ...body, id });

    for (const judgeId of validated.judgePanel) {
        if (!isValidObjectId(judgeId)) return errorResponse(`Invalid judge ID: ${judgeId}`, 400);
    }

    const judges = await User.find({ _id: { $in: validated.judgePanel }, role: 'judge', isActive: true });
    if (judges.length !== validated.judgePanel.length) {
        return errorResponse('One or more selected users are not active judges', 400);
    }

    program.judgePanel = validated.judgePanel as unknown as typeof program.judgePanel;
    await program.save();

    return successResponse({
        id: program._id.toString(),
        judgePanel: judges.map(j => ({ id: j._id.toString(), name: j.name })),
    });
});
