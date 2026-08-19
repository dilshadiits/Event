import dbConnect from '@/lib/mongodb';
import { Participant, Team, ProgramEntry } from '@/models';
import { errorResponse, successResponse, withErrorHandler, requireFestAccess } from '@/lib/api-utils';
import { updateParticipantSchema, sanitizeString, isValidObjectId } from '@/lib/validate';

// PUT /api/participants/[id]
export const PUT = withErrorHandler(async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    if (!isValidObjectId(id)) return errorResponse('Invalid participant ID', 400);

    await dbConnect();
    const participant = await Participant.findById(id);
    if (!participant) return errorResponse('Participant not found', 404);

    const caller = await requireFestAccess(participant.festId.toString());
    if (!caller) return errorResponse('Unauthorized', 403);

    const body = await req.json();
    const validated = updateParticipantSchema.parse({ ...body, id });

    if (validated.teamId !== undefined) {
        if (validated.teamId) {
            if (!isValidObjectId(validated.teamId)) return errorResponse('Invalid team ID', 400);
            const team = await Team.findOne({ _id: validated.teamId, festId: participant.festId });
            if (!team) return errorResponse('Team not found in this fest', 404);
            participant.teamId = validated.teamId as unknown as typeof participant.teamId;
        } else {
            participant.teamId = undefined;
        }
    }
    if (validated.name !== undefined) participant.name = sanitizeString(validated.name);
    if (validated.email !== undefined) participant.email = validated.email || undefined;
    if (validated.phone !== undefined) participant.phone = validated.phone || undefined;

    await participant.save();

    return successResponse({ id: participant._id.toString(), name: participant.name });
});

// DELETE /api/participants/[id] - blocked if already entered into a program
export const DELETE = withErrorHandler(async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    if (!isValidObjectId(id)) return errorResponse('Invalid participant ID', 400);

    await dbConnect();
    const participant = await Participant.findById(id);
    if (!participant) return errorResponse('Participant not found', 404);

    const caller = await requireFestAccess(participant.festId.toString());
    if (!caller) return errorResponse('Unauthorized', 403);

    const entryCount = await ProgramEntry.countDocuments({ participantId: id });
    if (entryCount > 0) {
        return errorResponse('Cannot delete a participant already entered into a program.', 400);
    }

    await Participant.findByIdAndDelete(id);

    return successResponse({ success: true });
});
