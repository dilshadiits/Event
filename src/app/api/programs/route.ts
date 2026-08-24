import dbConnect from '@/lib/mongodb';
import { Program } from '@/models';
import { errorResponse, successResponse, withErrorHandler, requireOrgFestAccess } from '@/lib/api-utils';
import { createProgramSchema, sanitizeString, isValidObjectId } from '@/lib/validate';

// GET /api/programs?festId=xxx
export const GET = withErrorHandler(async (req: Request) => {
    const { searchParams } = new URL(req.url);
    const festId = searchParams.get('festId');
    if (!festId || !isValidObjectId(festId)) return errorResponse('Valid fest ID is required', 400);

    const caller = await requireOrgFestAccess(festId);
    if (!caller) return errorResponse('Unauthorized', 403);

    await dbConnect();
    const programs = await Program.find({ festId }).sort({ scheduledAt: 1, name: 1 }).lean();

    return successResponse(programs.map(p => ({
        id: p._id.toString(),
        name: p.name,
        code: p.code,
        type: p.type,
        mode: p.mode,
        category: p.category,
        scheduledAt: p.scheduledAt,
        venue: p.venue,
        posterUrl: p.posterUrl,
        status: p.status,
        criteriaCount: p.criteria?.length || 0,
        judgeCount: p.judgePanel?.length || 0,
        resultsPublished: p.resultsPublished,
    })));
});

// POST /api/programs
export const POST = withErrorHandler(async (req: Request) => {
    const body = await req.json();
    const validated = createProgramSchema.parse(body);
    if (!isValidObjectId(validated.festId)) return errorResponse('Invalid fest ID', 400);

    const caller = await requireOrgFestAccess(validated.festId);
    if (!caller) return errorResponse('Unauthorized', 403);

    await dbConnect();
    const program = await Program.create({
        festId: validated.festId,
        name: sanitizeString(validated.name),
        code: validated.code,
        type: validated.type,
        mode: validated.mode,
        category: validated.category,
        scheduledAt: validated.scheduledAt ? new Date(validated.scheduledAt) : undefined,
        venue: validated.venue,
        criteria: validated.criteria,
    });

    return successResponse({ id: program._id.toString(), name: program.name }, 201);
});
