import bcrypt from 'bcryptjs';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models';
import { errorResponse, successResponse, withErrorHandler, requireRole } from '@/lib/api-utils';

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

// PUT /api/student/password - a signed-in student changes their own password.
export const PUT = withErrorHandler(async (req: Request) => {
    const caller = await requireRole(['student']);
    if (!caller) return errorResponse('Unauthorized', 403);

    const body = await req.json();
    const validated = changePasswordSchema.parse(body);

    await dbConnect();
    const user = await User.findById(caller.id);
    if (!user || !user.passwordHash) return errorResponse('Account not found', 404);

    const valid = await bcrypt.compare(validated.currentPassword, user.passwordHash);
    if (!valid) return errorResponse('Current password is incorrect', 400);

    user.passwordHash = await bcrypt.hash(validated.newPassword, 10);
    await user.save();

    return successResponse({ success: true });
});
