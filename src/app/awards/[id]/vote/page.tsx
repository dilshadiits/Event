/* eslint-disable @next/next/no-img-element */
'use client';
import { useState, useEffect, use, useCallback } from 'react';
import { Trophy, Vote as VoteIcon, Check, Loader2, Phone, Award, Crown, Medal, Users } from 'lucide-react';

interface Category {
    id: string;
    name: string;
    description: string;
    isActive: boolean;
    showResults: boolean;
}

interface Nominee {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    categoryId: string | null;
    categoryName: string;
}

interface AwardEventData {
    id: string;
    name: string;
    description: string;
    headerImage: string;
    sponsorImages: string[];
}

interface VoteResult {
    categoryId: string;
    categoryName: string;
    showResults: boolean;
    totalVotes: number;
    leaderboard: {
        nomineeId: string;
        nomineeName: string;
        voteCount?: number;
    }[];
}

export default function AwardVotePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);

    const [phone, setPhone] = useState('');
    const [phoneSubmitted, setPhoneSubmitted] = useState(false);
    const [eventData, setEventData] = useState<AwardEventData | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [nominees, setNominees] = useState<Nominee[]>([]);
    const [results, setResults] = useState<VoteResult[]>([]);
    const [votedCategories, setVotedCategories] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [voting, setVoting] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const fetchData = useCallback(async () => {
        try {
            const [eventRes, catRes, nomRes, resultRes] = await Promise.all([
                fetch(`/api/awards/${id}`),
                fetch(`/api/categories?eventId=${id}`),
                fetch(`/api/nominees?awardEventId=${id}`),
                fetch(`/api/award-votes?awardEventId=${id}`)
            ]);

            const eventDataRes = await eventRes.json();
            const catData = await catRes.json();
            const nomData = await nomRes.json();
            const resultData = await resultRes.json();

            if (eventDataRes && !eventDataRes.error) setEventData(eventDataRes);
            if (Array.isArray(catData)) setCategories(catData.filter((c: Category) => c.isActive));
            if (Array.isArray(nomData)) setNominees(nomData);
            if (Array.isArray(resultData)) setResults(resultData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [id]);

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
            const res = await fetch('/api/award-votes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    awardEventId: id,
                    categoryId,
                    nomineeId,
                    voterPhone: phone
                })
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess('Vote submitted successfully!');
                setVotedCategories(prev => new Set([...prev, categoryId]));
                fetchData();
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

    const getNomineesForCategory = (categoryId: string) => {
        return nominees.filter(n => n.categoryId === categoryId || n.categoryId === null);
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
            <main className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </main>
        );
    }

    return (
        <main className="min-h-screen p-3 sm:p-4 md:p-8 max-w-4xl mx-auto space-y-4 sm:space-y-6">
            {/* Header with Event Branding */}
            <header className="text-center py-4 sm:py-6">
                {/* Header Banner */}
                {eventData?.headerImage && (
                    <img
                        src={eventData.headerImage}
                        alt="Event Banner"
                        className="w-full h-24 sm:h-32 md:h-48 object-cover rounded-xl mb-4 sm:mb-6 border border-border"
                    />
                )}

                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl sm:rounded-2xl mb-3 sm:mb-4">
                    <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">
                    {eventData?.name || 'Award Voting'}
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground">{eventData?.description || 'Vote for your favorites in each category'}</p>

                {/* Sponsors */}
                {/* Sponsors */}
                {eventData?.sponsorImages && eventData.sponsorImages.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-border/50 space-y-6">

                        {/* Main Sponsor */}
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-[10px] sm:text-xs uppercase tracking-widest text-yellow-500 font-semibold">Main Sponsor</span>
                            <img
                                src={eventData.sponsorImages[0]}
                                alt="Main Sponsor"
                                className="h-16 sm:h-20 md:h-24 w-auto object-contain bg-white/10 rounded-lg px-4 py-2 border border-yellow-500/30"
                            />
                        </div>

                        {/* Associate Sponsors */}
                        {eventData.sponsorImages.length > 1 && (
                            <div className="flex flex-col items-center gap-2 sm:gap-3">
                                <span className="text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground font-medium">Associate Sponsors</span>
                                <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
                                    {eventData.sponsorImages.slice(1).map((url, i) => (
                                        <img
                                            key={i}
                                            src={url}
                                            alt={`Associate Sponsor ${i + 1}`}
                                            className="h-14 sm:h-16 md:h-20 w-auto object-contain bg-white/10 rounded-lg px-3 sm:px-4 py-2 border border-white/10"
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </header>

            {/* Phone Verification */}
            {!phoneSubmitted ? (
                <section className="bg-card border border-border rounded-xl p-6 shadow-xl max-w-md mx-auto">
                    <div className="flex items-center gap-3 mb-4 justify-center">
                        <Phone className="w-6 h-6 text-purple-500" />
                        <h2 className="text-xl font-bold">Enter Your Phone Number</h2>
                    </div>
                    <p className="text-muted-foreground text-center mb-4 text-sm">
                        Your phone number is used to ensure one vote per person per category.
                    </p>
                    <form onSubmit={handlePhoneSubmit} className="space-y-4">
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                            placeholder="Enter your phone number"
                            className="w-full bg-muted border border-border rounded-lg px-4 py-3 text-white text-center text-lg focus:ring-2 focus:ring-purple-500 outline-none"
                            maxLength={15}
                        />
                        <button
                            type="submit"
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 rounded-lg font-bold transition-colors"
                        >
                            Start Voting
                        </button>
                    </form>
                    {error && <p className="text-red-400 mt-2 text-sm text-center">{error}</p>}
                </section>
            ) : (
                <>
                    {/* Status Messages */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-center">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg flex items-center gap-2 justify-center">
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
                            {categories.map((category) => {
                                const categoryNominees = getNomineesForCategory(category.id);
                                const result = results.find(r => r.categoryId === category.id);
                                const hasVoted = votedCategories.has(category.id);

                                return (
                                    <section key={category.id} className="bg-card border border-border rounded-xl overflow-hidden shadow-xl">
                                        {/* Category Header */}
                                        <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 p-4 border-b border-border">
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
                                            {categoryNominees.length === 0 ? (
                                                <p className="text-muted-foreground text-sm py-4 text-center">
                                                    No nominees in this category yet.
                                                </p>
                                            ) : hasVoted ? (
                                                <p className="text-muted-foreground text-sm py-4 text-center">
                                                    Thank you for voting in this category!
                                                </p>
                                            ) : (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {categoryNominees.map((nominee) => {
                                                        const isVoting = voting === `${category.id}-${nominee.id}`;
                                                        return (
                                                            <button
                                                                key={nominee.id}
                                                                onClick={() => submitVote(category.id, nominee.id)}
                                                                disabled={!!voting || hasVoted}
                                                                className="flex items-center gap-4 p-4 bg-muted/50 hover:bg-muted border border-border rounded-xl transition-all hover:border-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed group"
                                                            >
                                                                {nominee.imageUrl ? (
                                                                    <img
                                                                        src={nominee.imageUrl}
                                                                        alt={nominee.name}
                                                                        className="w-20 h-20 rounded-xl object-cover border-2 border-border group-hover:border-purple-500 transition-colors flex-shrink-0"
                                                                    />
                                                                ) : (
                                                                    <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center text-purple-400 font-bold text-2xl group-hover:from-purple-500 group-hover:to-pink-500 group-hover:text-white transition-colors flex-shrink-0">
                                                                        {nominee.name.charAt(0).toUpperCase()}
                                                                    </div>
                                                                )}
                                                                <div className="text-left flex-1">
                                                                    <p className="font-medium text-white">{nominee.name}</p>
                                                                    {nominee.description && (
                                                                        <p className="text-xs text-muted-foreground">{nominee.description}</p>
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
