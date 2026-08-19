'use client';
import { useEffect, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, Loader2 } from 'lucide-react';

interface PassViewerProps {
    value: string;
    name: string;
    eventName: string;
    templateUrl?: string;
}

export default function PassViewer({ value, name, eventName, templateUrl }: PassViewerProps) {
    const DEFAULT_TEMPLATE = '/entry-pass-template.jpg';
    const resolvedTemplate = templateUrl && templateUrl.trim() !== '' ? templateUrl : DEFAULT_TEMPLATE;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const qrRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [entryPassDataUrl, setEntryPassDataUrl] = useState<string | null>(null);

    useEffect(() => {
        if (value) {
            generateEntryPass();
        }
    }, [value, name, templateUrl]);

    const generateEntryPass = async () => {
        setIsGenerating(true);
        setEntryPassDataUrl(null);

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

        const templateImg = new Image();
        const isExternal = resolvedTemplate.startsWith('http://') || resolvedTemplate.startsWith('https://');
        const imageSrc = isExternal
            ? `/api/proxy-image?url=${encodeURIComponent(resolvedTemplate)}`
            : resolvedTemplate;
        templateImg.src = imageSrc;

        templateImg.onload = () => {
            canvas.width = templateImg.width;
            canvas.height = templateImg.height;
            ctx.drawImage(templateImg, 0, 0);

            const boxX = Math.floor(templateImg.width * 0.27);
            const boxY = Math.floor(templateImg.height * 0.575);
            const boxW = Math.floor(templateImg.width * 0.458);
            const boxH = Math.floor(templateImg.height * 0.266);
            const qrSize = Math.min(boxW, boxH);
            const qrX = boxX + Math.floor((boxW - qrSize) / 2);
            const qrY = boxY + Math.floor((boxH - qrSize) / 2);

            ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

            const dataUrl = canvas.toDataURL('image/png');
            setEntryPassDataUrl(dataUrl);
            setIsGenerating(false);
        };

        templateImg.onerror = () => {
            canvas.width = 400;
            canvas.height = 450;
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, 400, 450);

            if (!templateUrl || templateUrl.trim() === '') {
                ctx.fillStyle = '#f59e0b';
                ctx.fillRect(0, 0, 400, 40);
                ctx.fillStyle = '#000000';
                ctx.font = 'bold 13px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('⚠  Upload a template in Event Settings', 200, 26);
            }

            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(50, 60, 300, 300);
            ctx.drawImage(qrCanvas, 60, 70, 280, 280);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(name.toUpperCase(), 200, 420);

            const dataUrl = canvas.toDataURL('image/png');
            setEntryPassDataUrl(dataUrl);
            setIsGenerating(false);
        };
    };

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
        <div className="bg-card w-full max-w-lg p-6 rounded-2xl border border-border shadow-xl">
            <div className="text-center space-y-4">
                <div>
                    <h3 className="text-xl md:text-2xl font-bold text-white mb-1">{name}</h3>
                    <p className="text-blue-400 font-medium text-sm md:text-base">{eventName}</p>
                </div>

                <div ref={qrRef} className="hidden">
                    <QRCodeCanvas value={value} size={300} level={"H"} includeMargin={false} />
                </div>
                <canvas ref={canvasRef} className="hidden" />

                <div className="flex justify-center">
                    {isGenerating ? (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <Loader2 className="w-8 h-8 animate-spin mb-2" />
                            <p>Generating Entry Pass...</p>
                        </div>
                    ) : entryPassDataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={entryPassDataUrl} alt="Entry Pass" className="max-w-full h-auto rounded-lg shadow-lg border border-border" style={{ maxHeight: '50vh' }} />
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <p>Failed to generate entry pass</p>
                            <button onClick={generateEntryPass} className="mt-2 text-blue-400 hover:underline">Try again</button>
                        </div>
                    )}
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
    );
}
