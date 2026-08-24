import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import { Participant, User } from '@/models';
import { errorResponse, successResponse, withErrorHandler, requireOrgFestAccess } from '@/lib/api-utils';
import { isValidObjectId } from '@/lib/validate';

function normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '').slice(-10);
}

// POST /api/participants/[id]/reset-password - admin resets a student's password
// back to the default (their own phone number), e.g. after they forget a password
// they changed themselves. Username is untouched.
export const POST = withErrorHandler(async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    if (!isValidObjectId(id)) return errorResponse('Invalid participant ID', 400);

    await dbConnect();
    const participant = await Participant.findById(id);
    if (!participant) return errorResponse('Participant not found', 404);

    const caller = await requireOrgFestAccess(participant.festId.toString());
    if (!caller) return errorResponse('Unauthorized', 403);

    if (!participant.userId) return errorResponse('This participant does not have login enabled yet', 400);
    if (!participant.phone) return errorResponse('This participant has no phone number on file', 400);

    const user = await User.findById(participant.userId);
    if (!user) return errorResponse('Login account not found', 404);

    user.passwordHash = await bcrypt.hash(normalizePhone(participant.phone), 10);
    await user.save();

    return successResponse({ success: true });
});
