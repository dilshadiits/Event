import dbConnect from '@/lib/mongodb';
import { Program, ProgramEntry, Participant, Team } from '@/models';
import { errorResponse, successResponse, withErrorHandler, requireOrgFestAccess } from '@/lib/api-utils';
import { isValidObjectId } from '@/lib/validate';

// POST /api/programs/[id]/checkin - QR check-in for a program entry.
// Deliberately a new route rather than an extension of /api/scan - that route already
// branches on 3 QR formats for guest check-in, and adding a 4th competition format
// risks regressing the working attendee/guest flow during a live event.
//
// The QR payload is just the ProgramEntry's own _id (same value used to render the
// blind chest card in QRCodeModal). Unlike the judge worklist, this response reveals
// the participant/team name - check-in staff aren't judges, and confirming the right
// person is standing at the door is the whole point of the scan.
export const POST = withErrorHandler(async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    if (!isValidObjectId(id)) return errorResponse('Invalid program ID', 400);

    await dbConnect();
    const program = await Program.findById(id);
    if (!program) return errorResponse('Program not found', 404);

    const caller = await requireOrgFestAccess(program.festId.toString());
    if (!caller) return errorResponse('Unauthorized', 403);

    const body = await req.json();
    const scanData = typeof body.scanData === 'string' ? body.scanData.trim() : '';

    if (!isValidObjectId(scanData)) {
        return successResponse({ success: false, message: 'Invalid QR code for this program.' });
    }

    const entry = await ProgramEntry.findOne({ _id: scanData, programId: id });
    if (!entry) {
        return successResponse({ success: false, message: 'This chest card does not belong to this program.' });
    }

    const [participant, team] = await Promise.all([
        entry.participantId ? Participant.findById(entry.participantId).lean() : null,
        entry.teamId ? Team.findById(entry.teamId).lean() : null,
    ]);
    const name = participant?.name || team?.name || 'Unknown';

    if (entry.disqualified) {
        return successResponse({ success: false, message: `${name} (Chest #${entry.chestNumber}) is disqualified from this program.` });
    }

    if (entry.checkedIn) {
        return successResponse({
            success: false,
            message: `Already checked in at ${entry.checkedInAt ? new Date(entry.checkedInAt).toLocaleTimeString() : 'an earlier time'}.`,
            entry: { name, chestNumber: entry.chestNumber },
        });
    }

    entry.checkedIn = true;
    entry.checkedInAt = new Date();
    await entry.save();

    return successResponse({
        success: true,
        message: 'Check-in successful!',
        entry: { name, chestNumber: entry.chestNumber },
    });
});
