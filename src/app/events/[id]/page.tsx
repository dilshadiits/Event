'use client';
import { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, QrCode, CheckCircle, Instagram, Phone, Users, Link as LinkIcon, Check, Trash2, Zap } from 'lucide-react';
import QRCodeModal from '@/components/QRCodeModal';

interface Attendee {
    id: string;
    name: string;
    email: string;
    phone: string;
    instagram?: string;
    youtube?: string;
    category?: string;
    guest_names?: string;
    status: 'registered' | 'checked-in';
    checked_in_at: string | null;
    created_at: string;
}

export default function EventPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [attendees, setAttendees] = useState<Attendee[]>([]);
    const eventName = 'Event Details';
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [copied, setCopied] = useState(false);


    // Modal State
    const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null);

    const fetchAttendees = useCallback(async () => {
        try {
            const res = await fetch(`/api/attendees?eventId=${id}`, { cache: 'no-store' });
            const data = await res.json();
            setAttendees(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchAttendees();
        // Poll every 3 seconds for real-time updates
        const interval = setInterval(fetchAttendees, 3000);
        return () => clearInterval(interval);
    }, [fetchAttendees]);

    const copyRegistrationLink = () => {
        const url = `${window.location.origin}/register/${id}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const generateInviteLink = async () => {
        try {
            const res = await fetch('/api/invites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId: id })
            });
            const data = await res.json();
            if (data.code) {
                const url = `${window.location.origin}/register/${id}?code=${data.code}`;
                navigator.clipboard.writeText(url);
                alert('One-Time Link Copied to Clipboard!\n\n' + url);
            }
        } catch (err) {
            console.error(err);
            alert('Failed to generate link');
        }
    };

    const deleteAttendee = async (attendeeId: string) => {
        if (!confirm('Are you sure you want to delete this attendee?')) return;
        try {
            const res = await fetch(`/api/attendees?id=${attendeeId}`, { method: 'DELETE' });
            if (res.ok) {
                fetchAttendees();
            }
        } catch (err) {
            console.error(err);
        }
    };


    const filtered = attendees.filter(a =>
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        (a.category && a.category.toLowerCase().includes(search.toLowerCase()))
    );
    const checkedInCount = attendees.filter(a => a.status === 'checked-in').length;

    return (
        <main className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto space-y-6 md:space-y-8">
            {/* Details Header */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/" className="p-2 hover:bg-muted rounded-lg transition-colors -ml-2">
                        <ArrowLeft className="w-6 h-6 text-muted-foreground" />
                    </Link>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white">
                            Attendee Management
                        </h1>
                        <p className="text-sm md:text-base text-muted-foreground">Manage registrations and view tickets</p>
                    </div>
                </div>

                {/* Action Buttons - Mobile Optimized */}
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={copyRegistrationLink}
                        className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-xs px-3 py-2 rounded-full transition-all border border-blue-500/30"
                    >
                        {copied ? <Check className="w-3 h-3" /> : <LinkIcon className="w-3 h-3" />}
                        {copied ? 'Copied!' : 'Copy Link'}
                    </button>
                    <Link
                        href={`/scan?eventId=${id}&eventName=${encodeURIComponent(eventName)}`}
                        className="flex items-center gap-2 bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 text-xs px-3 py-2 rounded-full transition-all border border-purple-500/30"
                    >
                        <QrCode className="w-3 h-3" />
                        Scan
                    </Link>
                    <button
                        onClick={generateInviteLink}
                        className="flex items-center gap-2 bg-orange-600/20 hover:bg-orange-600/40 text-orange-400 text-xs px-3 py-2 rounded-full transition-all border border-orange-500/30"
                    >
                        <LinkIcon className="w-3 h-3" />
                        Invite Link
                    </button>
                    <Link
                        href={`/spot/${id}`}
                        className="flex items-center gap-2 bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-400 text-xs px-3 py-2 rounded-full transition-all border border-yellow-500/30"
                    >
                        <Zap className="w-3 h-3" />
                        Spot Reg.
                    </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div className="bg-card border border-border px-4 py-3 rounded-xl text-center">
                        <div className="text-xs text-muted-foreground">Total</div>
                        <div className="text-xl md:text-2xl font-bold text-white">{attendees.length}</div>
                    </div>
                    <div className="bg-green-900/20 border border-green-900/50 px-4 py-3 rounded-xl text-center">
                        <div className="text-xs text-green-400">Checked In</div>
                        <div className="text-xl md:text-2xl font-bold text-green-400">{checkedInCount}</div>
                    </div>
                </div>
            </div>


            <div className="space-y-6">
                <div className="relative">
                    <Search className="absolute left-4 top-3.5 w-5 h-5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search influencers by name or category..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-muted/50 border border-border rounded-xl pl-12 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>

                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center text-muted-foreground">Loading...</div>
                    ) : filtered.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground py-20">
                            {attendees.length === 0 ? "No attendees yet. Share the registration link!" : "No matches found."}
                        </div>
                    ) : (
                        <div className="divide-y divide-border/50">
                            {filtered.map(attendee => (
                                <div key={attendee.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-muted/50 transition-colors group gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl shrink-0 ${attendee.status === 'checked-in' ? 'bg-green-500/20 text-green-500' : 'bg-blue-500/20 text-blue-500'}`}>
                                            {attendee.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="font-bold text-white text-lg">{attendee.name}</h4>
                                                {attendee.category && (
                                                    <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                                                        {attendee.category}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex flex-col gap-1 mt-1 text-sm text-muted-foreground">
                                                {attendee.instagram && (
                                                    <div className="flex items-center gap-1.5">
                                                        <Instagram className="w-3.5 h-3.5" />
                                                        <span>{attendee.instagram}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-1.5">
                                                    <Phone className="w-3.5 h-3.5" />
                                                    <span>{attendee.phone}</span>
                                                </div>
                                                {attendee.guest_names && (
                                                    <div className="flex items-center gap-1.5 text-orange-300/80">
                                                        <Users className="w-3.5 h-3.5" />
                                                        <span>Guest: {attendee.guest_names}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto pl-16 md:pl-0">
                                        <div className="text-right">
                                            {attendee.status === 'checked-in' ? (
                                                <span className="flex items-center gap-1 text-green-400 bg-green-900/20 px-3 py-1 rounded-lg text-sm font-medium border border-green-900/50">
                                                    <CheckCircle className="w-4 h-4" /> Checked In
                                                </span>
                                            ) : (
                                                <span className="text-xs text-muted-foreground bg-white/5 px-2 py-1 rounded">Registered</span>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => setSelectedAttendee(attendee)}
                                            className="p-2 text-muted-foreground hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                            title="View QR Code"
                                        >
                                            <QrCode className="w-6 h-6" />
                                        </button>
                                        <button
                                            onClick={() => deleteAttendee(attendee.id)}
                                            className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                            title="Delete Attendee"
                                        >
                                            <Trash2 className="w-6 h-6" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <QRCodeModal
                isOpen={!!selectedAttendee}
                onClose={() => setSelectedAttendee(null)}
                value={selectedAttendee?.id || ''}
                name={selectedAttendee?.name || ''}
                eventName={eventName}
            />
        </main >
    );
}
