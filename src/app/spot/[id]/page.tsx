'use client';
import { useState, use, useEffect, useRef, useCallback } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import QRCode from 'qrcode';
import { Download, CheckCircle, UserPlus, Phone, Users, ArrowLeft, Zap, FileText, Instagram, Youtube, Tag, Utensils, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface EventInfo {
    id: string;
    name: string;
    date: string;
}

export default function SpotRegistrationPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [event, setEvent] = useState<EventInfo | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        instagram: '',
        youtube: '',
        category: '',
        guest_names: '',
        meal_preference: 'veg'
    });

    const [registeredUser, setRegisteredUser] = useState<{ id: string; name: string; guest_names?: string; channel?: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Entry pass generation states - supports multiple passes
    const [entryPasses, setEntryPasses] = useState<{ name: string; dataUrl: string; isGuest: boolean }[]>([]);
    const [isGeneratingPass, setIsGeneratingPass] = useState(false);
    const [currentPassIndex, setCurrentPassIndex] = useState(0);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const qrRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Fetch event info for display
        fetch('/api/events')
            .then(res => res.json())
            .then(events => {
                const found = events.find((e: EventInfo) => e.id === id);
                if (found) setEvent(found);
            })
            .catch(console.error);
    }, [id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.phone) {
            setError('Name and Phone are required.');
            return;
        }
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/attendees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    eventId: id,
                    category: formData.category || 'Spot Registration'
                }),
            });

            const data = await res.json();

            if (res.ok) {
                // Determine channel name (Instagram takes priority, then YouTube)
                const channelName = formData.instagram || formData.youtube || '';
                // Only take the first guest name if multiple are entered
                const singleGuest = formData.guest_names.split(',')[0]?.trim() || '';
                setRegisteredUser({ ...data, guest_names: singleGuest, channel: channelName });
                // Play success sound (TODO: Restore when beep.mp3 is added)
                // const audio = new Audio('/beep.mp3');
                // audio.play().catch(() => { });
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
    const generateSinglePass = useCallback((name: string, qrValue: string, isGuest: boolean, channel?: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject('Canvas context not available');
                return;
            }

            const templateImg = new Image();
            templateImg.crossOrigin = 'anonymous';
            templateImg.src = '/entry-pass-template.jpg';

            templateImg.onload = () => {
                canvas.width = templateImg.width;
                canvas.height = templateImg.height;
                ctx.drawImage(templateImg, 0, 0);

                // Generate QR code for this pass
                const tempQrCanvas = document.createElement('canvas');
                QRCode.toCanvas(tempQrCanvas, qrValue, {
                    width: 300,
                    margin: 0,
                    errorCorrectionLevel: 'H'
                }, (error: Error | null | undefined) => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    const qrSize = Math.min(templateImg.width * 0.38, templateImg.height * 0.22);
                    const qrX = (templateImg.width - qrSize) / 2;
                    const qrY = templateImg.height * 0.48;

                    // Draw white background (larger to fit channel name)
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 80);

                    // Draw QR code
                    ctx.drawImage(tempQrCanvas, qrX, qrY, qrSize, qrSize);

                    // Add name
                    ctx.fillStyle = '#000000';
                    ctx.font = `bold ${Math.floor(qrSize * 0.11)}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.fillText(name.toUpperCase(), templateImg.width / 2, qrY + qrSize + 25);

                    // Add channel name in brackets below the name (for main attendee only)
                    if (!isGuest && channel) {
                        ctx.font = `${Math.floor(qrSize * 0.08)}px Arial`;
                        ctx.fillStyle = '#444444';
                        ctx.fillText(`(${channel})`, templateImg.width / 2, qrY + qrSize + 45);
                    }

                    // Add guest label if applicable
                    if (isGuest) {
                        ctx.font = `${Math.floor(qrSize * 0.08)}px Arial`;
                        ctx.fillStyle = '#666666';
                        ctx.fillText('(ACCOMPANYING GUEST)', templateImg.width / 2, qrY + qrSize + 45);
                    }

                    resolve(canvas.toDataURL('image/png'));
                });
            };

            templateImg.onerror = () => reject('Failed to load template');
        });
    }, []);

    const generateAllEntryPasses = useCallback(async () => {
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
    }, [registeredUser, generateSinglePass]);

    useEffect(() => {
        if (registeredUser) {
            generateAllEntryPasses();
        }
    }, [registeredUser, generateAllEntryPasses]);

    const downloadCurrentPass = () => {
        const currentPass = entryPasses[currentPassIndex];
        if (currentPass) {
            const downloadLink = document.createElement('a');
            downloadLink.href = currentPass.dataUrl;
            downloadLink.download = `${currentPass.name.replace(/\s+/g, '_')}_Entry_Pass.png`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        }
    };

    const downloadAllPasses = () => {
        entryPasses.forEach((pass, index) => {
            setTimeout(() => {
                const downloadLink = document.createElement('a');
                downloadLink.href = pass.dataUrl;
                downloadLink.download = `${pass.name.replace(/\s+/g, '_')}_Entry_Pass.png`;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
            }, index * 500);
        });
    };

    const resetForm = () => {
        setRegisteredUser(null);
        setEntryPasses([]);
        setCurrentPassIndex(0);
        setFormData({ name: '', email: '', phone: '', instagram: '', youtube: '', category: '', guest_names: '', meal_preference: 'veg' });
        setError('');
    };

    return (
        <main className="min-h-screen flex items-center justify-center p-3 sm:p-4 md:p-6 bg-gradient-to-br from-orange-900/30 via-black to-black">
            <div className="bg-card w-full max-w-lg p-4 sm:p-6 md:p-8 rounded-2xl border border-orange-500/30 shadow-2xl relative overflow-hidden my-4 sm:my-8">

                {/* Background decorative elements */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 to-yellow-500"></div>

                {/* Back Link */}
                <div className="mb-4 sm:mb-0">
                    <Link
                        href={`/events/${id}`}
                        className="flex sm:absolute sm:top-6 sm:left-6 items-center gap-1 text-muted-foreground hover:text-white transition-colors text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Event
                    </Link>
                </div>

                {!registeredUser ? (
                    <>
                        <div className="text-center mb-6 sm:mb-8 mt-6">
                            <div className="inline-flex items-center gap-2 bg-orange-500/20 text-orange-400 px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold mb-3 sm:mb-4 border border-orange-500/30">
                                <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
                                SPOT REGISTRATION
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                                {event?.name || 'Event Registration'}
                            </h1>
                            <p className="text-sm sm:text-base text-muted-foreground">Walk-in registration for on-site attendees</p>
                        </div>

                        <form onSubmit={handleRegister} className="space-y-5">
                            {/* Basic Info */}
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-white mb-1.5 block">Full Name *</label>
                                    <div className="relative">
                                        <UserPlus className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                                        <input
                                            type="text"
                                            name="name"
                                            required
                                            autoFocus
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all"
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
                                            className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                            placeholder="+1 234 567 890"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-white mb-1.5 block">Email (Optional)</label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                        placeholder="you@example.com"
                                    />
                                </div>
                            </div>

                            {/* Socials */}
                            <div className="space-y-4 pt-2 border-t border-white/10">
                                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Social Presence</h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <div>
                                        <label className="text-xs font-medium text-white mb-1 block">Instagram Handle</label>
                                        <div className="relative">
                                            <Instagram className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
                                            <input
                                                type="text"
                                                name="instagram"
                                                value={formData.instagram}
                                                onChange={handleChange}
                                                className="w-full bg-muted/50 border border-border rounded-lg pl-9 pr-3 py-3 text-sm text-white focus:ring-2 focus:ring-orange-500 outline-none"
                                                placeholder="@username"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium text-white mb-1 block">YouTube/Link</label>
                                        <div className="relative">
                                            <Youtube className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
                                            <input
                                                type="text"
                                                name="youtube"
                                                value={formData.youtube}
                                                onChange={handleChange}
                                                className="w-full bg-muted/50 border border-border rounded-lg pl-9 pr-3 py-3 text-sm text-white focus:ring-2 focus:ring-orange-500 outline-none"
                                                placeholder="Channel URL"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-white mb-1 block">Category</label>
                                    <div className="relative">
                                        <Tag className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                        <select
                                            name="category"
                                            value={formData.category}
                                            onChange={handleChange}
                                            className="w-full bg-muted/50 border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-orange-500 outline-none appearance-none"
                                        >
                                            <option value="" className="bg-black">Select Category...</option>
                                            <option value="Tech" className="bg-black">Tech</option>
                                            <option value="Fashion" className="bg-black">Fashion</option>
                                            <option value="Lifestyle" className="bg-black">Lifestyle</option>
                                            <option value="Food" className="bg-black">Food</option>
                                            <option value="Travel" className="bg-black">Travel</option>
                                            <option value="Gaming" className="bg-black">Gaming</option>
                                            <option value="Other" className="bg-black">Other</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Meal Preference */}
                            <div className="pt-2 border-t border-white/10">
                                <label className="text-sm font-medium text-white mb-1.5 block">Meal Preference *</label>
                                <div className="relative">
                                    <Utensils className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                                    <select
                                        name="meal_preference"
                                        value={formData.meal_preference}
                                        onChange={handleChange}
                                        required
                                        className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all appearance-none"
                                    >
                                        <option value="veg" className="bg-black">🥗 Vegetarian</option>
                                        <option value="non-veg" className="bg-black">🍗 Non-Vegetarian</option>
                                    </select>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1.5">
                                    {formData.meal_preference === 'veg'
                                        ? '🟢 Veg meals include fresh veggies and paneer options'
                                        : '🔴 Non-veg meals include chicken and egg options'}
                                </p>
                            </div>

                            {/* Guest */}
                            <div className="pt-2 border-t border-white/10">
                                <label className="text-sm font-medium text-white mb-1.5 block">Accompanying Person (1 allowed)</label>
                                <div className="relative">
                                    <Users className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                                    <input
                                        type="text"
                                        name="guest_names"
                                        value={formData.guest_names}
                                        onChange={handleChange}
                                        className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                        placeholder="Guest name (optional)"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Your guest will receive their own entry pass
                                </p>
                                <p className="text-xs text-yellow-500 mt-1 font-medium">
                                    ⚠️ Guest will be charged ₹200
                                </p>
                            </div>

                            {error && (
                                <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg border border-red-900/50">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-black font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                            >
                                {loading ? 'Registering...' : '⚡ Quick Register'}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="text-center animate-in zoom-in duration-300 mt-4">
                        <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8" />
                        </div>

                        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Registration Successful!</h2>
                        <p className="text-muted-foreground mb-4 text-sm sm:text-base">
                            <span className="text-white font-semibold">{registeredUser.name}</span> is now registered.
                            {entryPasses.length > 1 && (
                                <><br />{entryPasses.length - 1} guest pass{entryPasses.length > 2 ? 'es' : ''} also generated.</>
                            )}
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
                                            style={{ maxHeight: '45vh' }}
                                        />
                                    </div>

                                    {/* Pass indicator dots */}
                                    {entryPasses.length > 1 && (
                                        <div className="flex justify-center gap-2 mt-3">
                                            {entryPasses.map((pass, index) => (
                                                <button
                                                    key={`${pass.name}-${index}`}
                                                    onClick={() => setCurrentPassIndex(index)}
                                                    className={`w-2.5 h-2.5 rounded-full transition-all ${index === currentPassIndex
                                                        ? 'bg-orange-500 scale-110'
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
                                        className="mt-2 text-orange-400 hover:underline"
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

                            <button
                                onClick={resetForm}
                                className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-black font-bold py-3.5 rounded-xl transition-colors"
                            >
                                <UserPlus className="w-5 h-5" />
                                Register Another
                            </button>
                        </div>

                        <p className="text-xs text-muted-foreground mt-4">
                            Ticket ID: <span className="font-mono select-all">{registeredUser.id}</span>
                        </p>
                    </div>
                )}
            </div>
        </main>
    );
}
