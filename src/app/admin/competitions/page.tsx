'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Trophy, Plus, LogOut, Calendar, Loader2, BookOpen } from 'lucide-react';

interface Fest {
    id: string;
    name: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    isActive: boolean;
}

export default function CompetitionsListPage() {
    const { data: session } = useSession();
    const [fests, setFests] = useState<Fest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/fests')
            .then(res => res.json())
            .then(data => setFests(Array.isArray(data) ? data : []))
            .finally(() => setLoading(false));
    }, []);

    return (
        <main className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Competitions</h1>
                        <p className="text-sm text-muted-foreground">{session?.user?.name} &middot; {session?.user?.role}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {session?.user?.role === 'super-admin' && (
                        <Link
                            href="/admin/competitions/new"
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                            <Plus className="w-4 h-4" /> New Fest
                        </Link>
                    )}
                    <Link
                        href="/admin/competitions/help"
                        className="p-2 text-muted-foreground hover:text-white hover:bg-muted rounded-lg transition-colors"
                        title="Help & Tutorial"
                    >
                        <BookOpen className="w-5 h-5" />
                    </Link>
                    <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="flex items-center gap-2 text-muted-foreground hover:text-white p-2 rounded-lg hover:bg-muted transition-colors"
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
            ) : fests.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
                    No fests yet. {session?.user?.role === 'super-admin' && 'Create one to get started.'}
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                    {fests.map(fest => (
                        <Link
                            key={fest.id}
                            href={`/admin/competitions/${fest.id}`}
                            className="bg-card border border-border rounded-xl p-5 hover:border-indigo-500/50 transition-all"
                        >
                            <div className="flex items-start justify-between">
                                <h3 className="text-lg font-bold text-white">{fest.name}</h3>
                                {!fest.isActive && (
                                    <span className="text-xs bg-white/5 text-muted-foreground px-2 py-0.5 rounded-full">Inactive</span>
                                )}
                            </div>
                            {fest.description && <p className="text-sm text-muted-foreground mt-1">{fest.description}</p>}
                            {(fest.startDate || fest.endDate) && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-3">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {fest.startDate}{fest.endDate ? ` – ${fest.endDate}` : ''}
                                </div>
                            )}
                        </Link>
                    ))}
                </div>
            )}
        </main>
    );
}
