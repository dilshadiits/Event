import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import { Fest, Participant, User } from '@/models';
import { errorResponse, successResponse, withErrorHandler, requireOrgFestAccess } from '@/lib/api-utils';
import { isValidObjectId } from '@/lib/validate';
import { generateUniqueUsername } from '@/lib/studentAuth';

function normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '').slice(-10);
}

// POST /api/participants/[id]/provision-login - creates (or returns the existing)
// student User account for a participant, per the roster-first decision: admins
// import the roster, students log in with a generated username (their first name,
// deduped) and their phone number as the default password - no self-registration
// flow exists. Also backfills username/password onto any account provisioned
// before this scheme existed.
export const POST = withErrorHandler(async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    if (!isValidObjectId(id)) return errorResponse('Invalid participant ID', 400);

    await dbConnect();
    const participant = await Participant.findById(id);
    if (!participant) return errorResponse('Participant not found', 404);

    const caller = await requireOrgFestAccess(participant.festId.toString());
    if (!caller) return errorResponse('Unauthorized', 403);

    if (!participant.phone) {
        return errorResponse('This participant has no phone number on file - add one before enabling login', 400);
    }
    const phone = normalizePhone(participant.phone);

    if (participant.userId) {
        const existing = await User.findById(participant.userId);
        if (existing && !existing.username) {
            existing.username = await generateUniqueUsername(existing.name);
            existing.passwordHash = await bcrypt.hash(phone, 10);
            await existing.save();
        }
        return successResponse({ alreadyProvisioned: true, userId: participant.userId.toString(), username: existing?.username });
    }

    // Scope the lookup by organization too - the same phone number can legitimately
    // be a student in more than one organization, just not twice within the same one.
    const fest = await Fest.findById(participant.festId).select('organizationId').lean();
    if (!fest) return errorResponse('Fest not found', 404);

    let user = await User.findOne({ phone, role: 'student', organizationId: fest.organizationId });
    if (!user) {
        const username = await generateUniqueUsername(participant.name);
        user = await User.create({
            name: participant.name,
            phone,
            username,
            passwordHash: await bcrypt.hash(phone, 10),
            role: 'student',
            organizationId: fest.organizationId,
            participantId: participant._id,
        });
    } else if (!user.username) {
        user.username = await generateUniqueUsername(user.name);
        user.passwordHash = await bcrypt.hash(phone, 10);
        await user.save();
    }

    participant.userId = user._id;
    await participant.save();

    return successResponse({ alreadyProvisioned: false, userId: user._id.toString(), username: user.username }, 201);
});
