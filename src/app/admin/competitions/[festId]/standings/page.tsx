'use client';
import { useEffect, useState, use, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, RefreshCw, Globe, Copy, Check, QrCode } from 'lucide-react';
import StandingsTable from '@/components/StandingsTable';
import StandingsQRModal from '@/components/StandingsQRModal';

interface Standing {
    teamId: string;
    teamName: string;
    color?: string;
    points: number;
}

interface ProgramBreakdown {
    programId: string;
    programName: string;
    official: boolean;
}

export default function AdminStandingsPage({ params }: { params: Promise<{ festId: string }> }) {
    const { festId } = use(params);
    const [standings, setStandings] = useState<Standing[]>([]);
    const [programs, setPrograms] = useState<ProgramBreakdown[]>([]);
    const [resultsArePublic, setResultsArePublic] = useState(false);
    const [festName, setFestName] = useState('');
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [togglingPublic, setTogglingPublic] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showQR, setShowQR] = useState(false);

    const fetchStandings = useCallback(async (showRefresh = false) => {
        if (showRefresh) setIsRefreshing(true);
        try {
            const res = await fetch(`/api/fests/${festId}/standings?admin=true`);
            const data = await res.json();
            if (data?.standings) {
                setStandings(data.standings);
                setPrograms(data.programs || []);
                setResultsArePublic(!!data.fest?.resultsArePublic);
                setFestName(data.fest?.name || '');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [festId]);

    useEffect(() => {
        fetchStandings();
        const interval = setInterval(() => fetchStandings(), 5000);
        return () => clearInterval(interval);
    }, [fetchStandings]);

    const togglePublic = async () => {
        setTogglingPublic(true);
        const res = await fetch(`/api/fests/${festId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resultsArePublic: !resultsArePublic }),
        });
        if (res.ok) fetchStandings();
        setTogglingPublic(false);
    };

    const copyPublicLink = () => {
        const url = `${window.location.origin}/results/${festId}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <main className="min-h-screen p-4 md:p-8 max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href={`/admin/competitions/${festId}`} className="p-2 hover:bg-muted rounded-lg transition-colors -ml-2">
                    <ArrowLeft className="w-6 h-6 text-muted-foreground" />
                </Link>
                <h1 className="text-2xl font-bold text-white">Championship Standings</h1>
            </div>

            <div className="flex flex-wrap gap-2">
                <button
                    onClick={togglePublic}
                    disabled={togglingPublic}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border disabled:opacity-50 ${resultsArePublic
                        ? 'bg-green-600/20 text-green-400 border-green-500/30'
                        : 'bg-muted/50 text-muted-foreground border-border'
                        }`}
                >
                    <Globe className="w-4 h-4" />
                    {resultsArePublic ? 'Results are Public' : 'Results are Private'}
                </button>
                <button
                    onClick={copyPublicLink}
                    className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 px-4 py-2 rounded-lg text-sm font-medium transition-all border border-blue-500/30"
                >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy Public Link'}
                </button>
                <button
                    onClick={() => setShowQR(true)}
                    className="flex items-center gap-2 bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 px-4 py-2 rounded-lg text-sm font-medium transition-all border border-purple-500/30"
                >
                    <QrCode className="w-4 h-4" />
                    Show QR
                </button>
                <button
                    onClick={() => fetchStandings(true)}
                    className="flex items-center gap-2 bg-muted/50 hover:bg-muted text-muted-foreground px-4 py-2 rounded-lg text-sm font-medium transition-all border border-border ml-auto"
                >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Live
                </button>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" /> Loading...
                    </div>
                ) : (
                    <StandingsTable standings={standings} />
                )}
            </div>

            {programs.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-4">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Programs contributing to standings</p>
                    <div className="flex flex-wrap gap-2">
                        {programs.map(p => (
                            <span
                                key={p.programId}
                                className={`text-xs px-2.5 py-1 rounded-full ${p.official ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}
                                title={p.official ? 'Officially published' : 'Live preview — not yet published'}
                            >
                                {p.programName} {p.official ? '' : '(preview)'}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <StandingsQRModal
                url={typeof window !== 'undefined' ? `${window.location.origin}/results/${festId}` : `/results/${festId}`}
                title={festName}
                isOpen={showQR}
                onClose={() => setShowQR(false)}
                resultsArePublic={resultsArePublic}
            />
        </main>
    );
}
