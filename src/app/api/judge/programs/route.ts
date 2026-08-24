import dbConnect from '@/lib/mongodb';
import { Fest, Program, ProgramEntry, Score } from '@/models';
import { errorResponse, successResponse, withErrorHandler, requireRole } from '@/lib/api-utils';

// GET /api/judge/programs - the signed-in user's judging worklist. For a judge, that's
// every program they're on the panel for. Super-admin/product-admin have blanket judging
// access (mirrors their standing access to every other competitions surface), so they see
// every program in-scope for them rather than being limited to explicit panel membership.
export const GET = withErrorHandler(async () => {
    const caller = await requireRole(['judge', 'super-admin', 'product-admin']);
    if (!caller) return errorResponse('Unauthorized', 403);

    await dbConnect();

    let programQuery: Record<string, unknown> = { judgePanel: caller.id };
    if (caller.role === 'product-admin') {
        programQuery = {};
    } else if (caller.role === 'super-admin') {
        const orgFests = await Fest.find({ organizationId: caller.organizationId }).select('_id').lean();
        programQuery = { festId: { $in: orgFests.map(f => f._id) } };
    }

    const programs = await Program.find(programQuery).sort({ scheduledAt: 1, name: 1 }).lean();

    const results = await Promise.all(programs.map(async (p) => {
        const [totalEntries, scoredCount] = await Promise.all([
            ProgramEntry.countDocuments({ programId: p._id, chestNumber: { $exists: true }, disqualified: false }),
            Score.countDocuments({ programId: p._id, judgeId: caller.id }),
        ]);
        return {
            id: p._id.toString(),
            name: p.name,
            type: p.type,
            mode: p.mode,
            status: p.status,
            totalEntries,
            scoredCount,
        };
    }));

    return successResponse(results);
});
