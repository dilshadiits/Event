'use client';
import { Plus, Trash2 } from 'lucide-react';

export interface Criterion {
    id: string;
    label: string;
    maxScore: number;
    weight: number;
}

interface CriteriaBuilderProps {
    criteria: Criterion[];
    onChange: (criteria: Criterion[]) => void;
}

export default function CriteriaBuilder({ criteria, onChange }: CriteriaBuilderProps) {
    const addCriterion = () => {
        onChange([...criteria, { id: `c_${Date.now()}`, label: '', maxScore: 10, weight: 1 }]);
    };

    const updateCriterion = (id: string, patch: Partial<Criterion>) => {
        onChange(criteria.map(c => c.id === id ? { ...c, ...patch } : c));
    };

    const removeCriterion = (id: string) => {
        onChange(criteria.filter(c => c.id !== id));
    };

    return (
        <div className="space-y-3">
            {criteria.map(c => (
                <div key={c.id} className="flex flex-wrap gap-2 items-end bg-muted/30 border border-border rounded-lg p-3">
                    <div className="flex-1 min-w-[140px]">
                        <label className="text-xs text-muted-foreground mb-1 block">Criterion</label>
                        <input
                            type="text"
                            value={c.label}
                            onChange={(e) => updateCriterion(c.id, { label: e.target.value })}
                            placeholder="e.g. Content"
                            className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-pink-500"
                        />
                    </div>
                    <div className="w-24">
                        <label className="text-xs text-muted-foreground mb-1 block">Max score</label>
                        <input
                            type="number"
                            min={1}
                            value={c.maxScore}
                            onChange={(e) => updateCriterion(c.id, { maxScore: Number(e.target.value) })}
                            className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-pink-500"
                        />
                    </div>
                    <div className="w-24">
                        <label className="text-xs text-muted-foreground mb-1 block">Weight</label>
                        <input
                            type="number"
                            min={0.1}
                            step={0.1}
                            value={c.weight}
                            onChange={(e) => updateCriterion(c.id, { weight: Number(e.target.value) })}
                            className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-pink-500"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => removeCriterion(c.id)}
                        className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ))}
            <button
                type="button"
                onClick={addCriterion}
                className="flex items-center gap-2 text-pink-400 hover:text-pink-300 text-sm font-medium"
            >
                <Plus className="w-4 h-4" /> Add criterion
            </button>
        </div>
    );
}
