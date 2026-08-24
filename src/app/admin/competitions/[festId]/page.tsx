'use client';
import { useEffect, useState, use, useCallback } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Users, UserSquare2, ListChecks, Gavel, Trophy, Award,
    Loader2, BookOpen, Calendar, Globe, CheckCircle2, ClipboardCheck, ChevronRight,
} from 'lucide-react';

interface FestOverview {
    fest: { id: string; name: string; startDate?: string; endDate?: string; resultsArePublic: boolean };
    counts: { teams: number; participants: number; programs: number; judges: number };
    programsByStatus: Record<string, number>;
    entries: { total: number; checkedIn: number; scored: number };
}

interface Standing {
    teamId: string;
    teamName: string;
    color?: string;
    points: number;
}

const STATUS_ORDER = ['scheduled', 'chest-numbers-shuffled', 'in-progress', 'judging-closed', 'results-published'] as const;
const STATUS_LABEL: Record<string, string> = {
    scheduled: 'Scheduled',
    'chest-numbers-shuffled': 'Ready',
    'in-progress': 'Judging',
    'judging-closed': 'Closed',
    'results-published': 'Published',
};
const STATUS_BAR: Record<string, string> = {
    scheduled: 'bg-white/20',
    'chest-numbers-shuffled': 'bg-blue-500',
    'in-progress': 'bg-yellow-500',
    'judging-closed': 'bg-orange-500',
    'results-published': 'bg-green-500',
};
const STATUS_DOT: Record<string, string> = {
    scheduled: 'bg-white/40',
    'chest-numbers-shuffled': 'bg-blue-400',
    'in-progress': 'bg-yellow-400',
    'judging-closed': 'bg-orange-400',
    'results-published': 'bg-green-400',
};

