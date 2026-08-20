'use client';
import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Calendar, Trophy } from 'lucide-react';

interface Fest {
    id: string;
    name: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    isActive: boolean;
}

export default function ProductAdminOrgPage({ params }: { params: Promise<{ orgId: string }> }) {
    const { orgId } = use(params);
    const [fests, setFests] = useState<Fest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/fests?organizationId=${orgId}`)
            .then(res => res.json())
            .then(data => setFests(Array.isArray(data) ? data : []))
            .finally(() => setLoading(false));
    }, [orgId]);

    return (
        <main className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/product-admin" className="p-2 hover:bg-muted rounded-lg transition-colors -ml-2">
                    <ArrowLeft className="w-6 h-6 text-muted-foreground" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-white">Organization Fests</h1>
                    <p className="text-sm text-muted-foreground">Viewing as Product Admin</p>
                </div>
            </div>

            {loading ? (
                <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> Loading...
                </div>
            ) : fests.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
                    This organization has no fests yet.
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                    {fests.map(fest => (
                        <Link
                            key={fest.id}
                            href={`/admin/competitions/${fest.id}`}
                            className="bg-card border border-border rounded-xl p-5 hover:border-indigo-500/50 transition-all"
                        >
                            <div className="flex items-start justify-between">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Trophy className="w-4 h-4 text-indigo-400" />
                                    {fest.name}
                                </h3>
                                {!fest.isActive && (
                                    <span className="text-xs bg-white/5 text-muted-foreground px-2 py-0.5 rounded-full">Inactive</span>
                                )}
                            </div>
                            {fest.description && <p className="text-sm text-muted-foreground mt-1">{fest.description}</p>}
                            {(fest.startDate || fest.endDate) && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-3">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {fest.startDate}{fest.endDate ? ` – ${fest.endDate}` : ''}
                                </div>
                            )}
                        </Link>
                    ))}
                </div>
            )}
        </main>
    );
}
