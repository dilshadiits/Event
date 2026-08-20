import { z } from 'zod';

// Event validation
export const createEventSchema = z.object({
    name: z.string().min(1, 'Event name is required').max(200, 'Event name too long').trim(),
    date: z.string().min(1, 'Date is required'),
    entryPassImage: z.string().optional(),
    formConfig: z.array(z.object({
        id: z.string(),
        label: z.string(),
        type: z.enum(['text', 'select', 'checkbox', 'email', 'phone', 'number']),
        required: z.boolean().optional(),
        options: z.array(z.string()).optional(),
        enabled: z.boolean().optional(),
        isSystem: z.boolean().optional()
    })).optional(),
});

// Attendee validation
export const createAttendeeSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name too long').trim(),
    email: z.string().email('Invalid email format').optional().or(z.literal('')).nullable(),
    phone: z.string().min(10, 'Phone must be at least 10 digits').max(15, 'Phone too long').trim().optional().or(z.literal('')).nullable(),
    additionalName: z.string().max(100).optional().nullable(),
    seatingNumber: z.string().max(50).optional().nullable(),
    instagram: z.string().max(50).optional().nullable().transform(v => v || undefined),
    youtube: z.string().max(100).optional().nullable().transform(v => v || undefined),
    category: z.string().max(50).optional().nullable().transform(v => v || undefined),
    guest_names: z.string().max(500).optional().nullable().transform(v => v || undefined),
    meal_preference: z.enum(['veg', 'non-veg']).optional().nullable().transform(v => v || 'veg'),
    eventId: z.string().min(1, 'Event ID is required'),
    inviteCode: z.string().optional().nullable(),
    customResponses: z.record(z.string(), z.string()).optional(), // Map<FieldID, ResponseString>
});

// Update attendee validation
export const updateAttendeeSchema = z.object({
    id: z.string().min(1, 'Attendee ID is required'),
    name: z.string().min(1, 'Name is required').max(100, 'Name too long').trim().optional(),
    email: z.string().email('Invalid email format').optional().or(z.literal('')).nullable(),
    phone: z.string().min(10, 'Phone must be at least 10 digits').max(15, 'Phone too long').trim().optional().or(z.literal('')).nullable(),
    additionalName: z.string().max(100).optional().nullable(),
    seatingNumber: z.string().max(50).optional().nullable(),
    instagram: z.string().max(50).optional().nullable(),
    youtube: z.string().max(100).optional().nullable(),
    category: z.string().max(50).optional().nullable(),
    guest_names: z.string().max(500).optional().nullable(),
    meal_preference: z.enum(['veg', 'non-veg']).optional().nullable(),
    customResponses: z.record(z.string(), z.string()).optional(),
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

// User validation (competitions module: super-admin/event-admin/judge/student accounts)
export const createUserSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name too long').trim(),
    email: z.string().email('Invalid email format').optional(),
    phone: z.string().min(10, 'Phone must be at least 10 digits').max(15, 'Phone too long').trim().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters').optional(),
    role: z.enum(['product-admin', 'super-admin', 'event-admin', 'judge', 'student']),
    organizationId: z.string().optional(), // required only when a Product Admin creates on behalf of an org
    festIds: z.array(z.string()).optional(),
});

export const updateUserSchema = z.object({
    id: z.string().min(1, 'User ID is required'),
    name: z.string().min(1).max(100).optional(),
    role: z.enum(['product-admin', 'super-admin', 'event-admin', 'judge', 'student']).optional(),
    festIds: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
});

