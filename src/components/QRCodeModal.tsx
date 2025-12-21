import { QRCodeCanvas } from 'qrcode.react';
import { X, Download } from 'lucide-react';

interface QRCodeModalProps {
    value: string;
    name: string;
    eventName: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function QRCodeModal({ value, name, eventName, isOpen, onClose }: QRCodeModalProps) {

    if (!isOpen) return null;

    const downloadQR = () => {
        const canvas = document.getElementById('qr-canvas') as HTMLCanvasElement;
        if (canvas) {
            const pngUrl = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
            const downloadLink = document.createElement('a');
            downloadLink.href = pngUrl;
            downloadLink.download = `${name.replace(/\s+/g, '_')}_QR.png`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-md p-8 rounded-2xl border border-border shadow-2xl scale-in-95 animate-in zoom-in-95 duration-200 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="text-center space-y-6">
                    <div>
                        <h3 className="text-2xl font-bold text-white mb-1">{name}</h3>
                        <p className="text-blue-400 font-medium">{eventName}</p>
                    </div>

                    <div className="flex flex-col items-center p-4 bg-white rounded-xl mx-auto w-fit shadow-inner">
                        <QRCodeCanvas
                            id="qr-canvas"
                            value={value}
                            size={250}
                            level={"H"}
                            includeMargin={true}
                        />
                        <p className="text-black font-bold text-lg mt-2">{name}</p>
                    </div>

                    <div className="text-sm text-muted-foreground">
                        Scan this code at the event entrance to check in.
                        <div className="mt-1 text-xs font-mono opacity-50 select-all">{value}</div>
                    </div>

                    <button
                        onClick={downloadQR}
                        className="w-full flex items-center justify-center gap-2 bg-white text-black hover:bg-gray-200 font-bold py-3 rounded-lg transition-colors"
                    >
                        <Download className="w-5 h-5" />
                        Download Ticket
                    </button>
                </div>
            </div>
        </div>
    );
}
