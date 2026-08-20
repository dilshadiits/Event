import dbConnect from '@/lib/mongodb';
import { Program, ProgramEntry, Participant, Team } from '@/models';
import { errorResponse, successResponse, withErrorHandler, requireOrgFestAccess } from '@/lib/api-utils';
import { isValidObjectId } from '@/lib/validate';

// GET /api/programs/[id]/report - attendance breakdown for a program: total entries,
// how many checked in, no-shows, and a per-team rollup (for solo programs, rolled up
// via each participant's own team; participants with no team land in a "No Team" bucket).
export const GET = withErrorHandler(async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    if (!isValidObjectId(id)) return errorResponse('Invalid program ID', 400);

    await dbConnect();
    const program = await Program.findById(id).lean();
    if (!program) return errorResponse('Program not found', 404);

    const caller = await requireOrgFestAccess(program.festId.toString());
    if (!caller) return errorResponse('Unauthorized', 403);

    const entries = await ProgramEntry.find({ programId: id }).lean();
    const totalEntries = entries.length;
    const checkedIn = entries.filter(e => e.checkedIn).length;
    const noShows = totalEntries - checkedIn;

    const teamOf = new Map<string, string | undefined>(); // entryId -> teamId
    if (program.type === 'team') {
        for (const e of entries) teamOf.set(e._id.toString(), e.teamId?.toString());
    } else {
        const participantIds = entries.map(e => e.participantId?.toString()).filter(Boolean);
        const participants = await Participant.find({ _id: { $in: participantIds } }).select('teamId').lean();
        const participantTeamMap = new Map(participants.map(p => [p._id.toString(), p.teamId?.toString()]));
        for (const e of entries) {
            teamOf.set(e._id.toString(), e.participantId ? participantTeamMap.get(e.participantId.toString()) : undefined);
        }
    }

    const teamIds = [...new Set([...teamOf.values()].filter(Boolean))] as string[];
    const teams = await Team.find({ _id: { $in: teamIds } }).select('name').lean();
    const teamNameMap = new Map(teams.map(t => [t._id.toString(), t.name]));

    const byTeamMap = new Map<string, { teamId: string | null; teamName: string; entered: number; checkedIn: number }>();
    for (const e of entries) {
        const teamId = teamOf.get(e._id.toString()) || null;
        const key = teamId || '__no_team__';
        if (!byTeamMap.has(key)) {
            byTeamMap.set(key, { teamId, teamName: teamId ? (teamNameMap.get(teamId) || 'Unknown') : 'No Team', entered: 0, checkedIn: 0 });
        }
        const bucket = byTeamMap.get(key)!;
        bucket.entered++;
        if (e.checkedIn) bucket.checkedIn++;
    }

    return successResponse({
        totalEntries,
        checkedIn,
        noShows,
        byTeam: [...byTeamMap.values()].sort((a, b) => b.entered - a.entered),
    });
});
