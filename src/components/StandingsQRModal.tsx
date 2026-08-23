'use client';
import { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { X, Download } from 'lucide-react';

interface StandingsQRModalProps {
    url: string;
    title: string;
    isOpen: boolean;
    onClose: () => void;
    resultsArePublic: boolean;
}

export default function StandingsQRModal({ url, title, isOpen, onClose, resultsArePublic }: StandingsQRModalProps) {
    const qrRef = useRef<HTMLDivElement>(null);

    if (!isOpen) return null;

    const downloadQR = () => {
        const canvas = qrRef.current?.querySelector('canvas');
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = `${title.replace(/\s+/g, '_')}_Standings_QR.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <div className="bg-card w-full max-w-sm p-6 md:p-8 rounded-2xl border border-border shadow-2xl animate-in zoom-in-95 duration-200 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="text-center space-y-4">
                    <div>
                        <h3 className="text-xl font-bold text-white mb-1">Live Standings</h3>
                        <p className="text-blue-400 font-medium text-sm">{title}</p>
                    </div>

                    <div ref={qrRef} className="flex justify-center bg-white p-4 rounded-lg">
                        <QRCodeCanvas value={url} size={240} level="H" includeMargin={false} />
                    </div>

                    <div className="text-xs font-mono text-muted-foreground break-all select-all">{url}</div>

                    {!resultsArePublic && (
                        <p className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2">
                            Results are currently private - scanning this QR won&apos;t show standings until you switch results to public.
                        </p>
                    )}

                    <button
                        onClick={downloadQR}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 rounded-lg transition-all shadow-lg"
                    >
                        <Download className="w-5 h-5" />
                        Download QR Code
                    </button>
                </div>
            </div>
        </div>
    );
}
