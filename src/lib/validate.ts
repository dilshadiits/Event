import { z } from 'zod';

// Event validation
export const createEventSchema = z.object({
    name: z.string().min(1, 'Event name is required').max(200, 'Event name too long').trim(),
    date: z.string().min(1, 'Date is required'),
});

// Attendee validation
export const createAttendeeSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name too long').trim(),
    email: z.string().email('Invalid email format').optional().or(z.literal('')),
    phone: z.string().min(10, 'Phone must be at least 10 digits').max(15, 'Phone too long').trim(),
    instagram: z.string().max(50).optional(),
    youtube: z.string().max(100).optional(),
    category: z.string().max(50).optional(),
    guest_names: z.string().max(500).optional(),
    meal_preference: z.enum(['veg', 'non-veg']).optional(),
    eventId: z.string().min(1, 'Event ID is required'),
    inviteCode: z.string().optional(),
});

// Scan validation
export const scanDataSchema = z.object({
    scanData: z.string().min(1, 'Scan data is required'),
    eventId: z.string().optional(),
});

// Invite code validation
export const createInviteSchema = z.object({
    eventId: z.string().min(1, 'Event ID is required'),
});

// Validate ObjectId format
export function isValidObjectId(id: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test(id);
}

// Sanitize string input (remove potentially dangerous characters)
export function sanitizeString(input: string): string {
    return input
        .replace(/[<>]/g, '') // Remove angle brackets
        .trim();
}

// Award category validation
export const createCategorySchema = z.object({
    eventId: z.string().min(1, 'Event ID is required'),
    name: z.string().min(1, 'Category name is required').max(100, 'Category name too long').trim(),
    description: z.string().max(500).optional(),
});

export const updateCategorySchema = z.object({
    id: z.string().min(1, 'Category ID is required'),
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    isActive: z.boolean().optional(),
    showResults: z.boolean().optional(),
});

// Vote validation
export const submitVoteSchema = z.object({
    categoryId: z.string().min(1, 'Category ID is required'),
    eventId: z.string().min(1, 'Event ID is required'),
    nomineeId: z.string().min(1, 'Nominee ID is required'),
    voterPhone: z.string().min(10, 'Phone must be at least 10 digits').max(15, 'Phone too long').trim(),
});
