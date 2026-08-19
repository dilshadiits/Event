'use client';
import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Crown, Medal, Lock, Loader2 } from 'lucide-react';

interface ResultRow {
    rank: number;
    name: string;
    chestNumber?: string;
}

export default function PublicProgramResultPage({ params }: { params: Promise<{ festId: string; programId: string }> }) {
    const { festId, programId } = use(params);
    const [festName, setFestName] = useState('');
    const [programName, setProgramName] = useState('');
    const [results, setResults] = useState<ResultRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [notPublic, setNotPublic] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`/api/programs/${programId}/results`);
                const data = await res.json();
                if (res.ok && data.results) {
                    setResults(data.results);
                    setFestName(data.fest?.name || '');
                    setProgramName(data.program?.name || '');
                } else {
                    setNotPublic(true);
                }
            } catch (err) {
                console.error(err);
                setNotPublic(true);
            } finally {
                setLoading(false);
            }
        })();
    }, [programId]);

    return (
        <main className="min-h-screen p-4 md:p-8 max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href={`/results/${festId}`} className="p-2 hover:bg-muted rounded-lg transition-colors -ml-2">
                    <ArrowLeft className="w-6 h-6 text-muted-foreground" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-white">{programName || 'Results'}</h1>
                    {festName && <p className="text-sm text-muted-foreground">{festName}</p>}
                </div>
            </div>

            {loading ? (
                <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> Loading...
                </div>
            ) : notPublic ? (
                <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
                    <Lock className="w-8 h-8" />
                    Results aren&apos;t published yet. Check back soon.
                </div>
            ) : (
                <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border/50">
                    {results.map(r => (
                        <div key={r.name + r.rank} className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 text-center shrink-0">
                                    {r.rank === 1 ? <Crown className="w-5 h-5 text-yellow-400 mx-auto" /> :
                                        r.rank === 2 ? <Medal className="w-5 h-5 text-gray-300 mx-auto" /> :
                                            r.rank === 3 ? <Medal className="w-5 h-5 text-amber-600 mx-auto" /> :
                                                <span className="text-muted-foreground font-bold">{r.rank}</span>}
                                </div>
                                <span className="font-bold text-white">{r.name}</span>
                            </div>
                            {r.chestNumber && <span className="text-xs text-muted-foreground font-mono">#{r.chestNumber}</span>}
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}
