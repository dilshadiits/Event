import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

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
// Wrap async handler with error handling
export function withErrorHandler(
    handler: (req: any, ...args: any[]) => Promise<NextResponse>
) {
    return async (req: any, ...args: any[]): Promise<NextResponse> => {
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

// Get client IP from request
export function getClientIP(req: Request): string {
    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return 'unknown';
}
