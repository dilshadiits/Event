import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { OTP } from '@/models';
import { errorResponse, successResponse, withErrorHandler } from '@/lib/api-utils';
import { z } from 'zod';

const sendOTPSchema = z.object({
    phone: z.string().min(10).max(15).trim(),
});

const verifyOTPSchema = z.object({
    phone: z.string().min(10).max(15).trim(),
    code: z.string().length(6),
});

const checkAdminSchema = z.object({
    phone: z.string().min(10).max(15).trim(),
});

// Generate 6-digit OTP
function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Normalize phone (last 10 digits)
function normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '').slice(-10);
}

// Check if phone is admin
function isAdminPhone(phone: string): boolean {
    const ADMIN_PHONE = (process.env.ADMIN_PHONE || '7736909993').replace(/\D/g, '').slice(-10);
    return phone === ADMIN_PHONE;
}

// GET /api/otp?phone=xxx - Check if phone is admin (bypass OTP)
export const GET = withErrorHandler(async (req: NextRequest) => {
    const phoneParam = req.nextUrl.searchParams.get('phone');
    if (!phoneParam) {
        return errorResponse('Phone number required', 400);
    }

    const validated = checkAdminSchema.parse({ phone: phoneParam });
    const phone = normalizePhone(validated.phone);

    const isAdmin = isAdminPhone(phone);

    return successResponse({
        isAdmin,
        message: isAdmin ? 'Admin phone - OTP not required' : 'OTP required',
    });
});

// POST /api/otp - Send OTP to phone number
export const POST = withErrorHandler(async (req: NextRequest) => {
    const body = await req.json();
    const validated = sendOTPSchema.parse(body);
    const phone = normalizePhone(validated.phone);

    if (phone.length < 10) {
        return errorResponse('Invalid phone number', 400);
    }

    // Admin phone doesn't need OTP
    if (isAdminPhone(phone)) {
        return successResponse({
            success: true,
            isAdmin: true,
            message: 'Admin phone verified automatically!',
        });
    }

    await connectDB();

    // Check for existing recent OTP (rate limiting - 1 per minute)
    const recentOTP = await OTP.findOne({
        phone,
        createdAt: { $gte: new Date(Date.now() - 60 * 1000) }
    });

    if (recentOTP) {
        return errorResponse('Please wait 1 minute before requesting a new OTP', 429);
    }

    // Generate new OTP
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // Expires in 5 minutes

    // Delete old OTPs for this phone
    await OTP.deleteMany({ phone });

    // Save new OTP
    await OTP.create({ phone, code, expiresAt });

    // Send SMS via Fast2SMS
    const apiKey = process.env.FAST2SMS_API_KEY;
    if (!apiKey) {
        return errorResponse('SMS service not configured', 500);
    }

    try {
        // Using Quick SMS route (route 'q') - works without website verification
        const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
            method: 'POST',
            headers: {
                'authorization': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                route: 'q',
                message: `Your voting verification code is: ${code}. Valid for 5 minutes. Do not share this code.`,
                flash: 0,
                numbers: phone,
            }),
        });

        const result = await response.json();

        if (!result.return) {
            console.error('Fast2SMS error:', result);
            return errorResponse('Failed to send OTP. Please try again.', 500);
        }

        return successResponse({
            success: true,
            isAdmin: false,
            message: 'OTP sent successfully!',
            expiresIn: 300, // 5 minutes in seconds
        });
    } catch (error) {
        console.error('SMS sending error:', error);
        return errorResponse('Failed to send SMS. Please try again.', 500);
    }
});

// PUT /api/otp - Verify OTP
export const PUT = withErrorHandler(async (req: NextRequest) => {
    const body = await req.json();
    const validated = verifyOTPSchema.parse(body);
    const phone = normalizePhone(validated.phone);

    // Admin phone is always verified
    if (isAdminPhone(phone)) {
        return successResponse({
            success: true,
            message: 'Admin phone verified!',
            verified: true,
        });
    }

    await connectDB();

    // Find valid OTP
    const otp = await OTP.findOne({
        phone,
        code: validated.code,
        expiresAt: { $gt: new Date() },
    });

    if (!otp) {
        return errorResponse('Invalid or expired OTP', 400);
    }

    // Mark as verified
    otp.verified = true;
    await otp.save();

    return successResponse({
        success: true,
        message: 'Phone verified successfully!',
        verified: true,
    });
});
