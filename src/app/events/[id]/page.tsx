'use client';
import { useState, useEffect, use, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, QrCode, CheckCircle, Instagram, Phone, Users, Link as LinkIcon, Check, Trash2, Zap, RefreshCw, Edit, Download, Loader2 } from 'lucide-react';
import QRCodeModal from '@/components/QRCodeModal';
import EditAttendeeModal from '@/components/EditAttendeeModal';
import { QRCodeCanvas } from 'qrcode.react';

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
    meal_preference?: 'veg' | 'non-veg';
}

export default function EventPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [attendees, setAttendees] = useState<Attendee[]>([]);
    const eventName = 'Event Details';
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [search, setSearch] = useState('');
    const [copied, setCopied] = useState(false);
    const [inviteCopied, setInviteCopied] = useState(false);

    // Modal State
    const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null);
    const [selectedGuest, setSelectedGuest] = useState<{ attendeeId: string; guestName: string } | null>(null);
    const [editingAttendee, setEditingAttendee] = useState<Attendee | null>(null);
    const [isGeneratingAll, setIsGeneratingAll] = useState(false);
    const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
    const qrContainerRef = useRef<HTMLDivElement>(null);

    const fetchAttendees = useCallback(async (showRefresh = false) => {
        if (showRefresh) setIsRefreshing(true);
        try {
            const res = await fetch(`/api/attendees?eventId=${id}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setAttendees(data);
                setLastUpdated(new Date());
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [id]);

    useEffect(() => {
        fetchAttendees();
        // Poll every 5 seconds for real-time status updates
        const interval = setInterval(() => fetchAttendees(), 5000);
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
                setInviteCopied(true);
                setTimeout(() => setInviteCopied(false), 2000);
            }
        } catch (err) {
            console.error(err);
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

    const handleAttendeeUpdate = (updated: Attendee) => {
        setAttendees(prev => prev.map(a => a.id === updated.id ? updated : a));
    };

    const generateAllQRCodes = async () => {
        if (attendees.length === 0) return;

        setIsGeneratingAll(true);
        setGenerationProgress({ current: 0, total: attendees.length });

        try {
            // Load template image
            const templateImg = new Image();
            templateImg.crossOrigin = 'anonymous';
            templateImg.src = '/entry-pass-template.jpg';

            await new Promise((resolve, reject) => {
                templateImg.onload = resolve;
                templateImg.onerror = reject;
            });

            for (let i = 0; i < attendees.length; i++) {
                const attendee = attendees[i];
                setGenerationProgress({ current: i + 1, total: attendees.length });

                // Create QR code canvas
                const qrCanvas = document.createElement('canvas');
                const qrSize = 300;
                qrCanvas.width = qrSize;
                qrCanvas.height = qrSize;

                // Use the QRCodeCanvas to render
                const qrContainer = document.createElement('div');
                qrContainer.style.position = 'absolute';
                qrContainer.style.left = '-9999px';
                document.body.appendChild(qrContainer);

                const { createRoot } = await import('react-dom/client');
                const root = createRoot(qrContainer);

                await new Promise<void>((resolve) => {
                    root.render(
                        <QRCodeCanvas
                            value={attendee.id}
                            size={300}
                            level="H"
                            includeMargin={false}
                        />
                    );
                    setTimeout(resolve, 100);
                });

                const qrCanvasElement = qrContainer.querySelector('canvas');
                if (!qrCanvasElement) {
                    root.unmount();
                    document.body.removeChild(qrContainer);
                    continue;
                }

                // Create final canvas
                const canvas = document.createElement('canvas');
                canvas.width = templateImg.width;
                canvas.height = templateImg.height;
                const ctx = canvas.getContext('2d');

                if (ctx) {
                    ctx.drawImage(templateImg, 0, 0);

                    const qrSizeFinal = Math.min(templateImg.width * 0.38, templateImg.height * 0.22);
                    const qrX = (templateImg.width - qrSizeFinal) / 2;
                    const qrY = templateImg.height * 0.48;

                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(qrX - 10, qrY - 10, qrSizeFinal + 20, qrSizeFinal + 50);
                    ctx.drawImage(qrCanvasElement, qrX, qrY, qrSizeFinal, qrSizeFinal);

                    ctx.fillStyle = '#000000';
                    ctx.font = `bold ${Math.floor(qrSizeFinal * 0.12)}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.fillText(attendee.name.toUpperCase(), templateImg.width / 2, qrY + qrSizeFinal + 30);

                    // Download
                    const dataUrl = canvas.toDataURL('image/png');
                    const downloadLink = document.createElement('a');
                    downloadLink.href = dataUrl;
                    downloadLink.download = `${attendee.name.replace(/\s+/g, '_')}_Entry_Pass.png`;
                    document.body.appendChild(downloadLink);
                    downloadLink.click();
                    document.body.removeChild(downloadLink);
                }

                root.unmount();
                document.body.removeChild(qrContainer);

                // Small delay between downloads
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        } catch (error) {
            console.error('Failed to generate QR codes:', error);
        } finally {
            setIsGeneratingAll(false);
            setGenerationProgress({ current: 0, total: 0 });
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
                        {inviteCopied ? <Check className="w-3 h-3" /> : <LinkIcon className="w-3 h-3" />}
                        {inviteCopied ? 'Copied!' : 'Invite Link'}
                    </button>
                    <Link
                        href={`/spot/${id}`}
                        className="flex items-center gap-2 bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-400 text-xs px-3 py-2 rounded-full transition-all border border-yellow-500/30"
                    >
                        <Zap className="w-3 h-3" />
                        Spot Reg.
                    </Link>
                    <button
                        onClick={generateAllQRCodes}
                        disabled={isGeneratingAll || attendees.length === 0}
                        className="flex items-center gap-2 bg-green-600/20 hover:bg-green-600/40 disabled:opacity-50 text-green-400 text-xs px-3 py-2 rounded-full transition-all border border-green-500/30"
                    >
                        {isGeneratingAll ? (
                            <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                {generationProgress.current}/{generationProgress.total}
                            </>
                        ) : (
                            <>
                                <Download className="w-3 h-3" />
                                All QR
                            </>
                        )}
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 md:gap-4">
                    <div className="bg-card border border-border px-4 py-3 rounded-xl text-center">
                        <div className="text-xs text-muted-foreground">Total</div>
                        <div className="text-xl md:text-2xl font-bold text-white">{attendees.length}</div>
                    </div>
                    <div className="bg-green-900/20 border border-green-900/50 px-4 py-3 rounded-xl text-center">
                        <div className="text-xs text-green-400">Checked In</div>
                        <div className="text-xl md:text-2xl font-bold text-green-400">{checkedInCount}</div>
                    </div>
                    <button
                        onClick={() => fetchAttendees(true)}
                        className="bg-blue-900/20 border border-blue-900/50 px-4 py-3 rounded-xl text-center hover:bg-blue-900/30 transition-all"
                    >
                        <div className="text-xs text-blue-400 flex items-center justify-center gap-1">
                            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                            {isRefreshing ? 'Updating...' : 'Live'}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                            {lastUpdated ? `${Math.round((Date.now() - lastUpdated.getTime()) / 1000)}s ago` : '...'}
                        </div>
                    </button>
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
                                                    <div className="flex items-center gap-1.5 text-orange-300/80 flex-wrap">
                                                        <Users className="w-3.5 h-3.5 shrink-0" />
                                                        <span className="mr-1">Guests:</span>
                                                        {attendee.guest_names.split(',').map((guest, idx) => (
                                                            <button
                                                                key={idx}
                                                                onClick={() => setSelectedGuest({ attendeeId: attendee.id, guestName: guest.trim() })}
                                                                className="inline-flex items-center gap-1 bg-orange-500/20 hover:bg-orange-500/40 px-2 py-0.5 rounded-full text-xs border border-orange-500/30 transition-all cursor-pointer"
                                                                title={`View ${guest.trim()}'s Entry Pass`}
                                                            >
                                                                <QrCode className="w-3 h-3" />
                                                                {guest.trim()}
                                                            </button>
                                                        ))}
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
                                            onClick={() => setEditingAttendee(attendee)}
                                            className="p-2 text-muted-foreground hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                                            title="Edit Attendee"
                                        >
                                            <Edit className="w-6 h-6" />
                                        </button>
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

            {/* Guest QR Code Modal */}
            <QRCodeModal
                isOpen={!!selectedGuest}
                onClose={() => setSelectedGuest(null)}
                value={selectedGuest ? `${selectedGuest.attendeeId}_guest_${selectedGuest.guestName}` : ''}
                name={selectedGuest ? `${selectedGuest.guestName} (Guest)` : ''}
                eventName={eventName}
            />

            <EditAttendeeModal
                attendee={editingAttendee}
                isOpen={!!editingAttendee}
                onClose={() => setEditingAttendee(null)}
                onSave={handleAttendeeUpdate}
            />

            {/* Hidden container for QR generation */}
            <div ref={qrContainerRef} className="hidden" />
        </main >
    );
}
