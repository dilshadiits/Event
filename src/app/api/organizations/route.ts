import dbConnect from '@/lib/mongodb';
import { Organization, Fest, User } from '@/models';
import { errorResponse, successResponse, withErrorHandler, requireRole } from '@/lib/api-utils';
import { createOrganizationSchema, sanitizeString } from '@/lib/validate';

function slugify(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'org';
}

// GET /api/organizations - Product Admin only. Lists every organization with a
// quick fest/member count, for the /product-admin console.
export const GET = withErrorHandler(async () => {
    const caller = await requireRole(['product-admin']);
    if (!caller) return errorResponse('Unauthorized', 403);

    await dbConnect();
    const orgs = await Organization.find().sort({ createdAt: -1 }).lean();

    const results = await Promise.all(orgs.map(async (org) => {
        const [festCount, memberCount] = await Promise.all([
            Fest.countDocuments({ organizationId: org._id }),
            User.countDocuments({ organizationId: org._id, isActive: true }),
        ]);
        return {
            id: org._id.toString(),
            name: org.name,
            slug: org.slug,
            isActive: org.isActive,
            createdAt: org.createdAt,
            festCount,
            memberCount,
        };
    }));

    return successResponse(results);
});

// POST /api/organizations - the onboarding step. Only for a signed-in Super Admin who
// doesn't have an organization yet ("one organization per login" — this is the one
// moment that's allowed to change). Not reachable by anyone who already has one.
//
// The "doesn't have one yet" check is done against the database with an atomic
// conditional update, not the caller's session — the session's organizationId is a
// JWT claim that only refreshes on sign-in or an explicit client-side session
// update(), so trusting it here would let two requests sent before that refresh both
// succeed and silently reassign the account to whichever ran last.
export const POST = withErrorHandler(async (req: Request) => {
    const caller = await requireRole(['super-admin']);
    if (!caller) return errorResponse('Unauthorized', 403);

    const body = await req.json();
    const validated = createOrganizationSchema.parse(body);

    await dbConnect();

    const baseSlug = slugify(validated.name);
    let slug = baseSlug;
    let suffix = 1;
    while (await Organization.exists({ slug })) {
        suffix += 1;
        slug = `${baseSlug}-${suffix}`;
    }

    const org = await Organization.create({
        name: sanitizeString(validated.name),
        slug,
        createdBy: caller.id,
    });

    const claimed = await User.findOneAndUpdate(
        { _id: caller.id, organizationId: { $exists: false } },
        { organizationId: org._id }
    );

    if (!claimed) {
        // Lost the race, or the account already had an org — undo the create.
        await Organization.findByIdAndDelete(org._id);
        return errorResponse('Your account already belongs to an organization', 400);
    }

    return successResponse({ id: org._id.toString(), name: org.name, slug: org.slug }, 201);
});
