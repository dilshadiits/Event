'use client';
import { useEffect, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { X, Download, Loader2 } from 'lucide-react';

interface QRCodeModalProps {
    value: string;
    name: string;
    eventName: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function QRCodeModal({ value, name, eventName, isOpen, onClose }: QRCodeModalProps) {
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

        // Load the template image
        const templateImg = new Image();
        templateImg.crossOrigin = 'anonymous';
        templateImg.src = '/entry-pass-template.jpg';

        templateImg.onload = () => {
            // Set canvas size to match template
            canvas.width = templateImg.width;
            canvas.height = templateImg.height;

            // Draw the template
            ctx.drawImage(templateImg, 0, 0);

            // Calculate QR code position (center of the white box area)
            // The white box is approximately in the center of the template
            // Based on the template, the white box starts around 22% from left and 47% from top
            const qrSize = Math.min(templateImg.width * 0.38, templateImg.height * 0.22);
            const qrX = (templateImg.width - qrSize) / 2;
            const qrY = templateImg.height * 0.48;

            // Draw white background for QR code
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 50);

            // Draw the QR code
            ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

            // Add the name below the QR code
            ctx.fillStyle = '#000000';
            ctx.font = `bold ${Math.floor(qrSize * 0.12)}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText(name.toUpperCase(), templateImg.width / 2, qrY + qrSize + 30);

            // Generate the data URL
            const dataUrl = canvas.toDataURL('image/png');
            setEntryPassDataUrl(dataUrl);
            setIsGenerating(false);
        };

        templateImg.onerror = () => {
            console.error('Failed to load template image');
            setIsGenerating(false);
        };
    };

    if (!isOpen) return null;

    const downloadEntryPass = () => {
        if (entryPassDataUrl) {
            const downloadLink = document.createElement('a');
            downloadLink.href = entryPassDataUrl;
            downloadLink.download = `${name.replace(/\s+/g, '_')}_Entry_Pass.png`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
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
                        <h3 className="text-xl md:text-2xl font-bold text-white mb-1">{name}</h3>
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
