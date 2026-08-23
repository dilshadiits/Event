import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import { Fest } from '@/models';

// Standardized error response
export function errorResponse(message: string, status: number = 500) {
    return NextResponse.json({ error: message }, { status });
}

// Standardized success response
export function successResponse<T>(data: T, status: number = 200) {
    return NextResponse.json(data, { status });
}

// Handle Zod validation errors
export function handleValidationError(error: ZodError<unknown>) {
    const messages = error.issues.map((e) => e.message).join(', ');
    return errorResponse(messages, 400);
}

// Wrap async handler with error handling
export function withErrorHandler(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: (req: Request, ...args: any[]) => Promise<NextResponse>
) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return async (req: Request, ...args: any[]): Promise<NextResponse> => {
        try {
            return await handler(req, ...args);
        } catch (error) {
            console.error('[API Error]', error);

            if (error instanceof ZodError) {
                return handleValidationError(error);
            }

            if (error instanceof Error) {
                // Don't expose internal error messages in production
                const message = process.env.NODE_ENV === 'development'
                    ? error.message
                    : 'Internal server error';
                return errorResponse(message, 500);
            }

            return errorResponse('An unexpected error occurred', 500);
        }
    };
}

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
    identifier: string,
    maxRequests: number = 10,
    windowMs: number = 60000
): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const record = rateLimitMap.get(identifier);

    // Clean up old entries periodically
    if (rateLimitMap.size > 10000) {
        for (const [key, value] of rateLimitMap.entries()) {
            if (value.resetTime < now) {
                rateLimitMap.delete(key);
            }
        }
    }

    if (!record || record.resetTime < now) {
        rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
        return { allowed: true, remaining: maxRequests - 1 };
    }

    if (record.count >= maxRequests) {
        return { allowed: false, remaining: 0 };
    }

    record.count++;
    return { allowed: true, remaining: maxRequests - record.count };
}

// Require the current session to have one of the given roles.
// Returns the session's user on success, or null if unauthenticated/unauthorized
// (caller should respond with errorResponse('Unauthorized', 401/403) in that case).
export async function requireRole(roles: string[]) {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    if (!role || !roles.includes(role)) return null;
    return session.user;
}

// Require the current session to be a product-admin (full cross-org access), or a
// super-admin/event-admin belonging to the given organization. For routes that
// operate above any single fest - listing fests, org settings, managing accounts.
export async function requireOrgAccess(organizationId: string) {
    const user = await requireRole(['product-admin', 'super-admin', 'event-admin']);
    if (!user) return null;
    if (user.role === 'product-admin') return user;
    if (user.organizationId === organizationId) return user;
    return null;
}

// Require the current session to be a product-admin, or a super-admin/event-admin
// whose organization owns the given fest (event-admin additionally needs the fest in
// their own festIds). Loads the fest to verify organization ownership - a super-admin
// is no longer implicitly omnipotent across every fest in the database, only their
// own organization's.
export async function requireOrgFestAccess(festId: string) {
    const user = await requireRole(['product-admin', 'super-admin', 'event-admin']);
    if (!user) return null;
    if (user.role === 'product-admin') return user;

    await dbConnect();
    const fest = await Fest.findById(festId).select('organizationId').lean();
    if (!fest || String(fest.organizationId) !== user.organizationId) return null;

    if (user.role === 'super-admin') return user;
    if (user.festIds?.includes(festId)) return user; // event-admin
    return null;
}

// Require the current session to be a super-admin, or an event-admin scoped to the
// given fest (via User.festIds). Returns the session's user on success, or null.
export async function requireFestAccess(festId: string) {
    const user = await requireRole(['super-admin', 'event-admin']);
    if (!user) return null;
    if (user.role === 'super-admin') return user;
    if (user.festIds?.includes(festId)) return user;
    return null;
}

// Get client IP from request
export function getClientIP(req: Request): string {
    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return 'unknown';
}
