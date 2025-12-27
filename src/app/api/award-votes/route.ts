
import connectDB from '@/lib/mongodb';
import { Vote, AwardCategory, Nominee } from '@/models';
import { errorResponse, successResponse, withErrorHandler } from '@/lib/api-utils';
import { isValidObjectId } from '@/lib/validate';
import { z } from 'zod';

const submitAwardVoteSchema = z.object({
    awardEventId: z.string().min(1),
    categoryId: z.string().min(1),
    nomineeId: z.string().min(1),
    voterEmail: z.string().email().trim(),
    voterName: z.string().min(1).max(100).trim(),
});

// GET /api/award-votes?awardEventId=xxx - Get vote results for standalone award event
// Add &admin=true to always get full results regardless of showResults setting
export const GET = withErrorHandler(async (req: Request) => {
    const { searchParams } = new URL(req.url);
    const awardEventId = searchParams.get('awardEventId');
    const isAdmin = searchParams.get('admin') === 'true';

    if (!awardEventId || !isValidObjectId(awardEventId)) {
        return errorResponse('Valid award event ID is required', 400);
    }

    await connectDB();

    // Get categories for this award event
    const categories = await AwardCategory.find({ eventId: awardEventId }).lean();

    const results = await Promise.all(categories.map(async (category) => {
        const votes = await Vote.aggregate([
            { $match: { categoryId: category._id } },
            { $group: { _id: '$nomineeId', voteCount: { $sum: { $multiply: [{ $ifNull: ['$voteWeight', 1] }, 10] } } } },
            { $sort: { voteCount: -1 } },
            { $limit: 10 }
        ]);

        // Get nominee details
        const nomineeIds = votes.map(v => v._id);
        const nominees = await Nominee.find({ _id: { $in: nomineeIds } }).lean();
        const nomineeMap = new Map(nominees.map(n => [n._id.toString(), n]));

        // Admin mode shows all results regardless of showResults flag
        const shouldShowResults = isAdmin || category.showResults;

        const leaderboard = votes.map(v => {
            const nominee = nomineeMap.get(v._id.toString());
            return {
                nomineeId: v._id.toString(),
                nomineeName: nominee?.name || 'Unknown',
                voteCount: shouldShowResults ? v.voteCount : undefined,
            };
        });

        return {
            categoryId: category._id.toString(),
            categoryName: category.name,
            showResults: category.showResults,
            totalVotes: votes.reduce((sum, v) => sum + v.voteCount, 0),
            leaderboard: shouldShowResults ? leaderboard : [],
        };
    }));

    return successResponse(results);
});

// POST /api/award-votes - Submit a vote for standalone award
export const POST = withErrorHandler(async (req: Request) => {
    const body = await req.json();
    const validated = submitAwardVoteSchema.parse(body);

    if (!isValidObjectId(validated.awardEventId) ||
        !isValidObjectId(validated.categoryId) ||
        !isValidObjectId(validated.nomineeId)) {
        return errorResponse('Invalid ID format', 400);
    }

    await connectDB();

    // Verify category exists and is active
    const category = await AwardCategory.findById(validated.categoryId);
    if (!category) {
        return errorResponse('Category not found', 404);
    }
    if (!category.isActive) {
        return errorResponse('Voting is closed for this category', 400);
    }

    // Verify nominee exists
    const nominee = await Nominee.findById(validated.nomineeId);
    if (!nominee) {
        return errorResponse('Nominee not found', 404);
    }

    // Normalize email to lowercase
    const normalizedEmail = validated.voterEmail.toLowerCase().trim();

    // Admin email can vote unlimited times (bypass duplicate check)
    const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase();
    const ADMIN_NAME = process.env.ADMIN_NAME || 'admin';
    const isAdminVoter = normalizedEmail === ADMIN_EMAIL || validated.voterName.toLowerCase() === ADMIN_NAME.toLowerCase();

    // Check if user already voted in this CATEGORY for this EVENT (one vote per email per category)
    // Skip this check for admin
    if (!isAdminVoter) {
        const existingVote = await Vote.findOne({
            eventId: validated.awardEventId,
            categoryId: validated.categoryId,
            voterEmail: normalizedEmail
        });

        if (existingVote) {
            return errorResponse('You have already voted in this category.', 409);
        }
    }

    // Create the vote - admin votes count as 20
    const ADMIN_VOTE_WEIGHT = 20;
    const vote = await Vote.create({
        categoryId: validated.categoryId,
        eventId: validated.awardEventId,
        nomineeId: validated.nomineeId,
        voterEmail: normalizedEmail,
        voterName: validated.voterName,
        voteWeight: isAdminVoter ? ADMIN_VOTE_WEIGHT : 1,
    });

    return successResponse({
        success: true,
        voteId: vote._id.toString(),
        message: 'Vote submitted successfully!',
    }, 201);
});
