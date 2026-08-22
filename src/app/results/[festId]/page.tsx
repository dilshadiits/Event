'use client';
import { useEffect, useState, use, useCallback, useRef } from 'react';
import { Trophy, Lock, Loader2, RefreshCw } from 'lucide-react';
import PublicStandingsBoard from '@/components/PublicStandingsBoard';

interface Standing {
    teamId: string;
    teamName: string;
    color?: string;
    points: number;
}

function secondsAgoLabel(seconds: number) {
    if (seconds < 2) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
}

export default function PublicStandingsPage({ params }: { params: Promise<{ festId: string }> }) {
    const { festId } = use(params);
    const [festName, setFestName] = useState('');
    const [standings, setStandings] = useState<Standing[]>([]);
    const [loading, setLoading] = useState(true);
    const [notPublic, setNotPublic] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<number | null>(null);
    const [secondsAgo, setSecondsAgo] = useState(0);
    const isFirstLoad = useRef(true);

    const fetchStandings = useCallback(async () => {
        if (!isFirstLoad.current) setRefreshing(true);
        try {
            const res = await fetch(`/api/fests/${festId}/standings`);
            const data = await res.json();
            if (res.ok && data.standings) {
                setStandings(data.standings);
                setFestName(data.fest?.name || '');
                setLastUpdated(Date.now());
            } else {
                setNotPublic(true);
            }
        } catch (err) {
            console.error(err);
            setNotPublic(true);
        } finally {
            setLoading(false);
            setRefreshing(false);
            isFirstLoad.current = false;
        }
    }, [festId]);

    useEffect(() => {
        fetchStandings();
        const interval = setInterval(fetchStandings, 5000);
        return () => clearInterval(interval);
    }, [fetchStandings]);

    useEffect(() => {
        if (!lastUpdated) return;
        const tick = () => setSecondsAgo(Math.floor((Date.now() - lastUpdated) / 1000));
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [lastUpdated]);

    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_120%_60%_at_50%_-10%,rgba(99,102,241,0.18),transparent),radial-gradient(ellipse_100%_50%_at_100%_100%,rgba(249,115,22,0.1),transparent)]">
            <main className="p-4 pb-10 max-w-lg mx-auto space-y-5">
                <div className="sticky top-0 z-10 -mx-4 px-4 pt-4 pb-3 bg-background/80 backdrop-blur-md border-b border-border/60">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 shrink-0 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                            <Trophy className="w-6 h-6 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h1 className="text-lg font-bold text-white leading-tight truncate">
                                {festName || 'Championship Standings'}
                            </h1>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <span className="relative flex h-2 w-2">
                                    <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 animate-live-pulse" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
                                </span>
                                <span className="font-medium text-green-400">LIVE</span>
                                {lastUpdated && <span>· updated {secondsAgoLabel(secondsAgo)}</span>}
                            </div>
                        </div>
                        <RefreshCw className={`w-4 h-4 text-muted-foreground shrink-0 ${refreshing ? 'animate-spin' : ''}`} />
                    </div>
                </div>

                {loading ? (
                    <div className="p-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        Loading standings...
                    </div>
                ) : notPublic ? (
                    <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
                        <Lock className="w-8 h-8" />
                        Results aren&apos;t public yet. Check back soon.
                    </div>
                ) : (
                    <PublicStandingsBoard standings={standings} />
                )}
            </main>
        </div>
    );
}
