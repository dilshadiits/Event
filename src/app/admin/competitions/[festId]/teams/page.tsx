'use client';
import { useEffect, useState, use, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Loader2, Users } from 'lucide-react';

interface Team {
    id: string;
    name: string;
    code?: string;
    color?: string;
}

export default function TeamsPage({ params }: { params: Promise<{ festId: string }> }) {
    const { festId } = use(params);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [color, setColor] = useState('#6366f1');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const fetchTeams = useCallback(async () => {
        try {
            const res = await fetch(`/api/teams?festId=${festId}`);
            const data = await res.json();
            if (Array.isArray(data)) setTeams(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [festId]);

    useEffect(() => { fetchTeams(); }, [fetchTeams]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        const res = await fetch('/api/teams', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ festId, name, code, color }),
        });
        const data = await res.json();
        if (res.ok) {
            setName('');
            setCode('');
            fetchTeams();
        } else {
            setError(data.error || 'Failed to create team');
        }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this team?')) return;
        const res = await fetch(`/api/teams/${id}`, { method: 'DELETE' });
        if (res.ok) fetchTeams();
        else {
            const data = await res.json();
            alert(data.error || 'Failed to delete team');
        }
    };

    return (
        <main className="min-h-screen p-4 md:p-8 max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href={`/admin/competitions/${festId}`} className="p-2 hover:bg-muted rounded-lg transition-colors -ml-2">
                    <ArrowLeft className="w-6 h-6 text-muted-foreground" />
                </Link>
                <h1 className="text-2xl font-bold text-white">Teams {!loading && <span className="text-muted-foreground font-normal">({teams.length})</span>}</h1>
            </div>

            <form onSubmit={handleAdd} className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add a team</p>
                <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-40">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="w-28">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Code</label>
                    <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Color</label>
                    <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-10 h-10 rounded-lg border border-border bg-muted/50 cursor-pointer"
                    />
                </div>
                <button
                    type="submit"
                    disabled={!name || saving}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Add Team
                </button>
                </div>
            </form>
            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="bg-card border border-border rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-muted-foreground">Loading...</div>
                ) : teams.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">No teams yet.</div>
                ) : (
                    <div className="divide-y divide-border/50">
                        {teams.map(team => (
                            <div key={team.id} className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                                        style={{ backgroundColor: team.color || '#6366f1' }}
                                    >
                                        <Users className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-white">{team.name}</div>
                                        {team.code && <div className="text-xs text-muted-foreground">{team.code}</div>}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(team.id)}
                                    className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
