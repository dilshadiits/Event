'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { ShieldCheck, LogOut, Loader2, Building2, Trophy, Users } from 'lucide-react';

interface Org {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    createdAt: string;
    festCount: number;
    memberCount: number;
}

export default function ProductAdminPage() {
    const { data: session } = useSession();
    const [orgs, setOrgs] = useState<Org[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/organizations')
            .then(res => res.json())
            .then(data => setOrgs(Array.isArray(data) ? data : []))
            .finally(() => setLoading(false));
    }, []);

    return (
        <main className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-slate-500 to-slate-700 rounded-xl flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Organizations</h1>
                        <p className="text-sm text-muted-foreground">{session?.user?.name} &middot; Product Admin</p>
                    </div>
                </div>
                <button
                    onClick={() => signOut({ callbackUrl: '/admin/competitions/login' })}
                    className="flex items-center gap-2 text-muted-foreground hover:text-white p-2 rounded-lg hover:bg-muted transition-colors"
                    title="Sign out"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>

            {loading ? (
                <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> Loading...
                </div>
            ) : orgs.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
                    No organizations have signed up yet.
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                    {orgs.map(org => (
                        <Link
                            key={org.id}
                            href={`/product-admin/organizations/${org.id}`}
                            className="bg-card border border-border rounded-xl p-5 hover:border-slate-400/50 transition-all"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-slate-400" />
                                    <h3 className="text-lg font-bold text-white">{org.name}</h3>
                                </div>
                                {!org.isActive && (
                                    <span className="text-xs bg-white/5 text-muted-foreground px-2 py-0.5 rounded-full">Inactive</span>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 font-mono">/{org.slug}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
                                <span className="flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5" />{org.festCount} fest{org.festCount === 1 ? '' : 's'}</span>
                                <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{org.memberCount} member{org.memberCount === 1 ? '' : 's'}</span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </main>
    );
}
