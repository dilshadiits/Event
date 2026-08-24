'use client';
import { useEffect, useState, use, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Loader2, ListChecks, MapPin, Calendar } from 'lucide-react';
import CriteriaBuilder, { Criterion } from '@/components/CriteriaBuilder';

interface Program {
    id: string;
    name: string;
    type: 'solo' | 'team';
    mode: 'stage' | 'off-stage';
    category?: string;
    venue?: string;
    scheduledAt?: string;
    status: string;
    criteriaCount: number;
    judgeCount: number;
    posterUrl?: string;
}

const STATUS_STYLES: Record<string, string> = {
    scheduled: 'bg-white/5 text-muted-foreground',
    'chest-numbers-shuffled': 'bg-blue-500/20 text-blue-400',
    'in-progress': 'bg-yellow-500/20 text-yellow-400',
    'judging-closed': 'bg-orange-500/20 text-orange-400',
    'results-published': 'bg-green-500/20 text-green-400',
};

export default function ProgramsPage({ params }: { params: Promise<{ festId: string }> }) {
    const { festId } = use(params);
    const [programs, setPrograms] = useState<Program[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [name, setName] = useState('');
    const [type, setType] = useState<'solo' | 'team'>('solo');
    const [mode, setMode] = useState<'stage' | 'off-stage'>('stage');
    const [venue, setVenue] = useState('');
    const [scheduledAt, setScheduledAt] = useState('');
    const [criteria, setCriteria] = useState<Criterion[]>([{ id: 'c_1', label: 'Overall', maxScore: 10, weight: 1 }]);

    const fetchPrograms = useCallback(async () => {
        try {
            const res = await fetch(`/api/programs?festId=${festId}`);
            const data = await res.json();
            if (Array.isArray(data)) setPrograms(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [festId]);

    useEffect(() => { fetchPrograms(); }, [fetchPrograms]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        const res = await fetch('/api/programs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                festId, name, type, mode, venue,
                scheduledAt: scheduledAt || undefined,
                criteria: criteria.filter(c => c.label.trim()),
            }),
        });
        const data = await res.json();
        if (res.ok) {
            setName('');
            setVenue('');
            setScheduledAt('');
            setCriteria([{ id: 'c_1', label: 'Overall', maxScore: 10, weight: 1 }]);
            setShowForm(false);
            fetchPrograms();
        } else {
            setError(data.error || 'Failed to create program');
        }
        setSaving(false);
    };

    return (
        <main className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href={`/admin/competitions/${festId}`} className="p-2 hover:bg-muted rounded-lg transition-colors -ml-2">
                        <ArrowLeft className="w-6 h-6 text-muted-foreground" />
                    </Link>
                    <h1 className="text-2xl font-bold text-white">Programs</h1>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className={`flex items-center gap-2 ${showForm ? 'bg-pink-600 text-white' : 'bg-pink-600/20 text-pink-400'} hover:bg-pink-600/40 px-4 py-2 rounded-lg text-sm font-medium transition-all border border-pink-500/30`}
                >
                    <Plus className="w-4 h-4" /> New Program
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleCreate} className="bg-card border border-border rounded-xl p-6 space-y-4 animate-in slide-in-from-top-2">
                    <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground mb-1 block">Program name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-pink-500"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground mb-1 block">Venue</label>
                            <input
                                type="text"
                                value={venue}
                                onChange={(e) => setVenue(e.target.value)}
                                className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-pink-500"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground mb-1 block">Type</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value as 'solo' | 'team')}
                                className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-pink-500"
                            >
                                <option value="solo" className="bg-black">Solo</option>
                                <option value="team" className="bg-black">Team</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground mb-1 block">Mode</label>
                            <select
                                value={mode}
                                onChange={(e) => setMode(e.target.value as 'stage' | 'off-stage')}
                                className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-pink-500"
                            >
                                <option value="stage" className="bg-black">Stage</option>
                                <option value="off-stage" className="bg-black">Off-stage</option>
                            </select>
                        </div>
                        <div className="sm:col-span-2">
                            <label className="text-sm font-medium text-muted-foreground mb-1 block">Scheduled at</label>
                            <input
                                type="datetime-local"
                                value={scheduledAt}
                                onChange={(e) => setScheduledAt(e.target.value)}
                                className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-pink-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-muted-foreground mb-2 block">Judging criteria</label>
                        <CriteriaBuilder criteria={criteria} onChange={setCriteria} />
                    </div>

                    {error && <p className="text-red-400 text-sm">{error}</p>}

                    <button
                        type="submit"
                        disabled={!name || criteria.filter(c => c.label.trim()).length === 0 || saving}
                        className="w-full flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white py-3 rounded-lg font-bold transition-all"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Program'}
                    </button>
                </form>
            )}

            <div className="bg-card border border-border rounded-xl overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-muted-foreground">Loading...</div>
                ) : programs.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">No programs yet.</div>
                ) : (
                    <div className="divide-y divide-border/50">
                        {programs.map(p => (
                            <Link
                                key={p.id}
                                href={`/admin/competitions/${festId}/programs/${p.id}`}
                                className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    {p.posterUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={p.posterUrl} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                                    ) : (
                                        <div className="w-9 h-9 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0">
                                            <ListChecks className="w-4 h-4" />
                                        </div>
                                    )}
                                    <div>
                                        <div className="font-bold text-white">{p.name}</div>
                                        <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                                            <span className="capitalize">{p.type} &middot; {p.mode}</span>
                                            {p.venue && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{p.venue}</span>}
                                            {p.scheduledAt && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(p.scheduledAt).toLocaleString()}</span>}
                                        </div>
                                    </div>
                                </div>
                                <span className={`text-xs px-2.5 py-1 rounded-full ${STATUS_STYLES[p.status] || STATUS_STYLES.scheduled}`}>
                                    {p.status.replace(/-/g, ' ')}
                                </span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
