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
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const mountedRef = useRef(false);
    const onScanRef = useRef(onScan);

    // Keep ref updated with latest onScan
    useEffect(() => {
        onScanRef.current = onScan;
    }, [onScan]);

    useEffect(() => {
        mountedRef.current = true;
        const scannerId = "reader";

        // Initialize scanner
        const initScanner = async () => {
            try {
                const cameras = await Html5Qrcode.getCameras();
                if (cameras && cameras.length > 0) {
                    setHasPermission(true);
                    const scanner = new Html5Qrcode(scannerId);
                    scannerRef.current = scanner;

                    await scanner.start(
                        { facingMode: "environment" },
                        {
                            fps: 10,
                            qrbox: { width: 250, height: 250 },
                            aspectRatio: 1.0
                        },
                        (decodedText) => {
                            if (!paused && mountedRef.current) {
                                onScanRef.current(decodedText);
                            }
                        },
                        () => {
                            // Ignore parse errors
                        }
                    );
                } else {
                    alert("No cameras found.");
                }
            } catch (err) {
                console.error("Camera error", err);
                // alert("Camera permission denied or error."); 
            }
        };

        if (!scannerRef.current) {
            initScanner();
        }

        return () => {
            mountedRef.current = false;
            if (scannerRef.current) {
                scannerRef.current.stop().then(() => {
                    scannerRef.current?.clear();
                }).catch(err => console.error("Failed to stop scanner", err));
            }
        };
    }, [paused]);

    return (
        <div className="relative w-full aspect-square max-w-sm mx-auto overflow-hidden rounded-3xl border-2 border-white/20 shadow-2xl bg-black">
            <div id="reader" className="w-full h-full object-cover"></div>

            {/* Overlay guide */}
            <div className="absolute inset-0 pointer-events-none border-[50px] border-black/50">
                <div className="w-full h-full border-2 border-blue-500 relative">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-blue-500 -mt-1 -ml-1"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-blue-500 -mt-1 -mr-1"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-blue-500 -mb-1 -ml-1"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-blue-500 -mb-1 -mr-1"></div>
                </div>
            </div>

            {!hasPermission && (
                <div className="absolute inset-0 flex items-center justify-center text-white p-4 text-center">
                    <Camera className="w-8 h-8 mb-2 animate-bounce" />
                    <p>Requesting Camera Access...</p>
                </div>
            )}
        </div>
    );
}
