'use client';
import { useEffect, useState, use, useCallback } from 'react';
import { Trophy, Lock, Loader2 } from 'lucide-react';
import StandingsTable from '@/components/StandingsTable';

interface Standing {
    teamId: string;
    teamName: string;
    color?: string;
    points: number;
}

export default function PublicStandingsPage({ params }: { params: Promise<{ festId: string }> }) {
    const { festId } = use(params);
    const [festName, setFestName] = useState('');
    const [standings, setStandings] = useState<Standing[]>([]);
    const [loading, setLoading] = useState(true);
    const [notPublic, setNotPublic] = useState(false);

    const fetchStandings = useCallback(async () => {
        try {
            const res = await fetch(`/api/fests/${festId}/standings`);
            const data = await res.json();
            if (res.ok && data.standings) {
                setStandings(data.standings);
                setFestName(data.fest?.name || '');
            } else {
                setNotPublic(true);
            }
        } catch (err) {
            console.error(err);
            setNotPublic(true);
        } finally {
            setLoading(false);
        }
    }, [festId]);

    useEffect(() => {
        fetchStandings();
        const interval = setInterval(fetchStandings, 5000);
        return () => clearInterval(interval);
    }, [fetchStandings]);

    return (
        <main className="min-h-screen p-4 md:p-8 max-w-2xl mx-auto space-y-6">
            <div className="flex flex-col items-center text-center gap-3 py-4">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center">
                    <Trophy className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">{festName || 'Championship Standings'}</h1>
            </div>

            {loading ? (
                <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> Loading...
                </div>
            ) : notPublic ? (
                <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
                    <Lock className="w-8 h-8" />
                    Results aren&apos;t public yet. Check back soon.
                </div>
            ) : (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <StandingsTable standings={standings} />
                </div>
            )}
        </main>
    );
}
