'use client';
import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { GraduationCap, LogOut, Loader2, MapPin, Calendar, CheckCircle2, Trophy } from 'lucide-react';

interface Me {
    name: string;
    team: { id: string; name: string; color?: string } | null;
    fest: { id: string; name: string } | null;
}

interface MyProgram {
    entryId: string;
    programId: string;
    programName: string;
    type: string;
    mode: string;
    scheduledAt?: string;
    venue?: string;
    status: string;
    chestNumber?: string;
    checkedIn: boolean;
    disqualified: boolean;
    rank?: number;
}

export default function StudentHomePage() {
    const [me, setMe] = useState<Me | null>(null);
    const [programs, setPrograms] = useState<MyProgram[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const [meRes, programsRes] = await Promise.all([
                    fetch('/api/student/me'),
                    fetch('/api/student/programs'),
                ]);
                const meData = await meRes.json();
                const programsData = await programsRes.json();
                if (meData?.name) setMe(meData);
                if (Array.isArray(programsData)) setPrograms(programsData);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return (
        <main className="min-h-screen p-4 md:p-8 max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                        <GraduationCap className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">{me?.name || 'My Schedule'}</h1>
                        <p className="text-sm text-muted-foreground">
                            {me?.fest?.name}{me?.team ? ` · ${me.team.name}` : ''}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/student/results" className="p-2 text-muted-foreground hover:text-white hover:bg-muted rounded-lg transition-colors" title="My Results">
                        <Trophy className="w-5 h-5" />
                    </Link>
                    <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="p-2 text-muted-foreground hover:text-white hover:bg-muted rounded-lg transition-colors"
                        title="Sign out"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> Loading...
                </div>
            ) : programs.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
                    You&apos;re not entered in any programs yet.
                </div>
            ) : (
                <div className="space-y-3">
                    {programs.map(p => (
                        <div key={p.entryId} className="bg-card border border-border rounded-xl p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="font-bold text-white">{p.programName}</div>
                                    <div className="text-xs text-muted-foreground capitalize mt-0.5">{p.type} &middot; {p.mode}</div>
                                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                                        {p.scheduledAt && (
                                            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(p.scheduledAt).toLocaleString()}</span>
                                        )}
                                        {p.venue && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{p.venue}</span>}
                                    </div>
                                </div>
                                {p.chestNumber && (
                                    <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold shrink-0">
                                        {p.chestNumber}
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                                {p.checkedIn && (
                                    <span className="flex items-center gap-1 text-xs text-green-400 bg-green-900/20 px-2 py-1 rounded-full border border-green-900/50">
                                        <CheckCircle2 className="w-3 h-3" /> Checked in
                                    </span>
                                )}
                                {p.disqualified && (
                                    <span className="text-xs text-red-400 bg-red-900/20 px-2 py-1 rounded-full border border-red-900/50">
                                        Disqualified
                                    </span>
                                )}
                                {p.rank && (
                                    <span className="text-xs text-yellow-400 bg-yellow-900/20 px-2 py-1 rounded-full border border-yellow-900/50">
                                        Rank #{p.rank}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}
