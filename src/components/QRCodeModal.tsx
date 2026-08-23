'use client';
import { useEffect, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { X, Download, Loader2 } from 'lucide-react';
import { loadImage, compositeOverlays, buildEntryPassOverlays, downloadDataUrl } from '@/lib/certificateGen';

interface QRCodeModalProps {
    value: string;
    name: string;
    eventName: string;
    isOpen: boolean;
    onClose: () => void;
    templateUrl?: string;
    // When false, the participant's name is neither printed on the composited card nor
    // shown in this modal - used for blind-judging chest cards, which must stay as
    // anonymous as the judge's own scoring screen.
    showName?: boolean;
    downloadLabel?: string;
}

export default function QRCodeModal({ value, name, eventName, isOpen, onClose, templateUrl = '/entry-pass-template.jpg', showName = true, downloadLabel = 'Entry_Pass' }: QRCodeModalProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const qrRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [entryPassDataUrl, setEntryPassDataUrl] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && value) {
            generateEntryPass();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, value, name]);

    const generateEntryPass = async () => {
        setIsGenerating(true);
        setEntryPassDataUrl(null);

        // Wait for QR code to render
        await new Promise(resolve => setTimeout(resolve, 100));

        const canvas = canvasRef.current;
        const qrCanvas = qrRef.current?.querySelector('canvas');

        if (!canvas || !qrCanvas) {
            setIsGenerating(false);
            return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            setIsGenerating(false);
            return;
        }

        const label = showName ? name : '';

        try {
            const templateImg = await loadImage(templateUrl || '/entry-pass-template.jpg');
            compositeOverlays(canvas, templateImg, buildEntryPassOverlays(templateImg, qrCanvas, label));
            setEntryPassDataUrl(canvas.toDataURL('image/png'));
        } catch {
            console.warn('Failed to load template image, falling back to plain QR');
            // Fallback: Clear canvas and just draw QR code
            canvas.width = 300;
            canvas.height = 300;
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, 300, 300);

            // Draw QR centered
            ctx.drawImage(qrCanvas, 25, 25, 250, 250); // 300 - 50 margin

            if (label) {
                ctx.fillStyle = '#000000';
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(label, 150, 290);
            }

            setEntryPassDataUrl(canvas.toDataURL('image/png'));
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isOpen) return null;

    const downloadEntryPass = () => {
        if (entryPassDataUrl) {
            downloadDataUrl(entryPassDataUrl, `${(showName ? name : value).replace(/\s+/g, '_')}_${downloadLabel}.png`);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <div className="bg-card w-full max-w-lg p-6 md:p-8 rounded-2xl border border-border shadow-2xl scale-in-95 animate-in zoom-in-95 duration-200 relative max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-colors z-10"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="text-center space-y-4">
                    <div>
                        <h3 className="text-xl md:text-2xl font-bold text-white mb-1">{showName ? name : 'Chest Card'}</h3>
                        <p className="text-blue-400 font-medium text-sm md:text-base">{eventName}</p>
                    </div>

                    {/* Hidden QR code for generation */}
                    <div ref={qrRef} className="hidden">
                        <QRCodeCanvas
                            value={value}
                            size={300}
                            level={"H"}
                            includeMargin={false}
                        />
                    </div>

                    {/* Hidden canvas for compositing */}
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Entry Pass Preview */}
                    <div className="flex justify-center">
                        {isGenerating ? (
                            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                <p>Generating Entry Pass...</p>
                            </div>
                        ) : entryPassDataUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                                src={entryPassDataUrl}
                                alt="Entry Pass"
                                className="max-w-full h-auto rounded-lg shadow-lg border border-border"
                                style={{ maxHeight: '50vh' }}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                                <p>Failed to generate entry pass</p>
                                <button
                                    onClick={generateEntryPass}
                                    className="mt-2 text-blue-400 hover:underline"
                                >
                                    Try again
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="text-sm text-muted-foreground">
                        Show this pass at the event entrance for entry.
                        <div className="mt-1 text-xs font-mono opacity-50 select-all">{value}</div>
                    </div>

                    <button
                        onClick={downloadEntryPass}
                        disabled={!entryPassDataUrl || isGenerating}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 disabled:from-gray-500 disabled:to-gray-600 text-black font-bold py-3 rounded-lg transition-all shadow-lg"
                    >
                        <Download className="w-5 h-5" />
                        Download Entry Pass
                    </button>
                </div>
            </div>
        </div>
    );
}
