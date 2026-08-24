'use client';
import { useEffect, useState, use, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Loader2, Upload, UserSquare2, KeyRound, Check, RotateCcw } from 'lucide-react';

interface Team {
    id: string;
    name: string;
}

interface Participant {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    teamId?: string;
    teamName?: string;
    hasLogin?: boolean;
    username?: string;
}

export default function ParticipantsPage({ params }: { params: Promise<{ festId: string }> }) {
    const { festId } = use(params);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [teamId, setTeamId] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState('');
    const [provisioningId, setProvisioningId] = useState<string | null>(null);
    const [resettingId, setResettingId] = useState<string | null>(null);
    const [credentialMessage, setCredentialMessage] = useState('');

    const fetchData = useCallback(async () => {
        try {
            const [pRes, tRes] = await Promise.all([
                fetch(`/api/participants?festId=${festId}`),
                fetch(`/api/teams?festId=${festId}`),
            ]);
            const [participantsData, teamsData] = await Promise.all([pRes.json(), tRes.json()]);
            if (Array.isArray(participantsData)) setParticipants(participantsData);
            if (Array.isArray(teamsData)) setTeams(teamsData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [festId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        const res = await fetch('/api/participants', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ festId, name, phone, teamId: teamId || undefined }),
        });
        const data = await res.json();
        if (res.ok) {
            setName('');
            setPhone('');
            fetchData();
        } else {
            setError(data.error || 'Failed to add participant');
        }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this participant?')) return;
        const res = await fetch(`/api/participants/${id}`, { method: 'DELETE' });
        if (res.ok) fetchData();
        else {
            const data = await res.json();
            alert(data.error || 'Failed to delete participant');
        }
    };

    const provisionLogin = async (id: string) => {
        setProvisioningId(id);
        setCredentialMessage('');
        const res = await fetch(`/api/participants/${id}/provision-login`, { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
            if (data.username) {
                setCredentialMessage(`Username: ${data.username} · Password: their phone number`);
            }
            fetchData();
        } else {
            alert(data.error || 'Failed to enable login');
        }
        setProvisioningId(null);
    };

    const resetPassword = async (id: string) => {
        if (!confirm('Reset this student\'s password back to their phone number?')) return;
        setResettingId(id);
        setCredentialMessage('');
        const res = await fetch(`/api/participants/${id}/reset-password`, { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
            setCredentialMessage('Password reset to their phone number.');
        } else {
            alert(data.error || 'Failed to reset password');
        }
        setResettingId(null);
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImporting(true);
        setImportResult('');
        const formData = new FormData();
        formData.append('festId', festId);
        formData.append('file', file);
        const res = await fetch('/api/participants/bulk-import', { method: 'POST', body: formData });
        const data = await res.json();
        setImportResult(res.ok ? data.message : (data.error || 'Import failed'));
        if (res.ok) fetchData();
        setImporting(false);
        e.target.value = '';
    };

    return (
        <main className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href={`/admin/competitions/${festId}`} className="p-2 hover:bg-muted rounded-lg transition-colors -ml-2">
                    <ArrowLeft className="w-6 h-6 text-muted-foreground" />
                </Link>
                <h1 className="text-2xl font-bold text-white">Participants {!loading && <span className="text-muted-foreground font-normal">({participants.length})</span>}</h1>
            </div>

            <div className="flex flex-wrap gap-3">
                <form onSubmit={handleAdd} className="flex-1 min-w-70 bg-card border border-border rounded-2xl p-4 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add a participant</p>
                    <div className="flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-35">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>
                    <div className="w-36">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Phone</label>
                        <input
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>
                    <div className="w-40">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Team</label>
                        <select
                            value={teamId}
                            onChange={(e) => setTeamId(e.target.value)}
                            className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="" className="bg-black">No team</option>
                            {teams.map(t => <option key={t.id} value={t.id} className="bg-black">{t.name}</option>)}
                        </select>
                    </div>
                    <button
                        type="submit"
                        disabled={!name || saving}
                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Add
                    </button>
                    </div>
                </form>

                <div className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-center gap-1">
                    <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" id="bulkImport" disabled={importing} />
                    <label
                        htmlFor="bulkImport"
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer text-sm font-medium transition-colors ${importing ? 'bg-muted text-muted-foreground' : 'bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 border border-purple-500/30'}`}
                    >
                        {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        Bulk Import (Excel)
                    </label>
                    <p className="text-xs text-muted-foreground">Columns: Name, Phone (required — becomes their login password), Team, Email</p>
                </div>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            {importResult && <p className="text-sm text-purple-400">{importResult}</p>}
            {credentialMessage && <p className="text-sm text-blue-400">{credentialMessage}</p>}

            <div className="bg-card border border-border rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-muted-foreground">Loading...</div>
                ) : participants.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">No participants yet.</div>
                ) : (
                    <div className="divide-y divide-border/50">
                        {participants.map(p => (
                            <div key={p.id} className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center">
                                        <UserSquare2 className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-white">{p.name}</div>
                                        <div className="text-xs text-muted-foreground flex gap-2">
                                            {p.phone && <span>{p.phone}</span>}
                                            {p.teamName && (
                                                <span className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">{p.teamName}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {p.hasLogin ? (
                                        <>
                                            <span className="flex items-center gap-1 text-xs text-green-400 px-2 py-1">
                                                <Check className="w-3 h-3" /> {p.username ? `@${p.username}` : 'Login enabled'}
                                            </span>
                                            <button
                                                onClick={() => resetPassword(p.id)}
                                                disabled={resettingId === p.id}
                                                title="Reset password to their phone number"
                                                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-white bg-muted/50 hover:bg-muted disabled:opacity-40 px-3 py-1.5 rounded-lg border border-border transition-all"
                                            >
                                                {resettingId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                                                Reset Password
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => provisionLogin(p.id)}
                                            disabled={!p.phone || provisioningId === p.id}
                                            title={p.phone ? 'Enable student portal login' : 'Add a phone number first'}
                                            className="flex items-center gap-1.5 text-xs font-medium text-blue-400 bg-blue-600/20 hover:bg-blue-600/40 disabled:opacity-40 px-3 py-1.5 rounded-lg border border-blue-500/30 transition-all"
                                        >
                                            {provisioningId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                                            Enable Login
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(p.id)}
                                        className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
