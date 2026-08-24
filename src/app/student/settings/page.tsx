'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Settings, KeyRound, Loader2, Check } from 'lucide-react';

export default function StudentSettingsPage() {
    const [username, setUsername] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        fetch('/api/student/me')
            .then(res => res.json())
            .then(data => { if (data?.username) setUsername(data.username); })
            .catch(() => {});
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess(false);
        if (newPassword !== confirmPassword) {
            setError('New passwords do not match');
            return;
        }
        setSaving(true);
        const res = await fetch('/api/student/password', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword }),
        });
        const data = await res.json();
        if (res.ok) {
            setSuccess(true);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } else {
            setError(data.error || 'Failed to change password');
        }
        setSaving(false);
    };

    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_120%_60%_at_50%_-10%,rgba(59,130,246,0.16),transparent),radial-gradient(ellipse_100%_50%_at_100%_100%,rgba(168,85,247,0.1),transparent)]">
            <main className="max-w-lg mx-auto p-4 pb-10 space-y-6">
                <div className="flex items-center gap-3 pt-2">
                    <Link href="/student" className="p-2 -ml-2 text-white/70 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <div className="w-11 h-11 shrink-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Settings className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-xl font-bold text-white">Settings</h1>
                </div>

                {username && (
                    <div className="bg-card/60 border border-white/10 rounded-2xl p-4">
                        <p className="text-xs text-muted-foreground">Signed in as</p>
                        <p className="text-white font-bold">@{username}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="bg-card/60 border border-white/10 rounded-2xl p-5 space-y-4">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-blue-400" /> Change Password
                    </h2>
                    <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Current password</label>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                            className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-white outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">New password</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            minLength={6}
                            required
                            className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-white outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Confirm new password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            minLength={6}
                            required
                            className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-white outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {error && <p className="text-sm text-red-400">{error}</p>}
                    {success && (
                        <p className="text-sm text-green-400 flex items-center gap-1.5">
                            <Check className="w-4 h-4" /> Password changed successfully.
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={!currentPassword || !newPassword || !confirmPassword || saving}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 text-white py-3 rounded-lg font-bold transition-all"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update Password'}
                    </button>
                </form>
            </main>
        </div>
    );
}
