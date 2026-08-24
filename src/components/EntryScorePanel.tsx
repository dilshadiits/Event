'use client';
import { useEffect, useState } from 'react';
import { Loader2, Pencil, Check, X } from 'lucide-react';

interface Criterion {
    id: string;
    label: string;
    maxScore: number;
    weight: number;
}

interface JudgeScore {
    judgeId: string;
    judgeName: string;
    criteriaScores: Record<string, number>;
    total: number;
    submittedAt: string;
}

interface EntryScoreData {
    criteria: Criterion[];
    entryTotalScore?: number;
    scores: JudgeScore[];
}

export default function EntryScorePanel({ programId, entryId, onChanged }: { programId: string; entryId: string; onChanged?: () => void }) {
    const [data, setData] = useState<EntryScoreData | null>(null);
    const [loading, setLoading] = useState(true);
    const [editingJudgeId, setEditingJudgeId] = useState<string | null>(null);
    const [editValues, setEditValues] = useState<Record<string, number>>({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const fetchScores = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/programs/${programId}/entries/${entryId}`);
            const json = await res.json();
            if (res.ok) setData(json);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchScores(); }, [programId, entryId]); // eslint-disable-line react-hooks/exhaustive-deps

    const startEdit = (score: JudgeScore) => {
        setEditingJudgeId(score.judgeId);
        setEditValues({ ...score.criteriaScores });
        setError('');
    };

    const saveEdit = async (judgeId: string) => {
        setSaving(true);
        setError('');
        const res = await fetch(`/api/programs/${programId}/scores`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entryId, judgeId, criteriaScores: editValues }),
        });
        const json = await res.json();
        if (res.ok) {
            setEditingJudgeId(null);
            await fetchScores();
            onChanged?.();
        } else {
            setError(json.error || 'Failed to save score');
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <div className="px-4 py-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading scores...
            </div>
        );
    }

    if (!data || data.scores.length === 0) {
        return (
            <div className="px-4 py-4 text-sm text-muted-foreground">
                No judge has scored this entry yet.
            </div>
        );
    }

    return (
        <div className="px-4 py-3 space-y-3 bg-black/20">
            {data.entryTotalScore !== undefined && data.entryTotalScore !== null && (
                <p className="text-xs text-muted-foreground">
                    Averaged total: <span className="font-bold text-white">{data.entryTotalScore.toFixed(2)}</span> across {data.scores.length} judge{data.scores.length > 1 ? 's' : ''}
                </p>
            )}
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="space-y-2">
                {data.scores.map(score => {
                    const isEditing = editingJudgeId === score.judgeId;
                    return (
                        <div key={score.judgeId} className="bg-card border border-border rounded-lg p-3">
                            <div className="flex items-center justify-between gap-2">
                                <span className="font-medium text-white text-sm">{score.judgeName}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold tabular-nums text-cyan-400">{score.total.toFixed(2)}</span>
                                    {isEditing ? (
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => saveEdit(score.judgeId)}
                                                disabled={saving}
                                                className="p-1.5 text-green-400 hover:bg-green-500/10 rounded-md transition-colors disabled:opacity-50"
                                                title="Save"
                                            >
                                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                            </button>
                                            <button
                                                onClick={() => setEditingJudgeId(null)}
                                                disabled={saving}
                                                className="p-1.5 text-muted-foreground hover:bg-white/10 rounded-md transition-colors"
                                                title="Cancel"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => startEdit(score)}
                                            className="p-1.5 text-muted-foreground hover:text-cyan-400 hover:bg-cyan-500/10 rounded-md transition-colors"
                                            title="Edit this judge's score"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {data.criteria.map(c => (
                                    <div key={c.id} className="flex items-center gap-1.5 text-xs bg-muted/40 rounded-md px-2 py-1">
                                        <span className="text-muted-foreground">{c.label}</span>
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                min={0}
                                                max={c.maxScore}
                                                value={editValues[c.id] ?? 0}
                                                onChange={e => setEditValues(v => ({ ...v, [c.id]: Math.max(0, Math.min(c.maxScore, Number(e.target.value))) }))}
                                                className="w-12 bg-muted border border-border rounded px-1 py-0.5 text-white text-xs outline-none focus:ring-1 focus:ring-cyan-500"
                                            />
                                        ) : (
                                            <span className="font-semibold text-white">{score.criteriaScores[c.id] ?? 0}</span>
                                        )}
                                        <span className="text-muted-foreground/60">/{c.maxScore}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
