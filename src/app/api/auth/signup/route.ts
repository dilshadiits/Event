import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models';
import { errorResponse, successResponse, withErrorHandler } from '@/lib/api-utils';
import { signupSchema } from '@/lib/validate';

// POST /api/auth/signup - self-service account creation. Creates a Super Admin with
// no organization yet — /onboarding/organization is where they name their org and
// this account gets tied to it. This is the *only* way a Super Admin account comes
// into existence; there is no admin-side "create a super admin" action.
export const POST = withErrorHandler(async (req: Request) => {
    const body = await req.json();
    const validated = signupSchema.parse(body);

    await dbConnect();

    const email = validated.email.toLowerCase().trim();
    const existing = await User.findOne({ email });
    if (existing) {
        return errorResponse('An account with this email already exists', 409);
    }

    const passwordHash = await bcrypt.hash(validated.password, 10);
    const user = await User.create({
        name: validated.name,
        email,
        passwordHash,
        role: 'super-admin',
    });

    return successResponse({ id: user._id.toString(), email: user.email }, 201);
});
