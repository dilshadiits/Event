'use client';
import { useEffect, useState, use, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Plus, Loader2, Gavel, ShieldCheck } from 'lucide-react';

interface Member {
    id: string;
    name: string;
    email?: string;
    role: string;
    isActive: boolean;
}

export default function JudgesPage({ params }: { params: Promise<{ festId: string }> }) {
    const { festId } = use(params);
    const { data: session } = useSession();
    const isSuperAdmin = session?.user?.role === 'super-admin';

    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'judge' | 'event-admin'>('judge');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const fetchMembers = useCallback(async () => {
        try {
            const res = await fetch(`/api/users?festId=${festId}`);
            const data = await res.json();
            if (Array.isArray(data)) setMembers(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [festId]);

    useEffect(() => { fetchMembers(); }, [fetchMembers]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        const res = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, role, festIds: [festId] }),
        });
        const data = await res.json();
        if (res.ok) {
            setName('');
            setEmail('');
            setPassword('');
            fetchMembers();
        } else {
            setError(data.error || 'Failed to create account');
        }
        setSaving(false);
    };

    return (
        <main className="min-h-screen p-4 md:p-8 max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href={`/admin/competitions/${festId}`} className="p-2 hover:bg-muted rounded-lg transition-colors -ml-2">
                    <ArrowLeft className="w-6 h-6 text-muted-foreground" />
                </Link>
                <h1 className="text-2xl font-bold text-white">Judges &amp; Admins {!loading && <span className="text-muted-foreground font-normal">({members.length})</span>}</h1>
            </div>

            <form onSubmit={handleAdd} className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-white">Add account</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1 block">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-orange-500"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1 block">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-orange-500"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1 block">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            minLength={8}
                            required
                            className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-orange-500"
                        />
                    </div>
                    {isSuperAdmin && (
                        <div>
                            <label className="text-sm font-medium text-muted-foreground mb-1 block">Role</label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value as 'judge' | 'event-admin')}
                                className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-orange-500"
                            >
                                <option value="judge" className="bg-black">Judge</option>
                                <option value="event-admin" className="bg-black">Event Admin</option>
                            </select>
                        </div>
                    )}
                </div>

                {error && <p className="text-red-400 text-sm">{error}</p>}

                <button
                    type="submit"
                    disabled={!name || !email || !password || saving}
                    className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Create Account
                </button>
            </form>

            <div className="bg-card border border-border rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-muted-foreground">Loading...</div>
                ) : members.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">No judges or admins scoped to this fest yet.</div>
                ) : (
                    <div className="divide-y divide-border/50">
                        {members.map(m => (
                            <div key={m.id} className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${m.role === 'event-admin' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                        {m.role === 'event-admin' ? <ShieldCheck className="w-4 h-4" /> : <Gavel className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <div className="font-bold text-white">{m.name}</div>
                                        <div className="text-xs text-muted-foreground">{m.email}</div>
                                    </div>
                                </div>
                                <span className="text-xs bg-white/5 text-muted-foreground px-2 py-1 rounded-full capitalize">{m.role.replace('-', ' ')}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
