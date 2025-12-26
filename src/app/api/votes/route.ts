import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Vote, AwardCategory, Attendee } from '@/models';
import { errorResponse, successResponse, withErrorHandler } from '@/lib/api-utils';
import { submitVoteSchema, isValidObjectId } from '@/lib/validate';

// GET /api/votes?eventId=xxx - Get vote results for all categories in an event
export const GET = withErrorHandler(async (req: NextRequest) => {
    const eventId = req.nextUrl.searchParams.get('eventId');
    const categoryId = req.nextUrl.searchParams.get('categoryId');

    if (!eventId || !isValidObjectId(eventId)) {
        return errorResponse('Valid event ID is required', 400);
    }

    await connectDB();

    // Get all categories for the event
    const categoryFilter: Record<string, unknown> = { eventId };
    if (categoryId && isValidObjectId(categoryId)) {
        categoryFilter._id = categoryId;
    }

    const categories = await AwardCategory.find(categoryFilter).lean();

    // Get vote counts aggregated by category and nominee
    const results = await Promise.all(categories.map(async (category) => {
        const votes = await Vote.aggregate([
            { $match: { categoryId: category._id } },
            { $group: { _id: '$nomineeId', voteCount: { $sum: { $ifNull: ['$voteWeight', 1] } } } },
            { $sort: { voteCount: -1 } },
            { $limit: 10 }
        ]);

        // Get nominee details
        const nomineeIds = votes.map(v => v._id);
        const nominees = await Attendee.find({ _id: { $in: nomineeIds } }).lean();
        const nomineeMap = new Map(nominees.map(n => [n._id.toString(), n]));

        const leaderboard = votes.map(v => {
            const nominee = nomineeMap.get(v._id.toString());
            return {
                nomineeId: v._id.toString(),
                nomineeName: nominee?.name || 'Unknown',
                nomineeCategory: nominee?.category || '',
                voteCount: category.showResults ? v.voteCount : undefined,
            };
        });

        return {
            categoryId: category._id.toString(),
            categoryName: category.name,
            description: category.description || '',
            isActive: category.isActive,
            showResults: category.showResults,
            totalVotes: votes.reduce((sum, v) => sum + v.voteCount, 0),
            leaderboard: category.showResults ? leaderboard : [],
        };
    }));

    return successResponse(results);
});

// POST /api/votes - Submit a vote
export const POST = withErrorHandler(async (req: NextRequest) => {
    const body = await req.json();
    const validated = submitVoteSchema.parse(body);

    // Validate all IDs
    if (!isValidObjectId(validated.eventId) ||
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

    // Verify nominee exists and belongs to event
    const nominee = await Attendee.findOne({
        _id: validated.nomineeId,
        eventId: validated.eventId
    });
    if (!nominee) {
        return errorResponse('Nominee not found', 404);
    }

    // Check if user already voted in this category
    const existingVote = await Vote.findOne({
        categoryId: validated.categoryId,
        voterPhone: validated.voterPhone
    });

    if (existingVote) {
        return errorResponse('You have already voted in this category', 409);
    }

    // Create the vote
    const vote = await Vote.create({
        categoryId: validated.categoryId,
        eventId: validated.eventId,
        nomineeId: validated.nomineeId,
        voterPhone: validated.voterPhone,
    });

    return successResponse({
        success: true,
        voteId: vote._id.toString(),
        message: 'Vote submitted successfully!',
    }, 201);
});
