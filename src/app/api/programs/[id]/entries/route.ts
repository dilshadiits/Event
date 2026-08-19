import dbConnect from '@/lib/mongodb';
import { Program, ProgramEntry, Participant, Team } from '@/models';
import { errorResponse, successResponse, withErrorHandler, requireFestAccess } from '@/lib/api-utils';
import { addProgramEntriesSchema, isValidObjectId } from '@/lib/validate';

// GET /api/programs/[id]/entries - full entry list with resolved names (admin view)
export const GET = withErrorHandler(async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    if (!isValidObjectId(id)) return errorResponse('Invalid program ID', 400);

    await dbConnect();
    const program = await Program.findById(id).lean();
    if (!program) return errorResponse('Program not found', 404);

    const caller = await requireFestAccess(program.festId.toString());
    if (!caller) return errorResponse('Unauthorized', 403);

    const entries = await ProgramEntry.find({ programId: id }).sort({ chestNumber: 1, createdAt: 1 }).lean();

    const participantIds = entries.map(e => e.participantId?.toString()).filter(Boolean);
    const teamIds = entries.map(e => e.teamId?.toString()).filter(Boolean);
    const [participants, teams] = await Promise.all([
        Participant.find({ _id: { $in: participantIds } }).lean(),
        Team.find({ _id: { $in: teamIds } }).lean(),
    ]);
    const participantMap = new Map(participants.map(p => [p._id.toString(), p]));
    const teamMap = new Map(teams.map(t => [t._id.toString(), t]));

    return successResponse(entries.map(e => {
        const participant = e.participantId ? participantMap.get(e.participantId.toString()) : undefined;
        const team = e.teamId ? teamMap.get(e.teamId.toString()) : undefined;
        return {
            id: e._id.toString(),
            participantId: e.participantId?.toString(),
            teamId: e.teamId?.toString(),
            name: participant?.name || team?.name || 'Unknown',
            chestNumber: e.chestNumber,
            checkedIn: e.checkedIn,
            disqualified: e.disqualified,
            rank: e.rank,
            totalScore: e.totalScore,
        };
    }));
});

// POST /api/programs/[id]/entries - enroll participants (solo) or teams (team) into the program
export const POST = withErrorHandler(async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    if (!isValidObjectId(id)) return errorResponse('Invalid program ID', 400);

    await dbConnect();
    const program = await Program.findById(id);
    if (!program) return errorResponse('Program not found', 404);

    const caller = await requireFestAccess(program.festId.toString());
    if (!caller) return errorResponse('Unauthorized', 403);

    const body = await req.json();
    const validated = addProgramEntriesSchema.parse(body);

    if (program.type === 'solo' && validated.teamIds?.length) {
        return errorResponse('This is a solo program — enroll participants, not teams', 400);
    }
    if (program.type === 'team' && validated.participantIds?.length) {
        return errorResponse('This is a team program — enroll teams, not participants', 400);
    }

    const docs: Array<{ programId: string; participantId?: string; teamId?: string }> = [];

    if (validated.participantIds?.length) {
        for (const pid of validated.participantIds) {
            if (!isValidObjectId(pid)) return errorResponse(`Invalid participant ID: ${pid}`, 400);
        }
        const participants = await Participant.find({ _id: { $in: validated.participantIds }, festId: program.festId });
        if (participants.length !== validated.participantIds.length) {
            return errorResponse('One or more participants were not found in this fest', 404);
        }
        docs.push(...validated.participantIds.map(pid => ({ programId: id, participantId: pid })));
    }

    if (validated.teamIds?.length) {
        for (const tid of validated.teamIds) {
            if (!isValidObjectId(tid)) return errorResponse(`Invalid team ID: ${tid}`, 400);
        }
        const teams = await Team.find({ _id: { $in: validated.teamIds }, festId: program.festId });
        if (teams.length !== validated.teamIds.length) {
            return errorResponse('One or more teams were not found in this fest', 404);
        }
        docs.push(...validated.teamIds.map(tid => ({ programId: id, teamId: tid })));
    }

    try {
        const created = await ProgramEntry.insertMany(docs, { ordered: false });
        return successResponse({ created: created.length }, 201);
    } catch (error) {
        const err = error as { code?: number };
        if (err.code === 11000) {
            return errorResponse('One or more of these are already entered into this program', 409);
        }
        throw error;
    }
});
