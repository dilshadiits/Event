'use client';
import { useState, use } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { useSearchParams } from 'next/navigation'; // Added
import { Download, CheckCircle, UserPlus, FileText, Phone, Instagram, Youtube, Users, Tag } from 'lucide-react';

export default function RegistrationPage({ params }: { params: Promise<{ id: string }> }) { // Kept original component name
    const { id } = use(params);
    const searchParams = useSearchParams(); // Added
    const inviteCode = searchParams.get('code'); // Added

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        instagram: '',
        youtube: '',
        category: '',
        guest_names: ''
    });

    const [registeredUser, setRegisteredUser] = useState<{ id: string; name: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRegister = async (e: React.FormEvent) => { // Renamed from handleSubmit to match original
        e.preventDefault();
        if (!formData.name || !formData.phone) { // Kept original validation
            setError('Name and Phone are required.');
            return;
        }
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/attendees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, eventId: id, inviteCode }), // Modified: Added inviteCode
            });

            const data = await res.json();

            if (res.ok) {
                setRegisteredUser(data);
            } else {
                setError(data.error || 'Registration failed');
            }
        } catch (_err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const downloadQR = () => {
        const canvas = document.getElementById('qr-canvas-public') as HTMLCanvasElement;
        if (canvas) {
            const pngUrl = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
            const downloadLink = document.createElement('a');
            downloadLink.href = pngUrl;
            downloadLink.download = `${formData.name.replace(/\s+/g, '_')}_Ticket.png`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center p-4 md:p-6 bg-gradient-premium">
            <div className="bg-card w-full max-w-lg p-6 md:p-8 rounded-2xl border border-border shadow-2xl relative overflow-hidden my-8">

                {/* Background decorative elements */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-600"></div>

                {!registeredUser ? (
                    <>
                        <div className="text-center mb-8">
                            <h1 className="text-3xl font-bold text-white mb-2">Influencer Meet</h1>
                            <p className="text-muted-foreground">Register to join the exclusive event</p>
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
                        <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-8 h-8" />
                        </div>

                        <h2 className="text-2xl font-bold text-white mb-2">Registration Successful!</h2>
                        <p className="text-muted-foreground mb-8">
                            Hello <span className="text-white font-semibold">{registeredUser.name}</span>,<br />
                            Your spot is confirmed.
                        </p>

                        <div className="flex justify-center p-6 bg-white rounded-xl mx-auto w-fit mb-8 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                            <QRCodeCanvas
                                id="qr-canvas-public"
                                value={registeredUser.id}
                                size={200}
                                level={"H"}
                                includeMargin={true}
                            />
                        </div>

                        <button
                            onClick={downloadQR}
                            className="w-full flex items-center justify-center gap-2 bg-white text-black hover:bg-gray-200 font-bold py-3.5 rounded-xl transition-colors mb-4"
                        >
                            <Download className="w-5 h-5" />
                            Download Ticket
                        </button>

                        <p className="text-xs text-muted-foreground">
                            Please save this QR code and show it at the entrance.
                        </p>
                    </div>
                )}
            </div>
        </main>
    );
}
