import { notFound } from 'next/navigation';
import dbConnect from '@/lib/mongodb';
import { Attendee, Event } from '@/models';
import PassViewer from '@/components/PassViewer';

export default async function PassPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    
    await dbConnect();
    
    let attendee;
    try {
        attendee = await Attendee.findById(id).lean();
    } catch (e) {
        // Invalid ID format
        return notFound();
    }
    
    if (!attendee) {
        return notFound();
    }
    
    const event = await Event.findById(attendee.eventId).lean();
    if (!event) {
        return notFound();
    }
    
    // Parse guest names if they exist
    const hasGuest = Boolean(attendee.guest_names && attendee.guest_names.trim());
    
    return (
        <main className="min-h-screen bg-[#0a0a1a] flex flex-col items-center py-12 px-4">
            <div className="w-full max-w-4xl">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-white mb-2">Your Entry Pass</h1>
                    <p className="text-muted-foreground">Show this at the entrance of {event.name}</p>
                </div>
                
                <div className="flex flex-col md:flex-row gap-8 justify-center items-center md:items-start">
                    <PassViewer 
                        value={attendee._id.toString()}
                        name={attendee.name}
                        eventName={event.name}
                        templateUrl={event.entryPassImage}
                    />
                    
                    {hasGuest && (
                        <PassViewer 
                            value={`${attendee._id.toString()}_guest_${attendee.guest_names}`}
                            name={`${attendee.guest_names} (Guest)`}
                            eventName={event.name}
                            templateUrl={event.entryPassImage}
                        />
                    )}
                </div>
            </div>
        </main>
    );
}
