'use client';
import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, UserSquare2, ListChecks, Gavel, Trophy, Award, Loader2 } from 'lucide-react';

interface FestDetail {
    id: string;
    name: string;
    description?: string;
    startDate?: string;
    endDate?: string;
}

export default function FestDashboardPage({ params }: { params: Promise<{ festId: string }> }) {
    const { festId } = use(params);
    const [fest, setFest] = useState<FestDetail | null>(null);
    const [counts, setCounts] = useState({ teams: 0, participants: 0, programs: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch(`/api/fests/${festId}`).then(res => res.json()),
            fetch(`/api/teams?festId=${festId}`).then(res => res.json()),
            fetch(`/api/participants?festId=${festId}`).then(res => res.json()),
            fetch(`/api/programs?festId=${festId}`).then(res => res.json()),
        ]).then(([festData, teams, participants, programs]) => {
            setFest(festData);
            setCounts({
                teams: Array.isArray(teams) ? teams.length : 0,
                participants: Array.isArray(participants) ? participants.length : 0,
                programs: Array.isArray(programs) ? programs.length : 0,
            });
        }).finally(() => setLoading(false));
    }, [festId]);

    if (loading) {
        return (
            <main className="min-h-screen flex items-center justify-center text-muted-foreground gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading...
            </main>
        );
    }

    if (!fest) {
        return <main className="min-h-screen flex items-center justify-center text-muted-foreground">Fest not found.</main>;
    }

    const sections = [
        { href: `/admin/competitions/${festId}/teams`, icon: Users, label: 'Teams', count: counts.teams, border: 'hover:border-blue-500/50', chip: 'bg-blue-500/20 text-blue-400' },
        { href: `/admin/competitions/${festId}/participants`, icon: UserSquare2, label: 'Participants', count: counts.participants, border: 'hover:border-purple-500/50', chip: 'bg-purple-500/20 text-purple-400' },
        { href: `/admin/competitions/${festId}/programs`, icon: ListChecks, label: 'Programs', count: counts.programs, border: 'hover:border-pink-500/50', chip: 'bg-pink-500/20 text-pink-400' },
        { href: `/admin/competitions/${festId}/judges`, icon: Gavel, label: 'Judges & Admins', count: undefined, border: 'hover:border-orange-500/50', chip: 'bg-orange-500/20 text-orange-400' },
        { href: `/admin/competitions/${festId}/standings`, icon: Trophy, label: 'Standings', count: undefined, border: 'hover:border-yellow-500/50', chip: 'bg-yellow-500/20 text-yellow-400' },
        { href: `/admin/competitions/${festId}/certificates`, icon: Award, label: 'Certificates & Posters', count: undefined, border: 'hover:border-green-500/50', chip: 'bg-green-500/20 text-green-400' },
    ];

    return (
        <main className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/admin/competitions" className="p-2 hover:bg-muted rounded-lg transition-colors -ml-2">
                    <ArrowLeft className="w-6 h-6 text-muted-foreground" />
                </Link>
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white">{fest.name}</h1>
                    {fest.description && <p className="text-sm text-muted-foreground">{fest.description}</p>}
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                {sections.map(({ href, icon: Icon, label, count, border, chip }) => (
                    <Link
                        key={href}
                        href={href}
                        className={`bg-card border border-border rounded-xl p-5 ${border} transition-all flex items-center justify-between`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 ${chip} rounded-lg flex items-center justify-center`}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <span className="font-bold text-white">{label}</span>
                        </div>
                        {count !== undefined && <span className="text-2xl font-bold text-white">{count}</span>}
                    </Link>
                ))}
            </div>
        </main>
    );
}
