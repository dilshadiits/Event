'use client';
import { useEffect, useRef, useState } from 'react';
import { Crown, ChevronUp, ChevronDown } from 'lucide-react';
import { useCountUp } from '@/lib/useCountUp';

interface StandingRow {
    teamId: string;
    teamName: string;
    color?: string;
    points: number;
}

interface PublicStandingsBoardProps {
    standings: StandingRow[];
}

function AnimatedPoints({ value, className }: { value: number; className?: string }) {
    const animated = useCountUp(value);
    return <span className={className}>{animated.toLocaleString()}</span>;
}

function initials(name: string) {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(w => w.charAt(0).toUpperCase())
        .join('');
}

const PODIUM_STYLE: Record<number, { pedestal: string; avatar: string; badge: string; ring: string }> = {
    1: {
        pedestal: 'h-24 bg-gradient-to-b from-yellow-400/40 to-yellow-600/10',
        avatar: 'w-20 h-20 text-2xl',
        badge: 'bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-950',
        ring: 'ring-4 ring-yellow-400/60 animate-champion-glow',
    },
    2: {
        pedestal: 'h-16 bg-gradient-to-b from-slate-300/30 to-slate-400/5',
        avatar: 'w-16 h-16 text-lg',
        badge: 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900',
        ring: 'ring-2 ring-slate-300/50',
    },
    3: {
        pedestal: 'h-10 bg-gradient-to-b from-amber-600/30 to-amber-800/5',
        avatar: 'w-16 h-16 text-lg',
        badge: 'bg-gradient-to-br from-amber-500 to-amber-700 text-amber-950',
        ring: 'ring-2 ring-amber-500/50',
    },
};

function PodiumSlot({ team, rank }: { team: StandingRow; rank: 1 | 2 | 3 }) {
    const style = PODIUM_STYLE[rank];
    return (
        <div className="flex flex-1 flex-col items-center gap-2 min-w-0">
            {rank === 1 && (
                <Crown className="w-6 h-6 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.6)]" />
            )}
            <div className="relative">
                <div
                    className={`rounded-full flex items-center justify-center font-black text-white shadow-xl ${style.avatar} ${style.ring}`}
                    style={{ backgroundColor: team.color || '#6366f1' }}
                >
                    {initials(team.teamName)}
                </div>
                <div
                    className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shadow-md ${style.badge}`}
                >
                    {rank}
                </div>
            </div>
            <p className="font-bold text-white text-sm text-center leading-tight line-clamp-2 px-1">
                {team.teamName}
            </p>
            <AnimatedPoints value={team.points} className="text-xl font-black tabular-nums text-white" />
            <div className={`w-full rounded-t-xl ${style.pedestal}`} />
        </div>
    );
}

export default function PublicStandingsBoard({ standings }: PublicStandingsBoardProps) {
    const prevRanksRef = useRef<Map<string, number> | null>(null);
    const [deltas, setDeltas] = useState<Map<string, number>>(new Map());

    useEffect(() => {
        const nextRanks = new Map(standings.map((s, i) => [s.teamId, i]));
        const prevRanks = prevRanksRef.current;
        if (prevRanks) {
            const nextDeltas = new Map<string, number>();
            nextRanks.forEach((rank, teamId) => {
                const prevRank = prevRanks.get(teamId);
                if (prevRank !== undefined && prevRank !== rank) {
                    nextDeltas.set(teamId, prevRank - rank);
                }
            });
            if (nextDeltas.size > 0) {
                setDeltas(nextDeltas);
                const timer = setTimeout(() => setDeltas(new Map()), 4000);
                prevRanksRef.current = nextRanks;
                return () => clearTimeout(timer);
            }
        }
        prevRanksRef.current = nextRanks;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [standings.map(s => `${s.teamId}:${s.points}`).join(',')]);

    if (standings.length === 0) {
        return <div className="text-center text-muted-foreground py-16">No standings yet.</div>;
    }

    const top3 = standings.slice(0, 3);
    const rest = standings.slice(3);
    const maxPoints = standings[0]?.points || 1;

    return (
        <div className="space-y-4">
            {top3.length > 0 && (
                <div className="flex items-end gap-2 sm:gap-4 px-1 pt-2">
                    {top3[1] ? <PodiumSlot team={top3[1]} rank={2} /> : <div className="flex-1" />}
                    {top3[0] ? <PodiumSlot team={top3[0]} rank={1} /> : <div className="flex-1" />}
                    {top3[2] ? <PodiumSlot team={top3[2]} rank={3} /> : <div className="flex-1" />}
                </div>
            )}

            {rest.length > 0 && (
                <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border/50">
                    {rest.map((team, i) => {
                        const rank = i + 4;
                        const delta = deltas.get(team.teamId);
                        const pct = Math.max(4, Math.round((team.points / maxPoints) * 100));
                        return (
                            <div
                                key={team.teamId}
                                className={`relative p-3.5 flex items-center gap-3 transition-colors ${delta ? 'animate-row-flash' : ''}`}
                            >
                                <span className="w-6 text-center shrink-0 text-sm font-bold text-muted-foreground tabular-nums">
                                    {rank}
                                </span>
                                <div
                                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                                    style={{ backgroundColor: team.color || '#6366f1' }}
                                >
                                    {initials(team.teamName)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-semibold text-white text-sm truncate">{team.teamName}</span>
                                        <div className="flex items-center gap-1 shrink-0">
                                            {delta !== undefined && delta !== 0 && (
                                                <span className={`flex items-center text-[11px] font-bold ${delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {delta > 0 ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                    {Math.abs(delta)}
                                                </span>
                                            )}
                                            <AnimatedPoints value={team.points} className="text-base font-bold tabular-nums text-white" />
                                        </div>
                                    </div>
                                    <div className="mt-1.5 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-700 ease-out"
                                            style={{ width: `${pct}%`, backgroundColor: team.color || '#6366f1' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
