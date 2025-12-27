import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { AwardEvent } from '@/models';
import { isValidObjectId } from '@/lib/validate';

// GET /api/awards/[id] - Get single award event by ID
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id || !isValidObjectId(id)) {
            return NextResponse.json({ error: 'Valid award event ID is required' }, { status: 400 });
        }

        await connectDB();

        const event = await AwardEvent.findById(id).lean();

        if (!event) {
            return NextResponse.json({ error: 'Award event not found' }, { status: 404 });
        }

        return NextResponse.json({
            id: event._id.toString(),
            name: event.name,
            description: event.description || '',
            headerImage: event.headerImage || '',
            sponsorImages: event.sponsorImages || [],
            digitalMediaSponsorIndex: event.digitalMediaSponsorIndex ?? -1,
            isActive: event.isActive,
            createdAt: event.createdAt,
        });
    } catch (error) {
        console.error('Error fetching award event:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PUT /api/awards/[id] - Update award event (branding)
export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id || !isValidObjectId(id)) {
            return NextResponse.json({ error: 'Valid award event ID is required' }, { status: 400 });
        }

        const body = await req.json();

        await connectDB();

        const event = await AwardEvent.findById(id);

        if (!event) {
            return NextResponse.json({ error: 'Award event not found' }, { status: 404 });
        }

        // Update fields if provided
        if (body.name !== undefined) event.name = body.name;
        if (body.description !== undefined) event.description = body.description;
        if (body.headerImage !== undefined) event.headerImage = body.headerImage;
        if (body.sponsorImages !== undefined) event.sponsorImages = body.sponsorImages;
        if (body.digitalMediaSponsorIndex !== undefined) event.digitalMediaSponsorIndex = body.digitalMediaSponsorIndex;
        if (body.isActive !== undefined) event.isActive = body.isActive;

        await event.save();

        return NextResponse.json({
            id: event._id.toString(),
            name: event.name,
            description: event.description || '',
            headerImage: event.headerImage || '',
            sponsorImages: event.sponsorImages || [],
            digitalMediaSponsorIndex: event.digitalMediaSponsorIndex ?? -1,
            isActive: event.isActive,
            createdAt: event.createdAt,
        });
    } catch (error) {
        console.error('Error updating award event:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
