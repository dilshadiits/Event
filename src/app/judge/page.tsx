'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Gavel, LogOut, Loader2, ChevronRight } from 'lucide-react';

interface AssignedProgram {
    id: string;
    name: string;
    type: string;
    mode: string;
    status: string;
    totalEntries: number;
    scoredCount: number;
}

const STATUS_STYLES: Record<string, string> = {
    scheduled: 'bg-white/5 text-muted-foreground',
    'chest-numbers-shuffled': 'bg-blue-500/20 text-blue-400',
    'in-progress': 'bg-yellow-500/20 text-yellow-400',
    'judging-closed': 'bg-orange-500/20 text-orange-400',
    'results-published': 'bg-green-500/20 text-green-400',
};

export default function JudgeHomePage() {
    const { data: session } = useSession();
    const [programs, setPrograms] = useState<AssignedProgram[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/judge/programs');
                const data = await res.json();
                if (Array.isArray(data)) setPrograms(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return (
        <main className="min-h-screen p-4 md:p-8 max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                        <Gavel className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">My Programs</h1>
                        <p className="text-sm text-muted-foreground">{session?.user?.name}</p>
                    </div>
                </div>
                <button
                    onClick={() => signOut({ callbackUrl: '/judge/login' })}
                    className="flex items-center gap-2 text-muted-foreground hover:text-white p-2 rounded-lg hover:bg-muted transition-colors"
                    title="Sign out"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>

            {loading ? (
                <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> Loading...
                </div>
            ) : programs.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
                    You&apos;re not on any judge panels yet.
                </div>
            ) : (
                <div className="space-y-3">
                    {programs.map(p => {
                        const canScore = p.status === 'chest-numbers-shuffled' || p.status === 'in-progress';
                        const content = (
                            <>
                                <div>
                                    <div className="font-bold text-white">{p.name}</div>
                                    <div className="text-xs text-muted-foreground capitalize mt-0.5">
                                        {p.type} &middot; {p.mode} &middot; {p.scoredCount}/{p.totalEntries} scored
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs px-2.5 py-1 rounded-full ${STATUS_STYLES[p.status] || STATUS_STYLES.scheduled}`}>
                                        {p.status.replace(/-/g, ' ')}
                                    </span>
                                    {canScore && <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                                </div>
                            </>
                        );
                        return canScore ? (
                            <Link
                                key={p.id}
                                href={`/judge/programs/${p.id}/score`}
                                className="bg-card border border-border rounded-xl p-4 flex items-center justify-between hover:border-orange-500/50 transition-all"
                            >
                                {content}
                            </Link>
                        ) : (
                            <div key={p.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between opacity-60">
                                {content}
                            </div>
                        );
                    })}
                </div>
            )}
        </main>
    );
}
