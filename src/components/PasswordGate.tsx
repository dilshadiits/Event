'use client';
import { useState, useSyncExternalStore, memo, ReactNode } from 'react';
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

interface PasswordGateProps {
    children: React.ReactNode;
}

// Subscribe to storage changes
const subscribe = (callback: () => void) => {
    window.addEventListener('storage', callback);
    return () => window.removeEventListener('storage', callback);
};

// Get auth token from localStorage
const getSnapshot = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('app_auth_token');
};

// Server snapshot (no localStorage)
const getServerSnapshot = () => null;

// Memoized children wrapper to prevent re-renders
const AuthenticatedContent = memo(({ children }: { children: ReactNode }) => (
    <>{children}</>
));
AuthenticatedContent.displayName = 'AuthenticatedContent';

export default function PasswordGate({ children }: PasswordGateProps) {
    // Use useSyncExternalStore for synchronous localStorage access
    const authToken = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    const isAuthenticated = authToken === 'authenticated';

    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                localStorage.setItem('app_auth_token', 'authenticated');
                // Force re-render by dispatching storage event
                window.dispatchEvent(new Event('storage'));
            } else {
                setError(data.error || 'Invalid password');
                setPassword('');
            }
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Authenticated - show app content immediately (no loading flash)
    if (isAuthenticated) {
        return <AuthenticatedContent>{children}</AuthenticatedContent>;
    }

    // Show login screen
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-3 sm:p-4">
            <div className="w-full max-w-md">
                <div className="bg-card border border-border rounded-2xl p-5 sm:p-8 shadow-2xl">
                    {/* Logo/Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl sm:rounded-2xl mb-4">
                            <Lock className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white">Event QR Manager</h1>
                        <p className="text-sm sm:text-base text-muted-foreground mt-2">Enter password to continue</p>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password"
                                className="w-full bg-muted border border-border rounded-lg px-4 py-3 pr-12 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-3 text-muted-foreground hover:text-white transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>

                        {error && (
                            <p className="text-red-400 text-sm text-center">{error}</p>
                        )}

                        <button
                            type="submit"
                            disabled={!password || loading}
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                'Enter'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
