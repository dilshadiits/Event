'use client';
import { useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Scanner from '@/components/Scanner';
import { CheckCircle, XCircle, Home, RotateCcw, Calendar } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';

interface AttendeeData {
    name: string;
    email?: string;
    seatingNumber?: string;
    guest_names?: string;
}

function ScanContent() {
    const searchParams = useSearchParams();
    const eventId = searchParams.get('eventId');
    const eventName = searchParams.get('eventName');

    const [scanResult, setScanResult] = useState<{ success: boolean; message: string; attendee?: AttendeeData } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleScan = useCallback(async (data: string) => {
        if (isProcessing || scanResult) return;
        setIsProcessing(true);

        try {
            // Play beep
            const audio = new Audio('/beep.mp3');
            audio.play().catch(() => { });

            const res = await fetch('/api/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scanData: data, eventId }), // Pass eventId
            });
            const result = await res.json();
            setScanResult(result);
        } catch {
            setScanResult({ success: false, message: 'Network Error' });
        } finally {
            setIsProcessing(false);
        }
    }, [isProcessing, scanResult, eventId]);

    const resetScanner = () => {
        setScanResult(null);
    };

    return (
        <main className={clsx(
            "min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-500",
            scanResult?.success === true && "bg-green-900",
            scanResult?.success === false && scanResult?.message?.toLowerCase().includes('already') && "bg-blue-900",
            scanResult?.success === false && !scanResult?.message?.toLowerCase().includes('already') && "bg-red-900",
            !scanResult && "bg-black"
        )}>

            {/* Top Bar */}
            <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
                <Link href="/" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors">
                    <Home className="w-6 h-6" />
                    <span className="text-sm font-medium">Dashboard</span>
                </Link>
                {eventName && (
                    <div className="flex items-center gap-2 text-purple-400 bg-purple-900/20 px-3 py-1 rounded-full border border-purple-500/30">
                        <Calendar className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wide">Scanning: {eventName}</span>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="w-full max-w-md space-y-8 text-center relative z-10">

                {!scanResult ? (
                    <>
                        <div className="space-y-2 mb-8">
                            <h1 className="text-3xl font-bold text-white tracking-tight">Scan Ticket</h1>
                            <p className="text-white/50">Align the QR code within the frame</p>
                        </div>

                        <div className="relative">
                            <Scanner onScan={handleScan} paused={!!scanResult} />
                        </div>
                    </>
                ) : (
                    <div className="animate-in zoom-in duration-300">
                        <div className="mb-6 flex justify-center">
                            {scanResult.success ? (
                                <CheckCircle className="w-32 h-32 text-green-400 drop-shadow-[0_0_20px_rgba(74,222,128,0.5)]" />
                            ) : scanResult.message?.toLowerCase().includes('already') ? (
                                <CheckCircle className="w-32 h-32 text-blue-400 drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]" />
                            ) : (
                                <XCircle className="w-32 h-32 text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]" />
                            )}
                        </div>

                        <h2 className="text-4xl font-bold text-white mb-2">
                            {scanResult.success ? 'Access Granted' : scanResult.message?.toLowerCase().includes('already') ? 'Already Checked In' : 'Access Denied'}
                        </h2>

                        <p className="text-xl text-white/80 mb-8 font-medium">
                            {scanResult.message}
                        </p>

                        {scanResult.attendee && (
                            <div className="bg-black/20 rounded-xl p-6 mb-8 backdrop-blur-sm border border-white/10">
                                <div className="text-sm text-white/50 uppercase tracking-wider font-bold mb-1">Attendee</div>
                                <div className="text-2xl text-white font-bold">{scanResult.attendee.name}</div>
                                {scanResult.attendee.seatingNumber && (
                                    <div className="text-xl text-yellow-400 font-bold mt-1">
                                        Seat: {scanResult.attendee.seatingNumber}
                                    </div>
                                )}
                                <div className="text-white/70">{scanResult.attendee.email}</div>
                                {scanResult.attendee.guest_names && <div className="text-white/70 mt-2 text-sm">Guest: {scanResult.attendee.guest_names}</div>}
                            </div>
                        )}

                        <button
                            onClick={resetScanner}
                            className="bg-white text-black hover:bg-gray-200 px-8 py-4 rounded-full font-bold text-lg flex items-center gap-2 mx-auto transition-transform hover:scale-105 active:scale-95 shadow-xl"
                        >
                            <RotateCcw className="w-5 h-5" />
                            Scan Next
                        </button>
                    </div>
                )}

            </div>
        </main>
    );
}

export default function ScanPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading Camera...</div>}>
            <ScanContent />
        </Suspense>
    );
}
