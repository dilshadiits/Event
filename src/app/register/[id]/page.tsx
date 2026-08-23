'use client';
import { useState, use, useEffect, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import QRCode from 'qrcode';
import { useSearchParams } from 'next/navigation';
import { Download, CheckCircle, UserPlus, FileText, Phone, Instagram, Youtube, Users, Tag, Utensils, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { FormField, SYSTEM_FIELDS_DEFAULTS } from '@/components/FormBuilder';
import { loadImage, compositeOverlays, downloadDataUrl, type Overlay } from '@/lib/certificateGen';

export default function RegistrationPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const searchParams = useSearchParams();
    const inviteCode = searchParams.get('code');

    const [formData, setFormData] = useState<Record<string, string>>({
        name: '',
        email: '',
        phone: '',
        instagram: '',
        youtube: '',
        category: '',
        guest_names: '',
        meal_preference: 'veg'
    });
    const [customResponses, setCustomResponses] = useState<Record<string, string>>({});
    const [formConfig, setFormConfig] = useState<FormField[]>([]);
    const [configLoaded, setConfigLoaded] = useState(false);
    const [entryPassImage, setEntryPassImage] = useState('');

    const [registeredUser, setRegisteredUser] = useState<{ id: string; name: string; guest_names?: string; channel?: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Entry pass generation states - now supports multiple passes
    const [entryPasses, setEntryPasses] = useState<{ name: string; dataUrl: string; isGuest: boolean }[]>([]);
    const [isGeneratingPass, setIsGeneratingPass] = useState(false);
    const [currentPassIndex, setCurrentPassIndex] = useState(0);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const qrRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetch(`/api/events?id=${id}`)
            .then(res => res.json())
            .then(data => {
                if (data.formConfig && data.formConfig.length > 0) {
                    setFormConfig(data.formConfig);
                } else {
                    setFormConfig(SYSTEM_FIELDS_DEFAULTS);
                }
                if (data.entryPassImage) setEntryPassImage(data.entryPassImage);
                setConfigLoaded(true);
            })
            .catch(err => {
                console.error(err);
                setFormConfig(SYSTEM_FIELDS_DEFAULTS);
                setConfigLoaded(true);
            });
    }, [id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCustomChange = (id: string, value: string) => {
        setCustomResponses({ ...customResponses, [id]: value });
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) {
            setError('Name is required.');
            return;
        }
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/attendees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, eventId: id, inviteCode, customResponses }),
            });

            const data = await res.json();

            if (res.ok) {
                // Determine channel name (Instagram takes priority, then YouTube)
                const channelName = formData.instagram || formData.youtube || '';
                // Only take the first guest name if multiple are entered
                const singleGuest = formData.guest_names.split(',')[0]?.trim() || '';
                setRegisteredUser({ ...data, guest_names: singleGuest, channel: channelName });
            } else {
                setError(data.error || 'Registration failed');
            }
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Generate entry passes for main attendee and all guests
    useEffect(() => {
        if (registeredUser) {
            generateAllEntryPasses();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [registeredUser]);

    const generateSinglePass = async (name: string, qrValue: string, isGuest: boolean, channel?: string): Promise<string> => {
        // Render the QR code to an offscreen canvas first - needed as an overlay
        // image regardless of which template path below ends up being used.
        const qrCanvas = document.createElement('canvas');
        await new Promise<void>((resolve, reject) => {
            QRCode.toCanvas(qrCanvas, qrValue, { width: 300, margin: 0, errorCorrectionLevel: 'H' }, (error: Error | null | undefined) => {
                if (error) reject(error); else resolve();
            });
        });

        const canvas = document.createElement('canvas');

        // Use the event's uploaded template if one exists; otherwise fall back to a
        // plain white QR card - same graceful-degradation behavior as QRCodeModal,
        // rather than failing the whole registration flow when no template is set.
        let template: HTMLImageElement | null = null;
        if (entryPassImage) {
            try {
                template = await loadImage(entryPassImage);
            } catch {
                template = null;
            }
        }

        if (template) {
            const qrSize = Math.min(template.width * 0.38, template.height * 0.22);
            const qrX = (template.width - qrSize) / 2;
            const qrY = template.height * 0.48;

            const overlays: Overlay[] = [
                { type: 'rect', x: qrX - 10, y: qrY - 10, width: qrSize + 20, height: qrSize + 80, color: '#FFFFFF' },
                { type: 'image', x: qrX, y: qrY, width: qrSize, height: qrSize, source: qrCanvas },
                { type: 'text', x: template.width / 2, y: qrY + qrSize + 25, text: name.toUpperCase(), font: `bold ${Math.floor(qrSize * 0.11)}px Arial`, color: '#000000', align: 'center' },
            ];
            if (!isGuest && channel) {
                overlays.push({ type: 'text', x: template.width / 2, y: qrY + qrSize + 45, text: `(${channel})`, font: `${Math.floor(qrSize * 0.08)}px Arial`, color: '#444444', align: 'center' });
            }
            if (isGuest) {
                overlays.push({ type: 'text', x: template.width / 2, y: qrY + qrSize + 45, text: '(ACCOMPANYING GUEST)', font: `${Math.floor(qrSize * 0.08)}px Arial`, color: '#666666', align: 'center' });
            }
            compositeOverlays(canvas, template, overlays);
        } else {
            canvas.width = 300;
            canvas.height = 300;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas 2D context unavailable');
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, 300, 300);
            ctx.drawImage(qrCanvas, 0, 0, 300, 300);
        }

        return canvas.toDataURL('image/png');
    };

    const generateAllEntryPasses = async () => {
        if (!registeredUser) return;

        setIsGeneratingPass(true);
        setEntryPasses([]);
        setCurrentPassIndex(0);

        try {
            const passes: { name: string; dataUrl: string; isGuest: boolean }[] = [];

            // Generate pass for main attendee (with channel name)
            const mainPassUrl = await generateSinglePass(
                registeredUser.name,
                registeredUser.id,
                false,
                registeredUser.channel
            );
            passes.push({ name: registeredUser.name, dataUrl: mainPassUrl, isGuest: false });

            // Generate pass for ONE accompanying guest only
            if (registeredUser.guest_names && registeredUser.guest_names.trim()) {
                const guestName = registeredUser.guest_names.trim();
                const guestQrValue = `${registeredUser.id}-GUEST-1`;
                const guestPassUrl = await generateSinglePass(guestName, guestQrValue, true);
                passes.push({ name: guestName, dataUrl: guestPassUrl, isGuest: true });
            }

            setEntryPasses(passes);
        } catch (err) {
            console.error('Failed to generate passes:', err);
        } finally {
            setIsGeneratingPass(false);
        }
    };

    const downloadCurrentPass = () => {
        const currentPass = entryPasses[currentPassIndex];
        if (currentPass) {
            downloadDataUrl(currentPass.dataUrl, `${currentPass.name.replace(/\s+/g, '_')}_Entry_Pass.png`);
        }
    };

    const downloadAllPasses = () => {
        entryPasses.forEach((pass, index) => {
            setTimeout(() => {
                downloadDataUrl(pass.dataUrl, `${pass.name.replace(/\s+/g, '_')}_Entry_Pass.png`);
            }, index * 500); // Stagger downloads by 500ms
        });
    };

    return (
        <main className="min-h-screen flex items-center justify-center p-3 sm:p-4 md:p-6 bg-gradient-premium">
            <div className="bg-card w-full max-w-lg p-4 sm:p-6 md:p-8 rounded-2xl border border-border shadow-2xl relative overflow-hidden my-4 sm:my-8">

                {/* Background decorative elements */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-600"></div>

                {!registeredUser ? (
                    <>
                        <div className="text-center mb-6 sm:mb-8">
                            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Event Registration</h1>
                            <p className="text-sm sm:text-base text-muted-foreground">Register to join the exclusive event</p>
                        </div>

                        <form onSubmit={handleRegister} className="space-y-5">
                            {!configLoaded ? (
                                <div className="text-center py-10">
                                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
                                </div>
                            ) : (
                                <>
                                    {/* Basic Info (Always Required) */}
                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-white mb-1.5 block">Full Name *</label>
                                            <div className="relative">
                                                <UserPlus className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                                                <input
                                                    type="text"
                                                    name="name"
                                                    required
                                                    value={formData.name}
                                                    onChange={handleChange}
                                                    className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-3 text-white text-base focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                    placeholder="Your Name"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium text-white mb-1.5 block">Phone Number *</label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                                                <input
                                                    type="tel"
                                                    name="phone"
                                                    required
                                                    value={formData.phone}
                                                    onChange={handleChange}
                                                    className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-3 text-white text-base focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                    placeholder="+1 234 567 890"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dynamic Fields */}
                                    {formConfig.map(field => {
                                        if (!field.enabled) return null;

                                        // System Fields Handling
                                        if (field.isSystem) {
                                            if (field.id === 'email') {
                                                return (
                                                    <div key={field.id}>
                                                        <label className="text-sm font-medium text-white mb-1.5 block">{field.label} {field.required && '*'}</label>
                                                        <div className="relative">
                                                            <FileText className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                                                            <input
                                                                type="email"
                                                                name="email"
                                                                required={field.required}
                                                                value={formData.email}
                                                                onChange={handleChange}
                                                                className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-3 text-white text-base focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                                placeholder="you@example.com"
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            if (field.id === 'instagram') {
                                                return (
                                                    <div key={field.id}>
                                                        <label className="text-sm font-medium text-white mb-1.5 block">{field.label} {field.required && '*'}</label>
                                                        <div className="relative">
                                                            <Instagram className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                                                            <input
                                                                type="text"
                                                                name="instagram"
                                                                required={field.required}
                                                                value={formData.instagram}
                                                                onChange={handleChange}
                                                                className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-3 text-white text-base focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                                placeholder="@username"
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            if (field.id === 'youtube') {
                                                return (
                                                    <div key={field.id}>
                                                        <label className="text-sm font-medium text-white mb-1.5 block">{field.label} {field.required && '*'}</label>
                                                        <div className="relative">
                                                            <Youtube className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                                                            <input
                                                                type="text"
                                                                name="youtube"
                                                                required={field.required}
                                                                value={formData.youtube}
                                                                onChange={handleChange}
                                                                className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-3 text-white text-base focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                                placeholder="Channel URL"
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            if (field.id === 'category') {
                                                return (
                                                    <div key={field.id}>
                                                        <label className="text-sm font-medium text-white mb-1.5 block">{field.label} {field.required && '*'}</label>
                                                        <div className="relative">
                                                            <Tag className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                                                            <select
                                                                name="category"
                                                                required={field.required}
                                                                value={formData.category}
                                                                onChange={handleChange}
                                                                className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-3 text-white text-base focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                                            >
                                                                <option value="" className="bg-black">Select Category...</option>
                                                                {field.options?.map(opt => (
                                                                    <option key={opt} value={opt} className="bg-black">{opt}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            if (field.id === 'meal_preference') {
                                                return (
                                                    <div key={field.id}>
                                                        <label className="text-sm font-medium text-white mb-1.5 block">{field.label} {field.required && '*'}</label>
                                                        <div className="relative">
                                                            <Utensils className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                                                            <select
                                                                name="meal_preference"
                                                                required={field.required}
                                                                value={formData.meal_preference}
                                                                onChange={handleChange}
                                                                className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-3 text-white text-base focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                                            >
                                                                {field.options?.map(opt => (
                                                                    <option key={opt} value={opt} className="bg-black">{opt === 'veg' ? '🥗 Vegetarian' : opt === 'non-veg' ? '🍗 Non-Vegetarian' : opt}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                        }

                                        // Custom Fields Handling
                                        return (
                                            <div key={field.id}>
                                                <label className="text-sm font-medium text-white mb-1.5 block">{field.label} {field.required && '*'}</label>

                                                {field.type === 'select' ? (
                                                    <select
                                                        required={field.required}
                                                        value={customResponses[field.id] || ''}
                                                        onChange={(e) => handleCustomChange(field.id, e.target.value)}
                                                        className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-white text-base focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                                    >
                                                        <option value="" className="bg-black">Select...</option>
                                                        {field.options?.map(opt => (
                                                            <option key={opt} value={opt} className="bg-black">{opt}</option>
                                                        ))}
                                                    </select>
                                                ) : field.type === 'checkbox' ? (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            required={field.required}
                                                            checked={customResponses[field.id] === 'Yes'}
                                                            onChange={(e) => handleCustomChange(field.id, e.target.checked ? 'Yes' : 'No')}
                                                            className="w-5 h-5 rounded border-gray-600 bg-muted/50 text-blue-500 focus:ring-blue-500"
                                                        />
                                                        <span className="text-sm text-white">Yes, I agree</span>
                                                    </div>
                                                ) : (
                                                    <input
                                                        type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
                                                        required={field.required}
                                                        value={customResponses[field.id] || ''}
                                                        onChange={(e) => handleCustomChange(field.id, e.target.value)}
                                                        className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-white text-base focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                        placeholder={`Enter ${field.label}`}
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* Guest Section (Manual/Hardcoded for now as it's special logic) */}
                                    <div className="pt-2 border-t border-white/10">
                                        <label className="text-sm font-medium text-white mb-1.5 block">Accompanying Person (1 allowed)</label>
                                        <div className="relative">
                                            <Users className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                                            <input
                                                type="text"
                                                name="guest_names"
                                                value={formData.guest_names}
                                                onChange={handleChange}
                                                className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-3 text-white text-base focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                placeholder="Guest name (optional)"
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">Your guest will receive their own entry pass</p>
                                        <p className="text-xs text-yellow-500 mt-1 font-medium">⚠️ Guest will be charged ₹200</p>
                                    </div>
                                </>
                            )}

                            {error && (
                                <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg border border-red-900/50">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                            >
                                {loading ? 'Registering...' : 'Get Entry Ticket'}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="text-center animate-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8" />
                        </div>

                        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Registration Successful!</h2>
                        <p className="text-muted-foreground mb-4 text-sm sm:text-base">
                            Hello <span className="text-white font-semibold">{registeredUser.name}</span>,<br />
                            {entryPasses.length > 1
                                ? `Your spot and ${entryPasses.length - 1} guest pass${entryPasses.length > 2 ? 'es are' : ' is'} confirmed.`
                                : 'Your spot is confirmed.'}
                        </p>

                        {/* Hidden elements for pass generation */}
                        <div ref={qrRef} className="hidden">
                            <QRCodeCanvas
                                value={registeredUser.id}
                                size={300}
                                level={"H"}
                                includeMargin={false}
                            />
                        </div>
                        <canvas ref={canvasRef} className="hidden" />

                        {/* Entry Pass Preview with Navigation */}
                        <div className="mb-4">
                            {isGeneratingPass ? (
                                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                    <p>Generating Entry Passes...</p>
                                    {entryPasses.length > 0 && (
                                        <p className="text-xs mt-1">({entryPasses.length} of {registeredUser.guest_names ? registeredUser.guest_names.split(',').filter(n => n.trim()).length + 1 : 1})</p>
                                    )}
                                </div>
                            ) : entryPasses.length > 0 ? (
                                <div className="relative">
                                    {/* Pass Navigation */}
                                    {entryPasses.length > 1 && (
                                        <div className="flex items-center justify-between mb-3">
                                            <button
                                                onClick={() => setCurrentPassIndex(prev => Math.max(0, prev - 1))}
                                                disabled={currentPassIndex === 0}
                                                className="p-2 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed rounded-full transition-all"
                                            >
                                                <ChevronLeft className="w-5 h-5 text-white" />
                                            </button>

                                            <div className="text-center">
                                                <span className="text-sm text-white font-medium">
                                                    {entryPasses[currentPassIndex].name}
                                                </span>
                                                {entryPasses[currentPassIndex].isGuest && (
                                                    <span className="ml-2 text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
                                                        Guest
                                                    </span>
                                                )}
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Pass {currentPassIndex + 1} of {entryPasses.length}
                                                </p>
                                            </div>

                                            <button
                                                onClick={() => setCurrentPassIndex(prev => Math.min(entryPasses.length - 1, prev + 1))}
                                                disabled={currentPassIndex === entryPasses.length - 1}
                                                className="p-2 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed rounded-full transition-all"
                                            >
                                                <ChevronRight className="w-5 h-5 text-white" />
                                            </button>
                                        </div>
                                    )}

                                    {/* Pass Image */}
                                    <div className="flex justify-center">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={entryPasses[currentPassIndex].dataUrl}
                                            alt={`Entry Pass - ${entryPasses[currentPassIndex].name}`}
                                            className="max-w-full h-auto rounded-lg shadow-lg border border-border"
                                            style={{ maxHeight: '50vh' }}
                                        />
                                    </div>

                                    {/* Pass indicator dots */}
                                    {entryPasses.length > 1 && (
                                        <div className="flex justify-center gap-2 mt-3">
                                            {entryPasses.map((_, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => setCurrentPassIndex(index)}
                                                    className={`w-2.5 h-2.5 rounded-full transition-all ${index === currentPassIndex
                                                        ? 'bg-blue-500 scale-110'
                                                        : 'bg-white/30 hover:bg-white/50'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                                    <p>Failed to generate entry passes</p>
                                    <button
                                        onClick={generateAllEntryPasses}
                                        className="mt-2 text-blue-400 hover:underline"
                                    >
                                        Try again
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Download Buttons */}
                        <div className="space-y-2">
                            <button
                                onClick={downloadCurrentPass}
                                disabled={entryPasses.length === 0 || isGeneratingPass}
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 disabled:from-gray-500 disabled:to-gray-600 text-black font-bold py-3.5 rounded-xl transition-all shadow-lg"
                            >
                                <Download className="w-5 h-5" />
                                Download This Pass
                            </button>

                            {entryPasses.length > 1 && (
                                <button
                                    onClick={downloadAllPasses}
                                    disabled={entryPasses.length === 0 || isGeneratingPass}
                                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-3 rounded-xl transition-all"
                                >
                                    <Download className="w-5 h-5" />
                                    Download All Passes ({entryPasses.length})
                                </button>
                            )}
                        </div>

                        <p className="text-xs text-muted-foreground mt-4">
                            {entryPasses.length > 1
                                ? 'Please save all entry passes and show them at the entrance.'
                                : 'Please save this entry pass and show it at the entrance.'}
                        </p>
                    </div>
                )}
            </div>
        </main>
    );
}
