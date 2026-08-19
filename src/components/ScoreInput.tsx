'use client';
import { Minus, Plus } from 'lucide-react';

interface Criterion {
    id: string;
    label: string;
    maxScore: number;
    weight: number;
}

interface ScoreInputProps {
    criterion: Criterion;
    value: number | undefined;
    onChange: (value: number) => void;
}

// Touch-friendly per-criterion scoring input for judges scoring live on a phone/tablet.
// Criteria with a small max score (<=10, the common case) get one-tap number buttons;
// larger scales fall back to a +/- stepper so the row doesn't overflow.
export default function ScoreInput({ criterion, value, onChange }: ScoreInputProps) {
    const clamp = (v: number) => Math.max(0, Math.min(criterion.maxScore, v));

    return (
        <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
                <span className="font-medium text-white">{criterion.label}</span>
                <span className="text-2xl font-bold text-orange-400 tabular-nums">
                    {value ?? '—'}<span className="text-sm text-muted-foreground">/{criterion.maxScore}</span>
                </span>
            </div>

            {criterion.maxScore <= 10 ? (
                <div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5">
                    {Array.from({ length: criterion.maxScore + 1 }, (_, n) => n).map(n => (
                        <button
                            key={n}
                            type="button"
                            onClick={() => onChange(n)}
                            className={`h-11 rounded-lg text-sm font-bold transition-all ${value === n
                                ? 'bg-orange-600 text-white'
                                : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                                }`}
                        >
                            {n}
                        </button>
                    ))}
                </div>
            ) : (
                <div className="flex items-center justify-center gap-4">
                    <button
                        type="button"
                        onClick={() => onChange(clamp((value ?? 0) - 1))}
                        className="w-11 h-11 flex items-center justify-center rounded-full bg-muted/60 text-white hover:bg-muted transition-all"
                    >
                        <Minus className="w-5 h-5" />
                    </button>
                    <input
                        type="number"
                        min={0}
                        max={criterion.maxScore}
                        value={value ?? ''}
                        onChange={(e) => onChange(clamp(Number(e.target.value)))}
                        className="w-20 h-11 text-center bg-muted/50 border border-border rounded-lg text-white text-lg font-bold outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <button
                        type="button"
                        onClick={() => onChange(clamp((value ?? 0) + 1))}
                        className="w-11 h-11 flex items-center justify-center rounded-full bg-muted/60 text-white hover:bg-muted transition-all"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
    );
}