// Self-service signup — creates a Super Admin account with no organization yet.
export const signupSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name too long').trim(),
    email: z.string().email('Invalid email format').trim(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

// Organization creation — the "name your organization" onboarding step.
export const createOrganizationSchema = z.object({
    name: z.string().min(1, 'Organization name is required').max(200, 'Organization name too long').trim(),
});

// Fest validation
export const createFestSchema = z.object({
    name: z.string().min(1, 'Fest name is required').max(200, 'Fest name too long').trim(),
    description: z.string().max(1000).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    eventId: z.string().optional(),
});

export const updateFestSchema = z.object({
    id: z.string().min(1, 'Fest ID is required'),
    name: z.string().min(1).max(200).trim().optional(),
    description: z.string().max(1000).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    pointsScheme: z.record(z.string(), z.number()).optional(),
    teamPointsMultiplier: z.number().min(1).max(10).optional(),
    resultsArePublic: z.boolean().optional(),
    certificateTemplate: z.string().optional(),
    posterTemplate: z.string().optional(),
    isActive: z.boolean().optional(),
});

// Team validation
export const createTeamSchema = z.object({
    festId: z.string().min(1, 'Fest ID is required'),
    name: z.string().min(1, 'Team name is required').max(100, 'Team name too long').trim(),
    code: z.string().max(20).optional(),
    color: z.string().max(20).optional(),
    logoUrl: z.string().optional(),
});

export const updateTeamSchema = z.object({
    id: z.string().min(1, 'Team ID is required'),
    name: z.string().min(1).max(100).trim().optional(),
    code: z.string().max(20).optional(),
    color: z.string().max(20).optional(),
    logoUrl: z.string().optional(),
});

// Participant validation
export const createParticipantSchema = z.object({
    festId: z.string().min(1, 'Fest ID is required'),
    teamId: z.string().optional().nullable(),
    name: z.string().min(1, 'Name is required').max(100, 'Name too long').trim(),
    email: z.string().email('Invalid email format').optional().or(z.literal('')),
    phone: z.string().min(10, 'Phone must be at least 10 digits').max(15, 'Phone too long').trim().optional().or(z.literal('')),
});

export const updateParticipantSchema = z.object({
    id: z.string().min(1, 'Participant ID is required'),
    teamId: z.string().optional().nullable(),
    name: z.string().min(1).max(100).trim().optional(),
    email: z.string().email('Invalid email format').optional().or(z.literal('')),
    phone: z.string().min(10).max(15).trim().optional().or(z.literal('')),
});

// Program validation
const criterionSchema = z.object({
    id: z.string().min(1),
    label: z.string().min(1, 'Criterion label is required').max(100),
    maxScore: z.number().min(1).max(1000).default(10),
    weight: z.number().min(0.1).max(10).default(1),
});

export const createProgramSchema = z.object({
    festId: z.string().min(1, 'Fest ID is required'),
    name: z.string().min(1, 'Program name is required').max(150, 'Program name too long').trim(),
    code: z.string().max(30).optional(),
    type: z.enum(['solo', 'team']),
    mode: z.enum(['stage', 'off-stage']),
    category: z.string().max(100).optional(),
    scheduledAt: z.string().optional(),
    venue: z.string().max(150).optional(),
    criteria: z.array(criterionSchema).min(1, 'At least one judging criterion is required'),
});

export const updateProgramSchema = z.object({
    id: z.string().min(1, 'Program ID is required'),
    name: z.string().min(1).max(150).trim().optional(),
    code: z.string().max(30).optional(),
    category: z.string().max(100).optional(),
    scheduledAt: z.string().optional(),
    venue: z.string().max(150).optional(),
    status: z.enum(['scheduled', 'chest-numbers-shuffled', 'in-progress', 'judging-closed', 'results-published']).optional(),
});

export const updateProgramCriteriaSchema = z.object({
    id: z.string().min(1, 'Program ID is required'),
    criteria: z.array(criterionSchema).min(1, 'At least one judging criterion is required'),
});

export const updateProgramPanelSchema = z.object({
    id: z.string().min(1, 'Program ID is required'),
    judgePanel: z.array(z.string()),
});

// Program entries (chest-number shuffle) validation
export const addProgramEntriesSchema = z.object({
    participantIds: z.array(z.string()).optional(),
    teamIds: z.array(z.string()).optional(),
}).refine(d => (d.participantIds?.length || 0) + (d.teamIds?.length || 0) > 0, {
    message: 'At least one participant or team is required',
});

export const shuffleProgramSchema = z.object({
    force: z.boolean().optional(),
});

// Scoring validation. Bounds against each criterion's maxScore are data-dependent
// (need the program's criteria loaded), so that check happens in the route handler.
export const submitScoreSchema = z.object({
    entryId: z.string().min(1, 'Entry ID is required'),
    criteriaScores: z.record(z.string(), z.number().min(0)),
});

// Vote validation
export const submitVoteSchema = z.object({
    categoryId: z.string().min(1, 'Category ID is required'),
    eventId: z.string().min(1, 'Event ID is required'),
    nomineeId: z.string().min(1, 'Nominee ID is required'),
    voterPhone: z.string().min(10, 'Phone must be at least 10 digits').max(15, 'Phone too long').trim(),
});
