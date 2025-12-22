'use client';
import { useState, use, useEffect, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { useSearchParams } from 'next/navigation';
import { Download, CheckCircle, UserPlus, FileText, Phone, Instagram, Youtube, Users, Tag, Utensils, Loader2 } from 'lucide-react';

export default function RegistrationPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const searchParams = useSearchParams();
    const inviteCode = searchParams.get('code');

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

    const [registeredUser, setRegisteredUser] = useState<{ id: string; name: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Entry pass generation states
    const [entryPassDataUrl, setEntryPassDataUrl] = useState<string | null>(null);
    const [isGeneratingPass, setIsGeneratingPass] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const qrRef = useRef<HTMLDivElement>(null);

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
                body: JSON.stringify({ ...formData, eventId: id, inviteCode }),
            });

            const data = await res.json();

            if (res.ok) {
                setRegisteredUser(data);
            } else {
                setError(data.error || 'Registration failed');
            }
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Generate entry pass with template overlay
    useEffect(() => {
        if (registeredUser) {
            generateEntryPass();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [registeredUser]);

    const generateEntryPass = async () => {
        if (!registeredUser) return;

        setIsGeneratingPass(true);
        setEntryPassDataUrl(null);

        // Wait for QR code to render
        await new Promise(resolve => setTimeout(resolve, 200));

        const canvas = canvasRef.current;
        const qrCanvas = qrRef.current?.querySelector('canvas');

        if (!canvas || !qrCanvas) {
            setIsGeneratingPass(false);
            return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            setIsGeneratingPass(false);
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
            ctx.fillText(registeredUser.name.toUpperCase(), templateImg.width / 2, qrY + qrSize + 30);

            // Generate the data URL
            const dataUrl = canvas.toDataURL('image/png');
            setEntryPassDataUrl(dataUrl);
            setIsGeneratingPass(false);
        };

        templateImg.onerror = () => {
            console.error('Failed to load template image');
            setIsGeneratingPass(false);
        };
    };

    const downloadEntryPass = () => {
        if (entryPassDataUrl) {
            const downloadLink = document.createElement('a');
            downloadLink.href = entryPassDataUrl;
            downloadLink.download = `${registeredUser?.name.replace(/\s+/g, '_')}_Entry_Pass.png`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center p-3 sm:p-4 md:p-6 bg-gradient-premium">
            <div className="bg-card w-full max-w-lg p-4 sm:p-6 md:p-8 rounded-2xl border border-border shadow-2xl relative overflow-hidden my-4 sm:my-8">

                {/* Background decorative elements */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-600"></div>

                {!registeredUser ? (
                    <>
                        <div className="text-center mb-6 sm:mb-8">
                            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Influencer Meet</h1>
                            <p className="text-sm sm:text-base text-muted-foreground">Register to join the exclusive event</p>
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
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
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
                                            className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
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
                                        className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="you@example.com"
                                    />
                                </div>
                            </div>

                            {/* Socials */}
                            <div className="space-y-4 pt-2 border-t border-white/10">
                                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Social Presence</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-medium text-white mb-1 block">Instagram Handle</label>
                                        <div className="relative">
                                            <Instagram className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                            <input
                                                type="text"
                                                name="instagram"
                                                value={formData.instagram}
                                                onChange={handleChange}
                                                className="w-full bg-muted/50 border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="@username"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium text-white mb-1 block">YouTube/Link</label>
                                        <div className="relative">
                                            <Youtube className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                            <input
                                                type="text"
                                                name="youtube"
                                                value={formData.youtube}
                                                onChange={handleChange}
                                                className="w-full bg-muted/50 border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
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
                                            className="w-full bg-muted/50 border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
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
                                        className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
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
                                <label className="text-sm font-medium text-white mb-1.5 block">Accompanying Person (Guest)</label>
                                <div className="relative">
                                    <Users className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                                    <input
                                        type="text"
                                        name="guest_names"
                                        value={formData.guest_names}
                                        onChange={handleChange}
                                        className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="Guest Name (Optional)"
                                    />
                                </div>
                            </div>

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
                        <p className="text-muted-foreground mb-6 text-sm sm:text-base">
                            Hello <span className="text-white font-semibold">{registeredUser.name}</span>,<br />
                            Your spot is confirmed.
                        </p>

                        {/* Hidden QR code for generation */}
                        <div ref={qrRef} className="hidden">
                            <QRCodeCanvas
                                value={registeredUser.id}
                                size={300}
                                level={"H"}
                                includeMargin={false}
                            />
                        </div>

                        {/* Hidden canvas for compositing */}
                        <canvas ref={canvasRef} className="hidden" />

                        {/* Entry Pass Preview */}
                        <div className="flex justify-center mb-6">
                            {isGeneratingPass ? (
                                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                    <p>Generating Entry Pass...</p>
                                </div>
                            ) : entryPassDataUrl ? (
                                <img
                                    src={entryPassDataUrl}
                                    alt="Entry Pass"
                                    className="max-w-full h-auto rounded-lg shadow-lg border border-border"
                                    style={{ maxHeight: '55vh' }}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
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

                        <button
                            onClick={downloadEntryPass}
                            disabled={!entryPassDataUrl || isGeneratingPass}
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 disabled:from-gray-500 disabled:to-gray-600 text-black font-bold py-3.5 rounded-xl transition-all shadow-lg mb-4"
                        >
                            <Download className="w-5 h-5" />
                            Download Entry Pass
                        </button>

                        <p className="text-xs text-muted-foreground">
                            Please save this entry pass and show it at the entrance.
                        </p>
                    </div>
                )}
            </div>
        </main>
    );
}
