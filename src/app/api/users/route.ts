import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models';
import { errorResponse, successResponse, withErrorHandler, requireRole } from '@/lib/api-utils';
import { createUserSchema, isValidObjectId } from '@/lib/validate';

// GET /api/users?role=&festId=&organizationId= - list accounts.
// Product Admin sees everyone across every organization (optionally narrowed to one
// via organizationId). Super Admin sees only their own organization's accounts.
// Event Admin only sees judges scoped to their own fests (needed to populate
// judge-panel pickers) — never other admins' accounts.
export const GET = withErrorHandler(async (req: Request) => {
    const caller = await requireRole(['product-admin', 'super-admin', 'event-admin']);
    if (!caller) return errorResponse('Unauthorized', 403);

    const { searchParams } = new URL(req.url);
    const roleFilter = searchParams.get('role');
    const festId = searchParams.get('festId');
    const orgParam = searchParams.get('organizationId');

    await dbConnect();

    const filter: Record<string, unknown> = {};
    if (caller.role === 'event-admin') {
        filter.role = 'judge';
        filter.festIds = { $in: caller.festIds || [] };

        // Narrow to one specific fest, but only one the caller actually has access to.
        if (festId && isValidObjectId(festId) && (caller.festIds || []).includes(festId)) {
            filter.festIds = festId;
        }
    } else {
        if (caller.role === 'super-admin') {
            filter.organizationId = caller.organizationId;
        } else if (orgParam && isValidObjectId(orgParam)) {
            filter.organizationId = orgParam;
        }
        if (roleFilter) filter.role = roleFilter;
        if (festId && isValidObjectId(festId)) filter.festIds = festId;
    }

    const users = await User.find(filter).select('-passwordHash').sort({ createdAt: -1 }).lean();

    return successResponse(users.map(u => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        organizationId: u.organizationId?.toString(),
        festIds: (u.festIds || []).map((f: unknown) => String(f)),
        isActive: u.isActive,
    })));
});

// POST /api/users - create an Event Admin, Judge, or (rarely) another Product Admin.
// Super Admin accounts are never created here — they're created exclusively through
// /signup + the organization-onboarding flow, since each one owns a brand new
// organization. Exception: if no Product Admin exists yet at all, a request carrying
// the correct BOOTSTRAP_SECRET may create the very first one (one-time platform
// setup — there is no login yet at that point).
export const POST = withErrorHandler(async (req: Request) => {
    const body = await req.json();
    const validated = createUserSchema.parse(body);

    if (validated.role === 'super-admin') {
        return errorResponse('Super Admin accounts are created by signing up at /signup, not here', 400);
    }

    await dbConnect();

    let festIds = validated.festIds;
    let organizationId: string | undefined;

    if (validated.role === 'product-admin') {
        const productAdminExists = await User.exists({ role: 'product-admin' });
        if (!productAdminExists) {
            const bootstrapSecret = process.env.BOOTSTRAP_SECRET;
            if (!bootstrapSecret || body.bootstrapSecret !== bootstrapSecret) {
                return errorResponse('Bootstrap secret required to create the first Product Admin', 403);
            }
        } else {
            const caller = await requireRole(['product-admin']);
            if (!caller) return errorResponse('Unauthorized', 403);
        }
        // product-admin has no organization
    } else {
        // event-admin or judge
        const caller = await requireRole(['product-admin', 'super-admin', 'event-admin']);
        if (!caller) return errorResponse('Unauthorized', 403);

        if (caller.role === 'event-admin' && validated.role !== 'judge') {
            return errorResponse('Event Admins may only create Judge accounts', 403);
        }

        if (caller.role === 'product-admin') {
            if (!validated.organizationId || !isValidObjectId(validated.organizationId)) {
                return errorResponse('A valid organizationId is required', 400);
            }
            organizationId = validated.organizationId;
        } else {
            if (!caller.organizationId) return errorResponse('Your account has no organization', 400);
            organizationId = caller.organizationId;
        }

        if (caller.role === 'event-admin') {
            const requested = validated.festIds || [];
            const allowed = requested.filter(f => (caller.festIds || []).includes(f));
            if (allowed.length === 0) {
                return errorResponse('Judge must be scoped to at least one of your fests', 400);
            }
            festIds = allowed;
        }
    }

    if (['product-admin', 'event-admin', 'judge'].includes(validated.role)) {
        if (!validated.email || !validated.password) {
            return errorResponse('Email and password are required for this role', 400);
        }
    } else if (validated.role === 'student' && !validated.phone) {
        return errorResponse('Phone is required for student accounts', 400);
    }

    const passwordHash = validated.password ? await bcrypt.hash(validated.password, 10) : undefined;

    const user = await User.create({
        name: validated.name,
        email: validated.email?.toLowerCase().trim(),
        phone: validated.phone,
        passwordHash,
        role: validated.role,
        organizationId,
        festIds,
    });

    return successResponse({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
    }, 201);
});