function StatTile({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: number; accent: string }) {
    return (
        <div className="bg-card border border-border rounded-2xl px-4 py-4">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2.5 ${accent}`}>
                <Icon className="w-4.5 h-4.5" />
            </div>
            <div className="text-2xl font-bold text-white tabular-nums">{value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
        </div>
    );
}

export default function FestDashboardPage({ params }: { params: Promise<{ festId: string }> }) {
    const { festId } = use(params);
    const [overview, setOverview] = useState<FestOverview | null>(null);
    const [standings, setStandings] = useState<Standing[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAll = useCallback(async () => {
        try {
            const [overviewRes, standingsRes] = await Promise.all([
                fetch(`/api/fests/${festId}/overview`),
                fetch(`/api/fests/${festId}/standings?admin=true`),
            ]);
            const overviewData = await overviewRes.json();
            const standingsData = await standingsRes.json();
            if (overviewData?.fest) setOverview(overviewData);
            if (Array.isArray(standingsData?.standings)) setStandings(standingsData.standings);
        } finally {
            setLoading(false);
        }
    }, [festId]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    if (loading) {
        return (
            <main className="min-h-screen flex items-center justify-center text-muted-foreground gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading...
            </main>
        );
    }

    if (!overview) {
        return <main className="min-h-screen flex items-center justify-center text-muted-foreground">Fest not found.</main>;
    }

    const { fest, counts, programsByStatus, entries } = overview;
    const totalPrograms = counts.programs || 1;
    const checkInPct = entries.total ? Math.round((entries.checkedIn / entries.total) * 100) : 0;
    const scoredPct = entries.total ? Math.round((entries.scored / entries.total) * 100) : 0;
    const maxPoints = standings[0]?.points || 1;

    const sections = [
        { href: `/admin/competitions/${festId}/teams`, icon: Users, label: 'Teams', count: counts.teams, border: 'hover:border-blue-500/50', chip: 'bg-blue-500/20 text-blue-400' },
        { href: `/admin/competitions/${festId}/participants`, icon: UserSquare2, label: 'Participants', count: counts.participants, border: 'hover:border-purple-500/50', chip: 'bg-purple-500/20 text-purple-400' },
        { href: `/admin/competitions/${festId}/programs`, icon: ListChecks, label: 'Programs', count: counts.programs, border: 'hover:border-pink-500/50', chip: 'bg-pink-500/20 text-pink-400' },
        { href: `/admin/competitions/${festId}/judges`, icon: Gavel, label: 'Judges & Admins', count: counts.judges, border: 'hover:border-orange-500/50', chip: 'bg-orange-500/20 text-orange-400' },
        { href: `/admin/competitions/${festId}/standings`, icon: Trophy, label: 'Standings', count: undefined, border: 'hover:border-yellow-500/50', chip: 'bg-yellow-500/20 text-yellow-400' },
        { href: `/admin/competitions/${festId}/certificates`, icon: Award, label: 'Certificates & Posters', count: undefined, border: 'hover:border-green-500/50', chip: 'bg-green-500/20 text-green-400' },
    ];

    return (
        <main className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto space-y-6">
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-4">
                    <Link href="/admin/competitions" className="p-2 hover:bg-muted rounded-lg transition-colors -ml-2 shrink-0">
                        <ArrowLeft className="w-6 h-6 text-muted-foreground" />
                    </Link>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">{fest.name}</h1>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                            {(fest.startDate || fest.endDate) && (
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {[fest.startDate, fest.endDate].filter(Boolean).join(' – ')}
                                </span>
                            )}
                            <span className={`flex items-center gap-1 ${fest.resultsArePublic ? 'text-green-400' : ''}`}>
                                <Globe className="w-3.5 h-3.5" />
                                {fest.resultsArePublic ? 'Results Public' : 'Results Private'}
                            </span>
                        </div>
                    </div>
                </div>
                <Link
                    href="/admin/competitions/help"
                    className="flex items-center gap-2 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-all border border-border"
                >
                    <BookOpen className="w-4 h-4" />
                    Help &amp; Tutorial
                </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatTile icon={Users} label="Teams" value={counts.teams} accent="bg-blue-500/20 text-blue-400" />
                <StatTile icon={UserSquare2} label="Participants" value={counts.participants} accent="bg-purple-500/20 text-purple-400" />
                <StatTile icon={ListChecks} label="Programs" value={counts.programs} accent="bg-pink-500/20 text-pink-400" />
                <StatTile icon={Gavel} label="Judges" value={counts.judges} accent="bg-orange-500/20 text-orange-400" />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                    <h2 className="text-sm font-bold text-white">Program Progress</h2>
                    <div className="h-3 rounded-full overflow-hidden flex bg-muted/30">
                        {STATUS_ORDER.map(status => {
                            const count = programsByStatus[status] || 0;
                            if (count === 0) return null;
                            return (
                                <div
                                    key={status}
                                    className={`${STATUS_BAR[status]} h-full first:rounded-l-full last:rounded-r-full`}
                                    style={{ width: `${(count / totalPrograms) * 100}%`, marginRight: '1px' }}
                                    title={`${STATUS_LABEL[status]}: ${count}`}
                                />
                            );
                        })}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                        {STATUS_ORDER.map(status => (
                            <span key={status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <span className={`w-2 h-2 rounded-full ${STATUS_DOT[status]}`} />
                                {STATUS_LABEL[status]} <span className="text-white font-medium">{programsByStatus[status] || 0}</span>
                            </span>
                        ))}
                    </div>
                </div>

                <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                    <h2 className="text-sm font-bold text-white">Entries ({entries.total})</h2>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5 text-muted-foreground"><CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> Checked In</span>
                            <span className="text-white font-medium">{entries.checkedIn}/{entries.total}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${checkInPct}%` }} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5 text-muted-foreground"><ClipboardCheck className="w-3.5 h-3.5 text-blue-400" /> Scored</span>
                            <span className="text-white font-medium">{entries.scored}/{entries.total}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${scoredPct}%` }} />
                        </div>
                    </div>
                </div>
            </div>

            {standings.length > 0 && (
                <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold text-white flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-yellow-400" /> Team Standings
                        </h2>
                        <Link href={`/admin/competitions/${festId}/standings`} className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-white transition-colors">
                            View all <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                    <div className="space-y-2.5">
                        {standings.slice(0, 5).map((team, idx) => (
                            <div key={team.teamId} className="flex items-center gap-3">
                                <span className="w-4 text-xs font-bold text-muted-foreground shrink-0">{idx + 1}</span>
                                <span className="text-sm text-white w-28 sm:w-36 truncate shrink-0">{team.teamName}</span>
                                <div className="flex-1 h-2.5 rounded-full bg-muted/30 overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{ width: `${Math.max(4, (team.points / maxPoints) * 100)}%`, backgroundColor: team.color || '#6366f1' }}
                                    />
                                </div>
                                <span className="text-sm font-bold text-white tabular-nums w-10 text-right shrink-0">{team.points}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
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
