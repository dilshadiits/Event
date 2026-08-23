import dbConnect from '@/lib/mongodb';
import { Fest, Participant, User } from '@/models';
import { errorResponse, successResponse, withErrorHandler, requireOrgFestAccess } from '@/lib/api-utils';
import { isValidObjectId } from '@/lib/validate';

function normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '').slice(-10);
}

// POST /api/participants/[id]/provision-login - creates (or returns the existing)
// student User account for a participant, per the roster-first decision: admins
// import the roster, students only ever log in with phone+OTP to view it, no
// self-registration flow exists.
export const POST = withErrorHandler(async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    if (!isValidObjectId(id)) return errorResponse('Invalid participant ID', 400);

    await dbConnect();
    const participant = await Participant.findById(id);
    if (!participant) return errorResponse('Participant not found', 404);

    const caller = await requireOrgFestAccess(participant.festId.toString());
    if (!caller) return errorResponse('Unauthorized', 403);

    if (participant.userId) {
        return successResponse({ alreadyProvisioned: true, userId: participant.userId.toString() });
    }
    if (!participant.phone) {
        return errorResponse('This participant has no phone number on file - add one before enabling login', 400);
    }

    // Scope the lookup by organization too - the same phone number can legitimately
    // be a student in more than one organization, just not twice within the same one.
    const fest = await Fest.findById(participant.festId).select('organizationId').lean();
    if (!fest) return errorResponse('Fest not found', 404);

    const phone = normalizePhone(participant.phone);
    let user = await User.findOne({ phone, role: 'student', organizationId: fest.organizationId });
    if (!user) {
        user = await User.create({
            name: participant.name,
            phone,
            role: 'student',
            organizationId: fest.organizationId,
            participantId: participant._id,
        });
    }

    participant.userId = user._id;
    await participant.save();

    return successResponse({ alreadyProvisioned: false, userId: user._id.toString() }, 201);
});
