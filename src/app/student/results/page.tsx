'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Crown, Medal } from 'lucide-react';

interface MyProgram {
    entryId: string;
    programName: string;
    type: string;
    mode: string;
    rank?: number;
}

export default function StudentResultsPage() {
    const [results, setResults] = useState<MyProgram[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/student/programs');
                const data = await res.json();
                if (Array.isArray(data)) {
                    setResults(data.filter((p: MyProgram) => p.rank !== undefined && p.rank !== null));
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return (
        <main className="min-h-screen p-4 md:p-8 max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/student" className="p-2 hover:bg-muted rounded-lg transition-colors -ml-2">
                    <ArrowLeft className="w-6 h-6 text-muted-foreground" />
                </Link>
                <h1 className="text-2xl font-bold text-white">My Results</h1>
            </div>

            {loading ? (
                <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> Loading...
                </div>
            ) : results.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
                    No results published for you yet.
                </div>
            ) : (
                <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border/50">
                    {results.map(p => (
                        <div key={p.entryId} className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 text-center shrink-0">
                                    {p.rank === 1 ? <Crown className="w-5 h-5 text-yellow-400 mx-auto" /> :
                                        p.rank === 2 ? <Medal className="w-5 h-5 text-gray-300 mx-auto" /> :
                                            p.rank === 3 ? <Medal className="w-5 h-5 text-amber-600 mx-auto" /> :
                                                <span className="text-muted-foreground font-bold">{p.rank}</span>}
                                </div>
                                <div>
                                    <div className="font-bold text-white">{p.programName}</div>
                                    <div className="text-xs text-muted-foreground capitalize">{p.type} &middot; {p.mode}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}
