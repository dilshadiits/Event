'use client';
import { Html5Qrcode } from 'html5-qrcode';
import { useEffect, useRef, useState } from 'react';
import { Camera } from 'lucide-react';

interface ScannerProps {
    onScan: (data: string) => void;
    paused: boolean;
}

export default function Scanner({ onScan, paused }: ScannerProps) {
    const [hasPermission, setHasPermission] = useState(false);
    const [error, setError] = useState('');
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const mountedRef = useRef(false);
    const pausedRef = useRef(paused);
    const onScanRef = useRef(onScan);

    // Keep refs in sync — avoids restarting scanner on prop change
    useEffect(() => { onScanRef.current = onScan; }, [onScan]);
    useEffect(() => { pausedRef.current = paused; }, [paused]);

    useEffect(() => {
        mountedRef.current = true;
        const scannerId = 'qr-reader';
        let scanner: Html5Qrcode | null = null;

        const initScanner = async () => {
            try {
                const cameras = await Html5Qrcode.getCameras();
                if (!cameras || cameras.length === 0) {
                    setError('No camera found on this device.');
                    return;
                }

                setHasPermission(true);
                scanner = new Html5Qrcode(scannerId);
                scannerRef.current = scanner;

                await scanner.start(
                    { facingMode: 'environment' },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0,
                    },
                    (decodedText) => {
                        // Use refs so this callback never goes stale
                        if (!pausedRef.current && mountedRef.current) {
                            onScanRef.current(decodedText);
                        }
                    },
                    () => { /* ignore decode errors */ }
                );
            } catch (err) {
                console.error('Camera error:', err);
                setError('Camera permission denied. Please allow camera access and reload.');
            }
        };

        initScanner();

        return () => {
            mountedRef.current = false;
            if (scanner) {
                scanner.stop()
                    .then(() => scanner?.clear())
                    .catch(() => { /* ignore stop errors on unmount */ });
                scannerRef.current = null;
            }
        };
        // ⚠️ Empty deps: scanner initialises ONCE and stays alive.
        // paused/onScan are handled via refs above.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="relative w-full aspect-square max-w-sm mx-auto overflow-hidden rounded-3xl border-2 border-white/20 shadow-2xl bg-black">
            <div id="qr-reader" className="w-full h-full" />

            {/* Corner-bracket overlay */}
            <div className="absolute inset-0 pointer-events-none border-[50px] border-black/50">
                <div className="w-full h-full border-2 border-blue-500 relative">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-blue-500 -mt-1 -ml-1" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-blue-500 -mt-1 -mr-1" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-blue-500 -mb-1 -ml-1" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-blue-500 -mb-1 -mr-1" />
                </div>
            </div>

            {/* Animated scan line */}
            {hasPermission && !error && (
                <div className="absolute inset-x-[50px] pointer-events-none overflow-hidden" style={{ top: 50, bottom: 50 }}>
                    <div
                        className="h-0.5 bg-blue-400 shadow-[0_0_8px_2px_rgba(96,165,250,0.8)]"
                        style={{
                            animation: 'scanline 2s linear infinite',
                        }}
                    />
                </div>
            )}

            {/* Status overlay */}
            {!hasPermission && !error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center gap-3">
                    <Camera className="w-10 h-10 animate-bounce text-blue-400" />
                    <p className="text-sm text-white/70">Requesting camera access...</p>
                </div>
            )}

            {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center gap-3 bg-red-900/80">
                    <Camera className="w-10 h-10 text-red-400" />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            <style>{`
                @keyframes scanline {
                    0%   { transform: translateY(0); }
                    50%  { transform: translateY(calc(100vh - 100px)); }
                    100% { transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
