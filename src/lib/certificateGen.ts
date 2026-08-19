// Shared canvas compositing primitives, extracted from the entry-pass generation
// logic that used to be duplicated in QRCodeModal.tsx and events/[id]/page.tsx.
// Certificates/posters reuse the same load-template -> draw overlays -> export flow.

export type Overlay =
    | { type: 'rect'; x: number; y: number; width: number; height: number; color?: string }
    | { type: 'image'; x: number; y: number; width: number; height: number; source: CanvasImageSource }
    | { type: 'text'; x: number; y: number; text: string; font?: string; color?: string; align?: CanvasTextAlign };

export function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
}

// Sizes `canvas` to `template`, draws the template, then draws each overlay in order.
export function compositeOverlays(
    canvas: HTMLCanvasElement,
    template: HTMLImageElement,
    overlays: Overlay[]
): CanvasRenderingContext2D {
    canvas.width = template.width;
    canvas.height = template.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');

    ctx.drawImage(template, 0, 0);

    for (const overlay of overlays) {
        if (overlay.type === 'rect') {
            ctx.fillStyle = overlay.color ?? '#FFFFFF';
            ctx.fillRect(overlay.x, overlay.y, overlay.width, overlay.height);
        } else if (overlay.type === 'image') {
            ctx.drawImage(overlay.source, overlay.x, overlay.y, overlay.width, overlay.height);
        } else {
            ctx.fillStyle = overlay.color ?? '#000000';
            ctx.font = overlay.font ?? 'bold 16px Arial';
            ctx.textAlign = overlay.align ?? 'center';
            ctx.fillText(overlay.text, overlay.x, overlay.y);
        }
    }

    return ctx;
}

// The entry-pass layout: a white box + QR code centered around 48% down the
// template, with the name printed below it. Same math as the original
// QRCodeModal/generateAllQRCodes implementation, just parameterized.
export function buildEntryPassOverlays(
    template: HTMLImageElement,
    qrSource: CanvasImageSource,
    name: string
): Overlay[] {
    const qrSize = Math.min(template.width * 0.38, template.height * 0.22);
    const qrX = (template.width - qrSize) / 2;
    const qrY = template.height * 0.48;

    return [
        { type: 'rect', x: qrX - 10, y: qrY - 10, width: qrSize + 20, height: qrSize + 50, color: '#FFFFFF' },
        { type: 'image', x: qrX, y: qrY, width: qrSize, height: qrSize, source: qrSource },
        {
            type: 'text',
            x: template.width / 2,
            y: qrY + qrSize + 30,
            text: name.toUpperCase(),
            font: `bold ${Math.floor(qrSize * 0.12)}px Arial`,
            color: '#000000',
            align: 'center',
        },
    ];
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export function downloadCanvasAsPng(canvas: HTMLCanvasElement, filename: string): void {
    downloadDataUrl(canvas.toDataURL('image/png'), filename);
}
