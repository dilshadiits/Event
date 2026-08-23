'use client';
import { useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, Loader2 } from 'lucide-react';

export default function SignupPage() {
    const router = useRouter();
    const { status } = useSession();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (status === 'authenticated') router.replace('/admin/competitions');
    }, [status, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const res = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();

        if (!res.ok) {
            setError(data.error || 'Could not create your account');
            setLoading(false);
            return;
        }

        const signInRes = await signIn('admin-credentials', { email, password, redirect: false });
        if (signInRes?.ok) {
            router.push('/onboarding/organization');
        } else {
            setError('Account created, but sign-in failed - try signing in manually.');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-2xl">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl mb-4">
                        <Building2 className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Create your account</h1>
                    <p className="text-muted-foreground mt-2">You&apos;ll set up your organization next</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        required
                        autoFocus
                        className="w-full bg-muted border border-border rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                        required
                        className="w-full bg-muted border border-border rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password (min. 8 characters)"
                        minLength={8}
                        required
                        className="w-full bg-muted border border-border rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />

                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                    <button
                        type="submit"
                        disabled={!name || !email || password.length < 8 || loading}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white py-3 rounded-lg font-bold transition-all"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
                    </button>
                </form>

                <p className="text-center text-sm text-muted-foreground mt-6">
                    Already have an account?{' '}
                    <Link href="/login" className="text-indigo-400 hover:underline">Sign in</Link>
                </p>
            </div>
        </div>
    );
}
