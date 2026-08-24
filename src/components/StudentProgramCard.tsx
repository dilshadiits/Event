'use client';
import { Calendar, MapPin, CheckCircle2, Mic2, Users, Crown, Medal } from 'lucide-react';
import { posterGradient } from '@/lib/posterGradient';

export interface StudentProgram {
    entryId: string;
    programId: string;
    programName: string;
    type: string;
    mode: string;
    scheduledAt?: string;
    venue?: string;
    status: string;
    posterUrl?: string;
    chestNumber?: string;
    checkedIn: boolean;
    disqualified: boolean;
    rank?: number;
}

const STATUS_LABEL: Record<string, string> = {
    scheduled: 'Upcoming',
    'chest-numbers-shuffled': 'Ready',
    'in-progress': 'Judging Now',
    'judging-closed': 'Judging Closed',
    'results-published': 'Results Out',
};

function RankBadge({ rank }: { rank: number }) {
    if (rank === 1) return <Crown className="w-4 h-4 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-4 h-4 text-slate-300" />;
    if (rank === 3) return <Medal className="w-4 h-4 text-amber-600" />;
    return <span className="text-xs font-bold text-white">#{rank}</span>;
}

export default function StudentProgramCard({ program }: { program: StudentProgram }) {
    const p = program;
    const isLive = p.status === 'in-progress';

    return (
        <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-card/60 backdrop-blur transition-all hover:border-white/20">
            <div className="relative aspect-video w-full overflow-hidden">
                {p.posterUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={p.posterUrl}
                        alt={p.programName}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${posterGradient(p.programId)} flex items-center justify-center`}>
                        {p.type === 'team' ? (
                            <Users className="w-10 h-10 text-white/70" />
                        ) : (
                            <Mic2 className="w-10 h-10 text-white/70" />
                        )}
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />

                {isLive && (
                    <span className="absolute top-3 left-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-white bg-red-600/90 px-2.5 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-live-pulse" />
                        Live
                    </span>
                )}
                {!isLive && (
                    <span className="absolute top-3 left-3 text-[11px] font-medium text-white/90 bg-black/50 backdrop-blur px-2.5 py-1 rounded-full">
                        {STATUS_LABEL[p.status] || p.status}
                    </span>
                )}

                {p.chestNumber && (
                    <span className="absolute top-3 right-3 text-xs font-bold text-white bg-white/15 backdrop-blur border border-white/20 px-2.5 py-1 rounded-full">
                        #{p.chestNumber}
                    </span>
                )}

                <div className="absolute bottom-0 left-0 right-0 p-3.5">
                    <div className="flex items-center gap-2">
                        {p.rank && <RankBadge rank={p.rank} />}
                        <h3 className="font-bold text-white text-base leading-tight truncate">{p.programName}</h3>
                    </div>
                    <p className="text-xs text-white/60 capitalize mt-0.5">{p.type} &middot; {p.mode}</p>
                </div>
            </div>

            {(p.scheduledAt || p.venue || p.checkedIn || p.disqualified) && (
                <div className="px-3.5 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground border-t border-white/5">
                    {p.scheduledAt && (
                        <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(p.scheduledAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </span>
                    )}
                    {p.venue && (
                        <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5" />
                            {p.venue}
                        </span>
                    )}
                    {p.checkedIn && (
                        <span className="flex items-center gap-1.5 text-green-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Checked in
                        </span>
                    )}
                    {p.disqualified && (
                        <span className="text-red-400 font-medium">Disqualified</span>
                    )}
                </div>
            )}
        </div>
    );
}
