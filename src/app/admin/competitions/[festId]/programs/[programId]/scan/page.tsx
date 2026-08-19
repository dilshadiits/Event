'use client';
import { useState, useCallback, use } from 'react';
import Link from 'next/link';
import Scanner from '@/components/Scanner';
import { CheckCircle, XCircle, ArrowLeft, RotateCcw } from 'lucide-react';
import clsx from 'clsx';

interface ScanEntry {
    name: string;
    chestNumber?: string;
}

interface ScanResult {
    success: boolean;
    message: string;
    entry?: ScanEntry;
}

export default function ProgramScanPage({ params }: { params: Promise<{ festId: string; programId: string }> }) {
    const { festId, programId } = use(params);
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleScan = useCallback(async (data: string) => {
        if (isProcessing || scanResult) return;
        setIsProcessing(true);
        try {
            const audio = new Audio('/beep.mp3');
            audio.play().catch(() => { });

            const res = await fetch(`/api/programs/${programId}/checkin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scanData: data }),
            });
            const result = await res.json();
            setScanResult(result);
        } catch {
            setScanResult({ success: false, message: 'Network Error' });
        } finally {
            setIsProcessing(false);
        }
    }, [isProcessing, scanResult, programId]);

    const resetScanner = () => setScanResult(null);
    const isAlready = scanResult?.success === false && scanResult.message.toLowerCase().includes('already');

    return (
        <main className={clsx(
            'min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-500',
            scanResult?.success === true && 'bg-green-900',
            isAlready && 'bg-blue-900',
            scanResult?.success === false && !isAlready && 'bg-red-900',
            !scanResult && 'bg-black'
        )}>
            <div className="absolute top-4 left-4 z-20">
                <Link href={`/admin/competitions/${festId}/programs/${programId}`} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                    <span className="text-sm font-medium">Program</span>
                </Link>
            </div>

            <div className="w-full max-w-md space-y-8 text-center relative z-10">
                {!scanResult ? (
                    <>
                        <div className="space-y-2 mb-8">
                            <h1 className="text-3xl font-bold text-white tracking-tight">Scan Chest Card</h1>
                            <p className="text-white/50">Align the QR code within the frame</p>
                        </div>
                        <Scanner onScan={handleScan} paused={!!scanResult} />
                    </>
                ) : (
                    <div className="animate-in zoom-in duration-300">
                        <div className="mb-6 flex justify-center">
                            {scanResult.success ? (
                                <CheckCircle className="w-32 h-32 text-green-400 drop-shadow-[0_0_20px_rgba(74,222,128,0.5)]" />
                            ) : isAlready ? (
                                <CheckCircle className="w-32 h-32 text-blue-400 drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]" />
                            ) : (
                                <XCircle className="w-32 h-32 text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]" />
                            )}
                        </div>

                        <h2 className="text-4xl font-bold text-white mb-2">
                            {scanResult.success ? 'Checked In' : isAlready ? 'Already Checked In' : 'Not Valid'}
                        </h2>
                        <p className="text-xl text-white/80 mb-8 font-medium">{scanResult.message}</p>

                        {scanResult.entry && (
                            <div className="bg-black/20 rounded-xl p-6 mb-8 backdrop-blur-sm border border-white/10">
                                <div className="text-sm text-white/50 uppercase tracking-wider font-bold mb-1">Chest #{scanResult.entry.chestNumber}</div>
                                <div className="text-2xl text-white font-bold">{scanResult.entry.name}</div>
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
