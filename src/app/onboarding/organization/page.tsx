'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Building2, Loader2 } from 'lucide-react';

export default function CreateOrganizationPage() {
    const router = useRouter();
    const { data: session, status, update } = useSession();
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (status === 'unauthenticated') router.replace('/admin/competitions/login');
        // Already has an organization — nothing to do here.
        if (status === 'authenticated' && session?.user?.organizationId) {
            router.replace('/admin/competitions');
        }
    }, [status, session, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const res = await fetch('/api/organizations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        });
        const data = await res.json();

        if (!res.ok) {
            setError(data.error || 'Could not create your organization');
            setLoading(false);
            return;
        }

        await update(); // refresh the session so organizationId is picked up
        router.push('/admin/competitions');
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-2xl">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl mb-4">
                        <Building2 className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Name your organization</h1>
                    <p className="text-muted-foreground mt-2">This is what your fests, teams, and results will belong to.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Springfield College"
                        required
                        autoFocus
                        className="w-full bg-muted border border-border rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />

                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                    <button
                        type="submit"
                        disabled={!name.trim() || loading}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white py-3 rounded-lg font-bold transition-all"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Organization'}
                    </button>
                </form>
            </div>
        </div>
    );
}
