'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Trophy, Award, ArrowRight, Trash2, Vote } from 'lucide-react';

interface AwardEvent {
    id: string;
    name: string;
    description: string;
    isActive: boolean;
    createdAt: string;
}

export default function AwardsPage() {
    const [events, setEvents] = useState<AwardEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [newEventName, setNewEventName] = useState('');
    const [newEventDesc, setNewEventDesc] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const res = await fetch('/api/awards');
            const data = await res.json();
            if (Array.isArray(data)) setEvents(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const createEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEventName.trim()) return;

        try {
            const res = await fetch('/api/awards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newEventName, description: newEventDesc })
            });
            if (res.ok) {
                setNewEventName('');
                setNewEventDesc('');
                fetchEvents();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const deleteEvent = async (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm('Delete this award event? All categories, nominees and votes will be lost.')) return;
        try {
            const res = await fetch(`/api/awards?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchEvents();
                setError('');
            } else {
                const data = await res.json();
                setError(`Failed to delete: ${data.error || 'Unknown error'}`);
            }
        } catch (err) {
            console.error(err);
            setError('Failed to delete award event');
        }
    };

    return (
        <main className="min-h-screen p-3 sm:p-4 md:p-8 max-w-6xl mx-auto space-y-6 sm:space-y-8">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2 flex items-center gap-2 sm:gap-3">
                        <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-500" />
                        Award <span className="text-gradient">Voting</span>
                    </h1>
                    <p className="text-sm sm:text-base text-muted-foreground md:text-lg">
                        Create award ceremonies, add categories & nominees, and collect votes.
                    </p>
                </div>
                <Link
                    href="/"
                    className="text-sm text-muted-foreground hover:text-white transition-colors"
                >
                    ← Back to Events
                </Link>
            </header>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError('')} className="hover:text-white">✕</button>
                </div>
            )}

            {/* Create Award Event */}
            <section className="bg-card border border-border rounded-xl p-4 sm:p-6 shadow-xl">
                <h2 className="text-lg sm:text-2xl font-bold mb-4 sm:mb-6 flex items-center gap-2">
                    <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
                    Create Award Ceremony
                </h2>
                <form onSubmit={createEvent} className="flex flex-col gap-3 sm:gap-4">
                    <div className="space-y-2 w-full">
                        <label className="text-xs sm:text-sm font-medium text-muted-foreground">Event Name</label>
                        <input
                            type="text"
                            placeholder="e.g. Best of 2024 Awards"
                            value={newEventName}
                            onChange={(e) => setNewEventName(e.target.value)}
                            className="w-full bg-muted border border-border rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-sm sm:text-base"
                        />
                    </div>
                    <div className="space-y-2 w-full">
                        <label className="text-xs sm:text-sm font-medium text-muted-foreground">Description (optional)</label>
                        <input
                            type="text"
                            placeholder="Brief description"
                            value={newEventDesc}
                            onChange={(e) => setNewEventDesc(e.target.value)}
                            className="w-full bg-muted border border-border rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-sm sm:text-base"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 active:scale-[0.98] text-white px-8 py-3 rounded-lg font-bold transition-all text-sm sm:text-base"
                    >
                        Create
                    </button>
                </form>
            </section>

            {/* Award Events List */}
            <section>
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <Award className="w-6 h-6 text-yellow-500" />
                    Your Award Ceremonies
                </h2>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-40 bg-muted/50 rounded-xl animate-pulse"></div>
                        ))}
                    </div>
                ) : events.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                        <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        No award ceremonies yet. Create one to get started.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {events.map((event) => (
                            <div
                                key={event.id}
                                className="group block bg-card hover:bg-muted/50 border border-border rounded-xl p-6 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/10 hover:border-purple-500/50"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg text-purple-400 group-hover:from-purple-500 group-hover:to-pink-500 group-hover:text-white transition-colors">
                                        <Trophy className="w-6 h-6" />
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded ${event.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {event.isActive ? 'Active' : 'Closed'}
                                    </span>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">{event.name}</h3>
                                {event.description && (
                                    <p className="text-muted-foreground text-sm mb-3">{event.description}</p>
                                )}
                                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                                    <Link
                                        href={`/awards/${event.id}`}
                                        className="text-sm text-purple-400 font-medium group-hover:underline flex items-center gap-1"
                                    >
                                        Manage <ArrowRight className="w-4 h-4" />
                                    </Link>
                                    <div className="flex gap-2">
                                        <Link
                                            href={`/awards/${event.id}/vote`}
                                            className="p-2 text-muted-foreground hover:text-white hover:bg-white/10 rounded-full transition-all"
                                            title="Public Voting Page"
                                        >
                                            <Vote className="w-4 h-4" />
                                        </Link>
                                        <button
                                            onClick={(e) => deleteEvent(e, event.id)}
                                            className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-full transition-all"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}
