import dbConnect from '@/lib/mongodb';
import { Program, ProgramEntry, User } from '@/models';
import { errorResponse, successResponse, withErrorHandler, requireOrgFestAccess } from '@/lib/api-utils';
import { updateProgramSchema, sanitizeString, isValidObjectId } from '@/lib/validate';

// GET /api/programs/[id]
export const GET = withErrorHandler(async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    if (!isValidObjectId(id)) return errorResponse('Invalid program ID', 400);

    await dbConnect();
    const program = await Program.findById(id).lean();
    if (!program) return errorResponse('Program not found', 404);

    const caller = await requireOrgFestAccess(program.festId.toString());
    if (!caller) return errorResponse('Unauthorized', 403);

    const judges = await User.find({ _id: { $in: program.judgePanel || [] } }).select('name email').lean();

    return successResponse({
        id: program._id.toString(),
        festId: program.festId.toString(),
        name: program.name,
        code: program.code,
        type: program.type,
        mode: program.mode,
        category: program.category,
        scheduledAt: program.scheduledAt,
        venue: program.venue,
        posterUrl: program.posterUrl,
        status: program.status,
        criteria: program.criteria,
        judgePanel: judges.map(j => ({ id: j._id.toString(), name: j.name, email: j.email })),
        resultsPublished: program.resultsPublished,
    });
});

// PUT /api/programs/[id] - general edit (name/schedule/venue/status), NOT criteria (see /criteria)
export const PUT = withErrorHandler(async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    if (!isValidObjectId(id)) return errorResponse('Invalid program ID', 400);

    await dbConnect();
    const program = await Program.findById(id);
    if (!program) return errorResponse('Program not found', 404);

    const caller = await requireOrgFestAccess(program.festId.toString());
    if (!caller) return errorResponse('Unauthorized', 403);

    const body = await req.json();
    const validated = updateProgramSchema.parse({ ...body, id });

    if (validated.name !== undefined) program.name = sanitizeString(validated.name);
    if (validated.code !== undefined) program.code = validated.code;
    if (validated.category !== undefined) program.category = validated.category;
    if (validated.scheduledAt !== undefined) program.scheduledAt = validated.scheduledAt ? new Date(validated.scheduledAt) : undefined;
    if (validated.venue !== undefined) program.venue = validated.venue;
    if (validated.posterUrl !== undefined) program.posterUrl = validated.posterUrl;
    if (validated.status !== undefined) program.status = validated.status;

    await program.save();

    return successResponse({ id: program._id.toString(), name: program.name });
});

// DELETE /api/programs/[id] - blocked if entries already exist
export const DELETE = withErrorHandler(async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    if (!isValidObjectId(id)) return errorResponse('Invalid program ID', 400);

    await dbConnect();
    const program = await Program.findById(id);
    if (!program) return errorResponse('Program not found', 404);

    const caller = await requireOrgFestAccess(program.festId.toString());
    if (!caller) return errorResponse('Unauthorized', 403);

    const entryCount = await ProgramEntry.countDocuments({ programId: id });
    if (entryCount > 0) {
        return errorResponse('Cannot delete a program that already has entries.', 400);
    }

    await Program.findByIdAndDelete(id);

    return successResponse({ success: true });
});
