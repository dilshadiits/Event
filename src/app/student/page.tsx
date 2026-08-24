'use client';
import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { LogOut, Loader2, Trophy, ListChecks, CheckCircle2, Award, Settings } from 'lucide-react';
import StudentProgramCard, { StudentProgram } from '@/components/StudentProgramCard';

interface Me {
    name: string;
    team: { id: string; name: string; color?: string } | null;
    fest: { id: string; name: string } | null;
}

function initials(name: string) {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(w => w.charAt(0).toUpperCase())
        .join('');
}

export default function StudentHomePage() {
    const [me, setMe] = useState<Me | null>(null);
    const [programs, setPrograms] = useState<StudentProgram[]>([]);
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

    const checkedInCount = programs.filter(p => p.checkedIn).length;
    const resultsCount = programs.filter(p => p.rank !== undefined && p.rank !== null).length;

    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_120%_60%_at_50%_-10%,rgba(59,130,246,0.16),transparent),radial-gradient(ellipse_100%_50%_at_100%_100%,rgba(168,85,247,0.1),transparent)]">
            <main className="max-w-lg mx-auto p-4 pb-10 space-y-6">
                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-blue-600/15 via-cyan-500/5 to-transparent p-5 pt-6">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-xl font-black text-white shadow-lg shadow-blue-500/25">
                                {me ? initials(me.name) : ''}
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] uppercase tracking-wider text-blue-300/80 font-semibold">Welcome back</p>
                                <h1 className="text-xl font-bold text-white leading-tight truncate">{me?.name || 'My Schedule'}</h1>
                                {me?.team && (
                                    <span className="inline-flex items-center gap-1.5 mt-1 text-xs font-medium text-white/70">
                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: me.team.color || '#6366f1' }} />
                                        {me.team.name}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            <Link
                                href="/student/results"
                                className="p-2.5 text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                                title="My Results"
                            >
                                <Trophy className="w-5 h-5" />
                            </Link>
                            <Link
                                href="/student/settings"
                                className="p-2.5 text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                                title="Settings"
                            >
                                <Settings className="w-5 h-5" />
                            </Link>
                            <button
                                onClick={() => signOut({ callbackUrl: '/login' })}
                                className="p-2.5 text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                                title="Sign out"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    {me?.fest?.name && <p className="mt-4 text-sm text-white/50">{me.fest.name}</p>}
                </div>

                {!loading && programs.length > 0 && (
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-card/60 border border-white/10 rounded-2xl px-3 py-3 text-center">
                            <ListChecks className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                            <div className="text-lg font-bold text-white">{programs.length}</div>
                            <div className="text-[11px] text-muted-foreground">Entries</div>
                        </div>
                        <div className="bg-card/60 border border-white/10 rounded-2xl px-3 py-3 text-center">
                            <CheckCircle2 className="w-4 h-4 text-green-400 mx-auto mb-1" />
                            <div className="text-lg font-bold text-white">{checkedInCount}</div>
                            <div className="text-[11px] text-muted-foreground">Checked In</div>
                        </div>
                        <div className="bg-card/60 border border-white/10 rounded-2xl px-3 py-3 text-center">
                            <Award className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
                            <div className="text-lg font-bold text-white">{resultsCount}</div>
                            <div className="text-[11px] text-muted-foreground">Results</div>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="p-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-6 h-6 animate-spin" /> Loading...
                    </div>
                ) : programs.length === 0 ? (
                    <div className="bg-card/60 border border-white/10 rounded-2xl p-12 text-center text-muted-foreground">
                        You&apos;re not entered in any programs yet.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {programs.map(p => (
                            <StudentProgramCard key={p.entryId} program={p} />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
