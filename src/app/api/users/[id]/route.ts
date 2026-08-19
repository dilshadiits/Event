import dbConnect from '@/lib/mongodb';
import { User } from '@/models';
import { errorResponse, successResponse, withErrorHandler, requireRole } from '@/lib/api-utils';
import { updateUserSchema, isValidObjectId } from '@/lib/validate';

// PUT /api/users/[id] - edit role/festIds/active status (Super Admin only)
export const PUT = withErrorHandler(async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const caller = await requireRole(['super-admin']);
    if (!caller) return errorResponse('Unauthorized', 403);

    const { id } = await context.params;
    if (!isValidObjectId(id)) return errorResponse('Invalid user ID', 400);

    const body = await req.json();
    const validated = updateUserSchema.parse({ ...body, id });

    await dbConnect();
    const user = await User.findByIdAndUpdate(
        id,
        {
            ...(validated.name !== undefined && { name: validated.name }),
            ...(validated.role !== undefined && { role: validated.role }),
            ...(validated.festIds !== undefined && { festIds: validated.festIds }),
            ...(validated.isActive !== undefined && { isActive: validated.isActive }),
        },
        { new: true }
    ).select('-passwordHash');

    if (!user) return errorResponse('User not found', 404);

    return successResponse({ ...user.toObject(), id: user._id.toString() });
});

// DELETE /api/users/[id] - deactivate a user (Super Admin only). Soft-delete via isActive
// rather than a hard delete, since Judge/Event Admin references (e.g. Program.judgePanel,
// Score.judgeId) should keep resolving to a named account for audit purposes.
export const DELETE = withErrorHandler(async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const caller = await requireRole(['super-admin']);
    if (!caller) return errorResponse('Unauthorized', 403);

    const { id } = await context.params;
    if (!isValidObjectId(id)) return errorResponse('Invalid user ID', 400);

    await dbConnect();
    const user = await User.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!user) return errorResponse('User not found', 404);

    return successResponse({ success: true });
});
