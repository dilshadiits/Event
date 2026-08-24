'use client';
import { Suspense, useEffect, useState } from 'react';
import { signIn, getSession, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { KeyRound, GraduationCap, Loader2 } from 'lucide-react';

type Mode = 'admin' | 'student';

function routeForRole(role: string | undefined): string {
    if (role === 'product-admin') return '/product-admin';
    if (role === 'judge') return '/judge';
    if (role === 'student') return '/student';
    return '/admin/competitions'; // super-admin, event-admin
}

function AdminForm() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const res = await signIn('admin-credentials', { email, password, redirect: false });
        if (res?.ok) {
            const session = await getSession();
            router.push(routeForRole(session?.user?.role));
        } else {
            setError('Invalid email or password');
        }
        setLoading(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                autoFocus
                className="w-full bg-muted border border-border rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full bg-muted border border-border rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button
                type="submit"
                disabled={!email || !password || loading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white py-3 rounded-lg font-bold transition-all"
            >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
            </button>
        </form>
    );
}

function StudentForm() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const res = await signIn('student-credentials', { username, password, redirect: false });
        if (res?.ok) {
            router.push('/student');
        } else {
            setError('Invalid username or password');
        }
        setLoading(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                required
                autoFocus
                autoCapitalize="none"
                className="w-full bg-muted border border-border rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
            />
            <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full bg-muted border border-border rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
            />
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button
                type="submit"
                disabled={!username || !password || loading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 text-white py-3 rounded-lg font-bold transition-all"
            >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
            </button>
            <p className="text-xs text-muted-foreground text-center">
                Your username and password were shared by your event admin. Default password is your phone number.
            </p>
        </form>
    );
}

function LoginGateway() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session, status } = useSession();
    const initialMode = searchParams.get('mode') === 'student' ? 'student' : 'admin';
    const [mode, setMode] = useState<Mode>(initialMode);

    useEffect(() => {
        if (status === 'authenticated') router.replace(routeForRole(session?.user?.role));
    }, [status, session, router]);

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-2xl">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-white">Sign In</h1>
                    <p className="text-muted-foreground mt-2">
                        {mode === 'admin' ? 'Super Admin, Event Admin, or Judge' : 'Student'}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-6 bg-muted/50 p-1 rounded-xl border border-border">
                    <button
                        type="button"
                        onClick={() => setMode('admin')}
                        className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === 'admin' ? 'bg-indigo-600 text-white' : 'text-muted-foreground hover:text-white'
                            }`}
                    >
                        <KeyRound className="w-4 h-4" /> Admin &amp; Judge
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('student')}
                        className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === 'student' ? 'bg-cyan-600 text-white' : 'text-muted-foreground hover:text-white'
                            }`}
                    >
                        <GraduationCap className="w-4 h-4" /> Student
                    </button>
                </div>

                {mode === 'admin' ? <AdminForm /> : <StudentForm />}

                {mode === 'admin' && (
                    <p className="text-center text-sm text-muted-foreground mt-6">
                        New here?{' '}
                        <Link href="/signup" className="text-indigo-400 hover:underline">Create an organization</Link>
                    </p>
                )}
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <LoginGateway />
        </Suspense>
    );
}
