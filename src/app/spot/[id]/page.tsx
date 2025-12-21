'use client';
import { useState, use, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, CheckCircle, UserPlus, Phone, Users, ArrowLeft, Zap, FileText, Instagram, Youtube, Tag, Utensils } from 'lucide-react';
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

    const [registeredUser, setRegisteredUser] = useState<{ id: string; name: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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
                setRegisteredUser(data);
                // Play success sound
                const audio = new Audio('/beep.mp3');
                audio.play().catch(() => { });
            } else {
                setError(data.error || 'Registration failed');
            }
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const downloadQR = () => {
        const canvas = document.getElementById('qr-canvas-spot') as HTMLCanvasElement;
        if (canvas) {
            const pngUrl = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
            const downloadLink = document.createElement('a');
            downloadLink.href = pngUrl;
            downloadLink.download = `${formData.name.replace(/\s+/g, '_')}_Spot_Ticket.png`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        }
    };

    const resetForm = () => {
        setRegisteredUser(null);
        setFormData({ name: '', email: '', phone: '', instagram: '', youtube: '', category: '', guest_names: '', meal_preference: 'veg' });
        setError('');
    };

    return (
        <main className="min-h-screen flex items-center justify-center p-3 sm:p-4 md:p-6 bg-gradient-to-br from-orange-900/30 via-black to-black">
            <div className="bg-card w-full max-w-lg p-4 sm:p-6 md:p-8 rounded-2xl border border-orange-500/30 shadow-2xl relative overflow-hidden my-4 sm:my-8">

                {/* Background decorative elements */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 to-yellow-500"></div>

                {/* Back Link */}
                <Link
                    href={`/events/${id}`}
                    className="absolute top-6 left-6 flex items-center gap-1 text-muted-foreground hover:text-white transition-colors text-sm"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Event
                </Link>

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
                                <label className="text-sm font-medium text-white mb-1.5 block">Accompanying Person (Guest)</label>
                                <div className="relative">
                                    <Users className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                                    <input
                                        type="text"
                                        name="guest_names"
                                        value={formData.guest_names}
                                        onChange={handleChange}
                                        className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all"
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
                                className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-black font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                            >
                                {loading ? 'Registering...' : '⚡ Quick Register'}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="text-center animate-in zoom-in duration-300 mt-4">
                        <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-10 h-10" />
                        </div>

                        <h2 className="text-2xl font-bold text-white mb-2">Registration Successful!</h2>
                        <p className="text-muted-foreground mb-6">
                            <span className="text-white font-semibold">{registeredUser.name}</span> is now registered.
                        </p>

                        <div className="flex flex-col items-center p-6 bg-white rounded-xl mx-auto w-fit mb-6 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                            <QRCodeCanvas
                                id="qr-canvas-spot"
                                value={registeredUser.id}
                                size={180}
                                level={"H"}
                                includeMargin={true}
                            />
                            <p className="text-black font-bold text-lg mt-2">{registeredUser.name}</p>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={downloadQR}
                                className="w-full flex items-center justify-center gap-2 bg-white text-black hover:bg-gray-200 font-bold py-3.5 rounded-xl transition-colors"
                            >
                                <Download className="w-5 h-5" />
                                Download Ticket
                            </button>

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
