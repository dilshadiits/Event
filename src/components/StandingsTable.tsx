'use client';
import { Crown, Medal } from 'lucide-react';

interface StandingRow {
    teamId: string;
    teamName: string;
    color?: string;
    points: number;
}

interface StandingsTableProps {
    standings: StandingRow[];
}

export default function StandingsTable({ standings }: StandingsTableProps) {
    if (standings.length === 0) {
        return <div className="text-center text-muted-foreground py-12">No standings yet.</div>;
    }

    return (
        <div className="divide-y divide-border/50">
            {standings.map((team, idx) => (
                <div key={team.teamId} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 text-center shrink-0">
                            {idx === 0 ? <Crown className="w-5 h-5 text-yellow-400 mx-auto" /> :
                                idx === 1 ? <Medal className="w-5 h-5 text-gray-300 mx-auto" /> :
                                    idx === 2 ? <Medal className="w-5 h-5 text-amber-600 mx-auto" /> :
                                        <span className="text-muted-foreground font-bold">{idx + 1}</span>}
                        </div>
                        <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                            style={{ backgroundColor: team.color || '#6366f1' }}
                        >
                            {team.teamName.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-white">{team.teamName}</span>
                    </div>
                    <span className="text-xl font-bold text-white tabular-nums">{team.points}</span>
                </div>
            ))}
        </div>
    );
}
