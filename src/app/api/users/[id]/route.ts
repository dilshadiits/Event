import dbConnect from '@/lib/mongodb';
import { User } from '@/models';
import { errorResponse, successResponse, withErrorHandler, requireRole } from '@/lib/api-utils';
import { updateUserSchema, isValidObjectId } from '@/lib/validate';

// A Super Admin may only manage accounts within their own organization, and never
// another org's admins. Product Admin may manage anyone.
async function authorizeTarget(targetId: string) {
    const caller = await requireRole(['product-admin', 'super-admin']);
    if (!caller) return null;
    if (caller.role === 'product-admin') return caller;

    await dbConnect();
    const target = await User.findById(targetId).select('organizationId').lean();
    if (!target || String(target.organizationId) !== caller.organizationId) return null;
    return caller;
}

// PUT /api/users/[id] - edit role/festIds/active status
export const PUT = withErrorHandler(async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    if (!isValidObjectId(id)) return errorResponse('Invalid user ID', 400);

    const caller = await authorizeTarget(id);
    if (!caller) return errorResponse('Unauthorized', 403);

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

// DELETE /api/users/[id] - deactivate a user. Soft-delete via isActive rather than a
// hard delete, since Judge/Event Admin references (e.g. Program.judgePanel,
// Score.judgeId) should keep resolving to a named account for audit purposes.
export const DELETE = withErrorHandler(async (req: Request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    if (!isValidObjectId(id)) return errorResponse('Invalid user ID', 400);

    const caller = await authorizeTarget(id);
    if (!caller) return errorResponse('Unauthorized', 403);

    await dbConnect();
    const user = await User.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!user) return errorResponse('User not found', 404);

    return successResponse({ success: true });
});
