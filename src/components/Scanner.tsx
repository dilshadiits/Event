'use client';
import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff } from 'lucide-react';
// jsQR exports as CJS — the actual function may be on .default in some bundlers
import jsQRModule from 'jsqr';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const jsQR: typeof jsQRModule = (jsQRModule as any).default ?? jsQRModule;

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

    const [status, setStatus] = useState<'requesting' | 'active' | 'denied' | 'error'>('requesting');
    const [scanning, setScanning] = useState(false); // true when QR detected this frame
    const frameCountRef = useRef(0);

    // Keep refs current without restarting camera
    useEffect(() => { pausedRef.current = paused; }, [paused]);
    useEffect(() => { onScanRef.current = onScan; }, [onScan]);

    useEffect(() => {
        let stopped = false;

        const start = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'environment',
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                    },
                    audio: false,
                });

                if (stopped) { stream.getTracks().forEach(t => t.stop()); return; }

                streamRef.current = stream;
                const video = videoRef.current!;
                video.srcObject = stream;
                await video.play();
                setStatus('active');
                tick();
            } catch (err: unknown) {
                if (stopped) return;
                const name = (err as Error)?.name ?? '';
                if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
                    setStatus('denied');
                } else {
                    setStatus('error');
                }
                console.error('Camera error:', err);
            }
        };

        const tick = () => {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (!video || !canvas || video.readyState < 2) {
                rafRef.current = requestAnimationFrame(tick);
                return;
            }

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
            ctx.drawImage(video, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert',
            });

            frameCountRef.current++;

            if (code && code.data) {
                setScanning(true);
                const now = Date.now();
                const isDuplicate =
                    code.data === lastDecodeRef.current &&
                    now - lastDecodeTimeRef.current < 3000;

                if (!isDuplicate && !pausedRef.current) {
                    lastDecodeRef.current = code.data;
                    lastDecodeTimeRef.current = now;
                    onScanRef.current(code.data);
                }
            } else {
                if (frameCountRef.current % 10 === 0) setScanning(false);
            }

            rafRef.current = requestAnimationFrame(tick);
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
        <div className="relative w-full aspect-square max-w-sm mx-auto overflow-hidden rounded-3xl border-2 border-white/20 shadow-2xl bg-black">
            {/* Live video feed */}
            <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
                autoPlay
            />
            {/* Hidden canvas for frame analysis */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Corner bracket overlay */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Dark border vignette */}
                <div className="absolute inset-0 border-[60px] border-black/50 rounded-3xl" />
                {/* Scan box — green when QR detected, blue otherwise */}
                <div className={`absolute inset-[60px] border-2 transition-colors duration-100 ${scanning ? 'border-green-400' : 'border-blue-400'}`}>
                    {/* Corners */}
                    <span className={`absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 ${scanning ? 'border-green-400' : 'border-blue-400'}`} />
                    <span className={`absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 ${scanning ? 'border-green-400' : 'border-blue-400'}`} />
                    <span className={`absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 ${scanning ? 'border-green-400' : 'border-blue-400'}`} />
                    <span className={`absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 ${scanning ? 'border-green-400' : 'border-blue-400'}`} />
                    {/* Scan line */}
                    {status === 'active' && !scanning && (
                        <div
                            className="absolute left-0 right-0 h-0.5 bg-blue-400 shadow-[0_0_8px_3px_rgba(96,165,250,0.8)]"
                            style={{ animation: 'scanline 1.8s ease-in-out infinite' }}
                        />
                    )}
                    {/* QR detected flash */}
                    {scanning && (
                        <div className="absolute inset-0 bg-green-400/20 flex items-center justify-center">
                            <span className="text-green-300 font-bold text-sm tracking-widest animate-pulse">QR FOUND</span>
                        </div>
                    )}
                </div>

                {/* Bottom status pill */}
                {status === 'active' && (
                    <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                        <div className="flex items-center gap-2 bg-black/60 px-3 py-1 rounded-full">
                            <span className={`w-2 h-2 rounded-full ${scanning ? 'bg-green-400' : 'bg-blue-400 animate-pulse'}`} />
                            <span className="text-white text-xs font-medium">
                                {scanning ? 'QR Detected — Processing...' : 'Scanning...'}
                            </span>
                        </div>
                    </div>
                )}
            </div>


            {/* Status overlays */}
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
                    <p className="text-white/70 text-sm">Allow camera permission in your browser settings and reload.</p>
                </div>
            )}
            {status === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-orange-900/80 p-6 text-center">
                    <CameraOff className="w-10 h-10 text-orange-400" />
                    <p className="text-white font-semibold">Camera Error</p>
                    <p className="text-white/70 text-sm">Could not start camera. Try reloading the page.</p>
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
    );
}
