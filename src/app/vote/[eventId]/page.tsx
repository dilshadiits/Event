'use client';
import { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trophy, Vote as VoteIcon, Check, Loader2, Phone, Award, Crown, Medal, Users } from 'lucide-react';

interface Attendee {
    id: string;
    name: string;
    category?: string;
    instagram?: string;
}

interface Category {
    id: string;
    name: string;
    description: string;
    isActive: boolean;
    showResults: boolean;
}

interface VoteResult {
    categoryId: string;
    categoryName: string;
    description: string;
    isActive: boolean;
    showResults: boolean;
    totalVotes: number;
    leaderboard: {
        nomineeId: string;
        nomineeName: string;
        nomineeCategory: string;
        voteCount?: number;
    }[];
}

export default function VotePage({ params }: { params: Promise<{ eventId: string }> }) {
    const { eventId } = use(params);

    const [phone, setPhone] = useState('');
    const [phoneSubmitted, setPhoneSubmitted] = useState(false);
    const [attendees, setAttendees] = useState<Attendee[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [results, setResults] = useState<VoteResult[]>([]);
    const [votedCategories, setVotedCategories] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [voting, setVoting] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const fetchData = useCallback(async () => {
        try {
            const [catRes, attRes, resultRes] = await Promise.all([
                fetch(`/api/categories?eventId=${eventId}`),
                fetch(`/api/attendees?eventId=${eventId}`),
                fetch(`/api/votes?eventId=${eventId}`)
            ]);

            const catData = await catRes.json();
            const attData = await attRes.json();
            const resultData = await resultRes.json();

            if (Array.isArray(catData)) setCategories(catData);
            if (Array.isArray(attData)) setAttendees(attData);
            if (Array.isArray(resultData)) setResults(resultData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [eventId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handlePhoneSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (phone.length >= 10) {
            setPhoneSubmitted(true);
            setError('');
        } else {
            setError('Please enter a valid phone number');
        }
    };

    const submitVote = async (categoryId: string, nomineeId: string) => {
        if (voting) return;
        setVoting(`${categoryId}-${nomineeId}`);
        setError('');
        setSuccess('');

        try {
            const res = await fetch('/api/votes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    categoryId,
                    eventId,
                    nomineeId,
                    voterPhone: phone
                })
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess('Vote submitted successfully!');
                setVotedCategories(prev => new Set([...prev, categoryId]));
                fetchData(); // Refresh results
            } else {
                setError(data.error || 'Failed to submit vote');
            }
        } catch (err) {
            console.error(err);
            setError('Failed to submit vote');
        } finally {
            setVoting(null);
        }
    };

    const getRankIcon = (index: number) => {
        switch (index) {
            case 0: return <Crown className="w-5 h-5 text-yellow-400" />;
            case 1: return <Medal className="w-5 h-5 text-gray-300" />;
            case 2: return <Medal className="w-5 h-5 text-amber-600" />;
            default: return <span className="w-5 h-5 flex items-center justify-center text-sm text-muted-foreground">{index + 1}</span>;
        }
    };

    if (loading) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </main>
        );
    }

    return (
        <main className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <header className="flex items-center gap-4">
                <Link href="/" className="p-2 hover:bg-muted rounded-lg transition-colors -ml-2">
                    <ArrowLeft className="w-6 h-6 text-muted-foreground" />
                </Link>
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                        <Trophy className="w-8 h-8 text-yellow-500" />
                        Award Voting
                    </h1>
                    <p className="text-sm text-muted-foreground">Vote for your favorites in each category</p>
                </div>
            </header>

            {/* Phone Verification */}
            {!phoneSubmitted ? (
                <section className="bg-card border border-border rounded-xl p-6 shadow-xl">
                    <div className="flex items-center gap-3 mb-4">
                        <Phone className="w-6 h-6 text-blue-500" />
                        <h2 className="text-xl font-bold">Enter Your Phone Number</h2>
                    </div>
                    <p className="text-muted-foreground mb-4">
                        Your phone number is used to ensure one vote per person per category.
                    </p>
                    <form onSubmit={handlePhoneSubmit} className="flex flex-col sm:flex-row gap-4">
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                            placeholder="Enter your phone number"
                            className="flex-1 bg-muted border border-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            maxLength={15}
                        />
                        <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition-colors"
                        >
                            Continue
                        </button>
                    </form>
                    {error && <p className="text-red-400 mt-2 text-sm">{error}</p>}
                </section>
            ) : (
                <>
                    {/* Status Messages */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg flex items-center gap-2">
                            <Check className="w-5 h-5" />
                            {success}
                        </div>
                    )}

                    {/* Voting Categories */}
                    {categories.length === 0 ? (
                        <div className="bg-muted/20 border border-dashed border-border rounded-xl p-12 text-center text-muted-foreground">
                            <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            No voting categories available yet.
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {categories.filter(c => c.isActive).map((category) => {
                                const result = results.find(r => r.categoryId === category.id);
                                const hasVoted = votedCategories.has(category.id);

                                return (
                                    <section key={category.id} className="bg-card border border-border rounded-xl overflow-hidden shadow-xl">
                                        {/* Category Header */}
                                        <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 p-4 border-b border-border">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Award className="w-6 h-6 text-purple-400" />
                                                    <div>
                                                        <h3 className="text-lg font-bold text-white">{category.name}</h3>
                                                        {category.description && (
                                                            <p className="text-sm text-muted-foreground">{category.description}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                {hasVoted && (
                                                    <span className="flex items-center gap-1 text-green-400 text-sm bg-green-500/10 px-3 py-1 rounded-full border border-green-500/30">
                                                        <Check className="w-4 h-4" /> Voted
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Results (if enabled) */}
                                        {category.showResults && result && result.leaderboard.length > 0 && (
                                            <div className="p-4 bg-muted/30 border-b border-border">
                                                <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                                    <Crown className="w-4 h-4 text-yellow-500" />
                                                    Current Leaders
                                                </h4>
                                                <div className="space-y-2">
                                                    {result.leaderboard.slice(0, 5).map((entry, idx) => (
                                                        <div key={entry.nomineeId} className="flex items-center gap-3 py-2">
                                                            {getRankIcon(idx)}
                                                            <span className="font-medium text-white flex-1">{entry.nomineeName}</span>
                                                            {entry.voteCount !== undefined && (
                                                                <span className="text-sm text-muted-foreground">{entry.voteCount} votes</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Nominees */}
                                        <div className="p-4">
                                            <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                                <Users className="w-4 h-4" />
                                                Select a Nominee
                                            </h4>
                                            {hasVoted ? (
                                                <p className="text-muted-foreground text-sm py-4 text-center">
                                                    Thank you for voting in this category!
                                                </p>
                                            ) : (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {attendees.map((attendee) => {
                                                        const isVoting = voting === `${category.id}-${attendee.id}`;
                                                        return (
                                                            <button
                                                                key={attendee.id}
                                                                onClick={() => submitVote(category.id, attendee.id)}
                                                                disabled={!!voting || hasVoted}
                                                                className="flex items-center gap-3 p-3 bg-muted/50 hover:bg-muted border border-border rounded-lg transition-all hover:border-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed group"
                                                            >
                                                                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                                                    {attendee.name.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div className="text-left flex-1">
                                                                    <p className="font-medium text-white">{attendee.name}</p>
                                                                    {attendee.category && (
                                                                        <p className="text-xs text-muted-foreground">{attendee.category}</p>
                                                                    )}
                                                                </div>
                                                                {isVoting ? (
                                                                    <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                                                                ) : (
                                                                    <VoteIcon className="w-5 h-5 text-muted-foreground group-hover:text-purple-400 transition-colors" />
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </main>
    );
}
