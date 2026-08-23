import dbConnect from '@/lib/mongodb';
import { Fest, Program, ProgramEntry, Team, Participant } from '@/models';
import { errorResponse, successResponse, withErrorHandler, requireOrgFestAccess } from '@/lib/api-utils';
import { isValidObjectId } from '@/lib/validate';
import { computeRanks, computeTeamPoints } from '@/lib/scoring';

// GET /api/fests/[id]/standings[?admin=true] - live team championship standings.
//
// Public mode (default, no session required): only counts programs with
// resultsPublished=true, using their persisted ranks, and only if the fest's
// resultsArePublic flag is on - mirrors the existing admin=true param pattern in
// /api/award-votes for the public/admin split.
//
// Admin mode (?admin=true, requires fest access): additionally computes a live,
// unpersisted preview of standings using in-progress programs' current entry
// scores, so admins can watch the championship shift in real time before anything
// is officially published. Each program's contribution is flagged `official` so the
// UI can visually distinguish "counts for real" from "preview only".
export const GET = withErrorHandler(async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    if (!isValidObjectId(id)) return errorResponse('Invalid fest ID', 400);

    const { searchParams } = new URL(req.url);
    const isAdmin = searchParams.get('admin') === 'true';

    await dbConnect();
    const fest = await Fest.findById(id).lean();
    if (!fest) return errorResponse('Fest not found', 404);

    if (isAdmin) {
        const caller = await requireOrgFestAccess(id);
        if (!caller) return errorResponse('Unauthorized', 403);
    } else if (!fest.resultsArePublic) {
        return errorResponse('Results are not public yet', 404);
    }

    const pointsScheme = fest.pointsScheme instanceof Map
        ? Object.fromEntries(fest.pointsScheme)
        : (fest.pointsScheme as unknown as Record<string, number>) || {};
    const multiplier = fest.teamPointsMultiplier || 1;

    const programFilter = isAdmin
        ? { festId: id, status: { $in: ['in-progress', 'judging-closed', 'results-published'] } }
        : { festId: id, resultsPublished: true };
    const programs = await Program.find(programFilter).lean();

    const teams = await Team.find({ festId: id }).lean();
    const teamPoints = new Map<string, number>();
    const programBreakdown: Array<{ programId: string; programName: string; official: boolean }> = [];

    for (const program of programs) {
        const official = program.resultsPublished;
        const entries = await ProgramEntry.find({ programId: program._id, disqualified: false }).lean();

        const ranked = official
            ? entries.filter(e => e.rank != null).map(e => ({ id: e._id.toString(), rank: e.rank as number, entry: e }))
            : computeRanks(entries.map(e => ({ id: e._id.toString(), totalScore: e.totalScore })))
                .map(r => ({ id: r.entryId, rank: r.rank, entry: entries.find(e => e._id.toString() === r.entryId)! }));

        if (ranked.length === 0) continue;

        let teamPointsInput;
        if (program.type === 'team') {
            teamPointsInput = ranked.map(r => ({ rank: r.rank, teamId: r.entry.teamId?.toString(), isTeamProgram: true }));
        } else {
            const participantIds = ranked.map(r => r.entry.participantId?.toString()).filter(Boolean);
            const participants = await Participant.find({ _id: { $in: participantIds } }).select('teamId').lean();
            const participantTeamMap = new Map(participants.map(p => [p._id.toString(), p.teamId?.toString()]));
            teamPointsInput = ranked.map(r => ({
                rank: r.rank,
                teamId: r.entry.participantId ? participantTeamMap.get(r.entry.participantId.toString()) : undefined,
                isTeamProgram: false,
            }));
        }

        const programTeamPoints = computeTeamPoints(teamPointsInput, pointsScheme, multiplier);
        for (const [teamId, points] of programTeamPoints) {
            teamPoints.set(teamId, (teamPoints.get(teamId) || 0) + points);
        }
        programBreakdown.push({ programId: program._id.toString(), programName: program.name, official });
    }

    const standings = teams
        .map(t => ({
            teamId: t._id.toString(),
            teamName: t.name,
            color: t.color,
            points: teamPoints.get(t._id.toString()) || 0,
        }))
        .sort((a, b) => b.points - a.points);

    return successResponse({
        fest: { id: fest._id.toString(), name: fest.name, resultsArePublic: fest.resultsArePublic },
        standings,
        programs: programBreakdown,
    });
});
