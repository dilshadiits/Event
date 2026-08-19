'use client';
import { useEffect, useState, use, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Check, CheckCircle2 } from 'lucide-react';
import ScoreInput from '@/components/ScoreInput';

interface Criterion {
    id: string;
    label: string;
    maxScore: number;
    weight: number;
}

interface WorklistEntry {
    entryId: string;
    chestNumber: string;
    scored: boolean;
    criteriaScores?: Record<string, number>;
}

interface Worklist {
    program: { id: string; name: string; status: string; criteria: Criterion[] };
    entries: WorklistEntry[];
}

export default function JudgeScoreProgramPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [worklist, setWorklist] = useState<Worklist | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
    const [draftScores, setDraftScores] = useState<Record<string, number>>({});
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');

    const fetchWorklist = useCallback(async () => {
        try {
            const res = await fetch(`/api/programs/${id}/judge/entries`);
            const data = await res.json();
            if (data?.program) setWorklist(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchWorklist(); }, [fetchWorklist]);

    const selectEntry = (entry: WorklistEntry) => {
        setActiveEntryId(entry.entryId);
        setDraftScores(entry.criteriaScores || {});
        setMessage('');
    };

    const submitScore = async () => {
        if (!worklist || !activeEntryId) return;
        setSubmitting(true);
        setMessage('');
        const res = await fetch(`/api/programs/${id}/scores`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entryId: activeEntryId, criteriaScores: draftScores }),
        });
        const data = await res.json();
        if (res.ok) {
            setMessage('Score submitted.');
            fetchWorklist();
        } else {
            setMessage(data.error || 'Failed to submit score');
        }
        setSubmitting(false);
    };

    if (loading || !worklist) {
        return (
            <main className="min-h-screen flex items-center justify-center text-muted-foreground gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading...
            </main>
        );
    }

    const activeEntry = worklist.entries.find(e => e.entryId === activeEntryId);
    const allScored = worklist.program.criteria.every(c => draftScores[c.id] !== undefined);
    const locked = worklist.program.status === 'judging-closed' || worklist.program.status === 'results-published';

    return (
        <main className="min-h-screen p-4 md:p-8 max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/judge" className="p-2 hover:bg-muted rounded-lg transition-colors -ml-2">
                    <ArrowLeft className="w-6 h-6 text-muted-foreground" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-white">{worklist.program.name}</h1>
                    <p className="text-sm text-muted-foreground">
                        {worklist.entries.filter(e => e.scored).length}/{worklist.entries.length} scored
                    </p>
                </div>
            </div>

            {locked && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 text-sm text-orange-400">
                    Judging is closed for this program. Scores can no longer be changed.
                </div>
            )}

            <div className="flex flex-wrap gap-2">
                {worklist.entries.map(entry => (
                    <button
                        key={entry.entryId}
                        onClick={() => selectEntry(entry)}
                        className={`w-14 h-14 rounded-xl font-bold text-lg flex items-center justify-center border transition-all relative ${activeEntryId === entry.entryId
                            ? 'bg-orange-600 text-white border-orange-600'
                            : entry.scored
                                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                : 'bg-muted/50 text-muted-foreground border-border'
                            }`}
                    >
                        {entry.chestNumber}
                        {entry.scored && activeEntryId !== entry.entryId && (
                            <CheckCircle2 className="w-3.5 h-3.5 absolute -top-1 -right-1 text-green-400 bg-background rounded-full" />
                        )}
                    </button>
                ))}
            </div>

            {activeEntry && (
                <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                    <h2 className="text-lg font-bold text-white">Chest #{activeEntry.chestNumber}</h2>
                    {worklist.program.criteria.map(criterion => (
                        <ScoreInput
                            key={criterion.id}
                            criterion={criterion}
                            value={draftScores[criterion.id]}
                            onChange={(v) => setDraftScores(prev => ({ ...prev, [criterion.id]: v }))}
                        />
                    ))}

                    {message && <p className="text-sm text-orange-400">{message}</p>}

                    <button
                        onClick={submitScore}
                        disabled={!allScored || submitting || locked}
                        className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white py-3 rounded-lg font-bold transition-all"
                    >
                        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                        Submit Score
                    </button>
                </div>
            )}
        </main>
    );
}
