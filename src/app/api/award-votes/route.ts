import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Vote, AwardCategory, Nominee } from '@/models';
import { errorResponse, successResponse, withErrorHandler } from '@/lib/api-utils';
import { isValidObjectId } from '@/lib/validate';
import { z } from 'zod';

const submitAwardVoteSchema = z.object({
    awardEventId: z.string().min(1),
    categoryId: z.string().min(1),
    nomineeId: z.string().min(1),
    voterPhone: z.string().min(10).max(15).trim(),
    voterName: z.string().min(1).max(100).trim(),
});

// GET /api/award-votes?awardEventId=xxx - Get vote results for standalone award event
// Add &admin=true to always get full results regardless of showResults setting
export const GET = withErrorHandler(async (req: NextRequest) => {
    const awardEventId = req.nextUrl.searchParams.get('awardEventId');
    const isAdmin = req.nextUrl.searchParams.get('admin') === 'true';

    if (!awardEventId || !isValidObjectId(awardEventId)) {
        return errorResponse('Valid award event ID is required', 400);
    }

    await connectDB();

    // Get categories for this award event
    const categories = await AwardCategory.find({ eventId: awardEventId }).lean();

    const results = await Promise.all(categories.map(async (category) => {
        const votes = await Vote.aggregate([
            { $match: { categoryId: category._id } },
            { $group: { _id: '$nomineeId', voteCount: { $sum: 1 } } },
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
export const POST = withErrorHandler(async (req: NextRequest) => {
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

    // Check if user already voted in this EVENT (only ONE vote per phone per event)
    const existingVote = await Vote.findOne({
        eventId: validated.awardEventId,
        voterPhone: validated.voterPhone
    });

    if (existingVote) {
        return errorResponse('You have already voted. Only one vote per phone number is allowed.', 409);
    }

    // Create the vote
    const vote = await Vote.create({
        categoryId: validated.categoryId,
        eventId: validated.awardEventId, // Using eventId field for awardEventId
        nomineeId: validated.nomineeId,
        voterPhone: validated.voterPhone,
        voterName: validated.voterName,
    });

    return successResponse({
        success: true,
        voteId: vote._id.toString(),
        message: 'Vote submitted successfully!',
    }, 201);
});
