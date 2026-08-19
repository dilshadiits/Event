import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models';
import { errorResponse, successResponse, withErrorHandler, requireRole } from '@/lib/api-utils';
import { createUserSchema, isValidObjectId } from '@/lib/validate';

// GET /api/users?role=&festId= - list accounts.
// Super Admin sees everyone. Event Admin only sees judges scoped to their own fests
// (needed to populate judge-panel pickers) — never other admins' accounts.
export const GET = withErrorHandler(async (req: Request) => {
    const caller = await requireRole(['super-admin', 'event-admin']);
    if (!caller) return errorResponse('Unauthorized', 403);

    const { searchParams } = new URL(req.url);
    const roleFilter = searchParams.get('role');
    const festId = searchParams.get('festId');

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
        festIds: (u.festIds || []).map((f: unknown) => String(f)),
        isActive: u.isActive,
    })));
});

// POST /api/users - create a new user.
// Super Admin can create any role. Event Admin can only create Judges, scoped to
// fests they themselves have access to. Exception: if no Super Admin exists yet,
// a request carrying the correct BOOTSTRAP_SECRET may create the first one
// (one-time setup — there is no login yet at that point).
export const POST = withErrorHandler(async (req: Request) => {
    const body = await req.json();
    const validated = createUserSchema.parse(body);

    await dbConnect();

    const superAdminExists = await User.exists({ role: 'super-admin' });

    let festIds = validated.festIds;

    if (!superAdminExists && validated.role === 'super-admin') {
        const bootstrapSecret = process.env.BOOTSTRAP_SECRET;
        if (!bootstrapSecret || body.bootstrapSecret !== bootstrapSecret) {
            return errorResponse('Bootstrap secret required to create the first Super Admin', 403);
        }
    } else {
        const caller = await requireRole(['super-admin', 'event-admin']);
        if (!caller) return errorResponse('Unauthorized', 403);

        if (caller.role === 'event-admin') {
            if (validated.role !== 'judge') {
                return errorResponse('Event Admins may only create Judge accounts', 403);
            }
            const requested = validated.festIds || [];
            const allowed = requested.filter(f => (caller.festIds || []).includes(f));
            if (allowed.length === 0) {
                return errorResponse('Judge must be scoped to at least one of your fests', 400);
            }
            festIds = allowed;
        }
    }

    if (['super-admin', 'event-admin', 'judge'].includes(validated.role)) {
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
        festIds,
    });

    return successResponse({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
    }, 201);
});
