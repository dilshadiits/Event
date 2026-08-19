'use client';
import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff } from 'lucide-react';

interface ScannerProps {
    onScan: (data: string) => void;
    paused: boolean;
}

export default function Scanner({ onScan, paused }: ScannerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number>(0);
    const streamRef = useRef<MediaStream | null>(null);
    const pausedRef = useRef(paused);
    const onScanRef = useRef(onScan);
    const lastDecodeRef = useRef<string>('');
    const lastDecodeTimeRef = useRef<number>(0);
    const frameCountRef = useRef(0);

    const [status, setStatus] = useState<'requesting' | 'active' | 'denied' | 'error'>('requesting');
    const [scanning, setScanning] = useState(false);
    const [debugInfo, setDebugInfo] = useState('Initializing...');

    useEffect(() => { pausedRef.current = paused; }, [paused]);
    useEffect(() => { onScanRef.current = onScan; }, [onScan]);

    useEffect(() => {
        let stopped = false;

        const handleDecode = (text: string) => {
            const now = Date.now();
            const isDuplicate = text === lastDecodeRef.current && now - lastDecodeTimeRef.current < 3000;
            setScanning(true);
            setDebugInfo(`Decoded: ${text.substring(0, 20)}...`);
            if (!isDuplicate && !pausedRef.current) {
                lastDecodeRef.current = text;
                lastDecodeTimeRef.current = now;
                onScanRef.current(text);
            }
        };

        const start = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
                    audio: false,
                });
                if (stopped) { stream.getTracks().forEach(t => t.stop()); return; }

                streamRef.current = stream;
                const video = videoRef.current!;
                video.srcObject = stream;
                await video.play();
                setStatus('active');

                // --- Strategy 1: Native BarcodeDetector (Chrome/Android, fastest) ---
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const BD = (window as any).BarcodeDetector;
                if (BD) {
                    try {
                        const supportedFormats: string[] = await BD.getSupportedFormats();
                        if (supportedFormats.includes('qr_code')) {
                            setDebugInfo('Using BarcodeDetector API');
                            const detector = new BD({ formats: ['qr_code'] });

                            const detectLoop = async () => {
                                if (stopped) return;
                                if (!pausedRef.current && video.readyState >= 2) {
                                    try {
                                        const barcodes = await detector.detect(video);
                                        frameCountRef.current++;
                                        if (barcodes.length > 0) {
                                            handleDecode(barcodes[0].rawValue);
                                        } else {
                                            if (frameCountRef.current % 5 === 0) setScanning(false);
                                        }
                                    } catch { /* ignore per-frame errors */ }
                                }
                                setTimeout(detectLoop, 100); // ~10fps
                            };
                            detectLoop();
                            return;
                        }
                    } catch { /* BarcodeDetector failed, fall through */ }
                }

                // --- Strategy 2: jsQR via dynamic import (fallback) ---
                setDebugInfo('Loading jsQR fallback...');
                let jsQRFn: ((data: Uint8ClampedArray, w: number, h: number, opts?: object) => { data: string } | null) | null = null;
                try {
                    const mod = await import('jsqr');
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    jsQRFn = (mod as any).default ?? mod;
                    setDebugInfo('Using jsQR (canvas mode)');
                } catch (e) {
                    setDebugInfo('jsQR load failed: ' + String(e));
                    setStatus('error');
                    return;
                }

                const canvas = canvasRef.current!;
                const tick = () => {
                    if (stopped) return;
                    if (video.readyState >= 2) {
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
                        ctx.drawImage(video, 0, 0);
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        frameCountRef.current++;
                        const code = jsQRFn!(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
                        if (code?.data) {
                            handleDecode(code.data);
                        } else {
                            if (frameCountRef.current % 15 === 0) {
                                setScanning(false);
                                setDebugInfo(`jsQR: ${frameCountRef.current} frames, no QR`);
                            }
                        }
                    }
                    rafRef.current = requestAnimationFrame(tick);
                };
                tick();

            } catch (err: unknown) {
                if (stopped) return;
                const name = (err as Error)?.name ?? '';
                if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
                    setStatus('denied');
                    setDebugInfo('Camera denied');
                } else {
                    setStatus('error');
                    setDebugInfo('Camera error: ' + String(err));
                }
            }
        };

        start();

        return () => {
            stopped = true;
            cancelAnimationFrame(rafRef.current);
            streamRef.current?.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="flex flex-col items-center gap-2 w-full max-w-sm mx-auto">
            <div className="relative w-full aspect-square overflow-hidden rounded-3xl border-2 border-white/20 shadow-2xl bg-black">
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
                <canvas ref={canvasRef} className="hidden" />

                {/* Overlay */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 border-[60px] border-black/50 rounded-3xl" />
                    <div className={`absolute inset-[60px] border-2 transition-colors duration-100 ${scanning ? 'border-green-400' : 'border-blue-400'}`}>
                        <span className={`absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 ${scanning ? 'border-green-400' : 'border-blue-400'}`} />
                        <span className={`absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 ${scanning ? 'border-green-400' : 'border-blue-400'}`} />
                        <span className={`absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 ${scanning ? 'border-green-400' : 'border-blue-400'}`} />
                        <span className={`absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 ${scanning ? 'border-green-400' : 'border-blue-400'}`} />
                        {!scanning && status === 'active' && (
                            <div className="absolute left-0 right-0 h-0.5 bg-blue-400 shadow-[0_0_8px_3px_rgba(96,165,250,0.8)]"
                                style={{ animation: 'scanline 1.8s ease-in-out infinite' }} />
                        )}
                        {scanning && (
                            <div className="absolute inset-0 bg-green-400/20 flex items-center justify-center">
                                <span className="text-green-300 font-bold text-sm tracking-widest">QR FOUND ✓</span>
                            </div>
                        )}
                    </div>

                    {status === 'active' && (
                        <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                            <div className="flex items-center gap-2 bg-black/60 px-3 py-1 rounded-full">
                                <span className={`w-2 h-2 rounded-full ${scanning ? 'bg-green-400' : 'bg-blue-400 animate-pulse'}`} />
                                <span className="text-white text-xs">{scanning ? 'Processing...' : 'Scanning...'}</span>
                            </div>
                        </div>
                    )}
                </div>

                {status === 'requesting' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70">
                        <Camera className="w-10 h-10 text-blue-400 animate-pulse" />
                        <p className="text-white text-sm">Requesting camera...</p>
                    </div>
                )}
                {status === 'denied' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-red-900/80 p-6 text-center">
                        <CameraOff className="w-10 h-10 text-red-400" />
                        <p className="text-white font-semibold">Camera Access Denied</p>
                        <p className="text-white/70 text-sm">Allow camera permission and reload.</p>
                    </div>
                )}
                {status === 'error' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-orange-900/80 p-6 text-center">
                        <CameraOff className="w-10 h-10 text-orange-400" />
                        <p className="text-white font-semibold">Camera Error</p>
                        <p className="text-white/70 text-xs mt-1">{debugInfo}</p>
                    </div>
                )}

                <style>{`
                    @keyframes scanline {
                        0%   { top: 0%; }
                        50%  { top: calc(100% - 2px); }
                        100% { top: 0%; }
                    }
                `}</style>
            </div>

            {/* Debug info strip — remove after confirming scan works */}
            <div className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white/60 text-center truncate">
                {debugInfo}
            </div>
        </div>
    );
}
