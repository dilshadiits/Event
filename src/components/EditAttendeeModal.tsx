'use client';
import { useState, useEffect } from 'react';
import { X, Save, Plus, Loader2, Users } from 'lucide-react';

interface Attendee {
    id: string;
    name: string;
    additionalName?: string;
    seatingNumber?: string;
    email: string;
    phone: string;
    instagram?: string;
    youtube?: string;
    category?: string;
    guest_names?: string;
    meal_preference?: 'veg' | 'non-veg';
    status: 'registered' | 'checked-in';
    checked_in_at: string | null;
    created_at: string;
}

interface EditAttendeeModalProps {
    attendee: Attendee | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedAttendee: Attendee) => void;
}

export default function EditAttendeeModal({ attendee, isOpen, onClose, onSave }: EditAttendeeModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        additionalName: '',
        seatingNumber: '',
        email: '',
        phone: '',
        instagram: '',
        youtube: '',
        category: '',
        guest_names: '',
        meal_preference: 'veg' as 'veg' | 'non-veg',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [newGuest, setNewGuest] = useState('');

    useEffect(() => {
        if (attendee) {
            setFormData({
                name: attendee.name || '',
                additionalName: attendee.additionalName || '',
                seatingNumber: attendee.seatingNumber || '',
                email: attendee.email || '',
                phone: attendee.phone || '',
                instagram: attendee.instagram || '',
                youtube: attendee.youtube || '',
                category: attendee.category || '',
                guest_names: attendee.guest_names || '',
                meal_preference: attendee.meal_preference || 'veg',
            });
            setError('');
        }
    }, [attendee]);

    const handleSave = async () => {
        if (!attendee) return;

        setIsSaving(true);
        setError('');

        try {
            const res = await fetch('/api/attendees', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: attendee.id,
                    ...formData,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update');
            }

            const updated = await res.json();
            onSave(updated);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update attendee');
        } finally {
            setIsSaving(false);
        }
    };

    const addGuest = () => {
        if (!newGuest.trim()) return;

        const currentGuests = formData.guest_names ? formData.guest_names.split(',').map(g => g.trim()).filter(Boolean) : [];
        currentGuests.push(newGuest.trim());
        setFormData({ ...formData, guest_names: currentGuests.join(', ') });
        setNewGuest('');
    };

    const removeGuest = (index: number) => {
        const currentGuests = formData.guest_names.split(',').map(g => g.trim()).filter(Boolean);
        currentGuests.splice(index, 1);
        setFormData({ ...formData, guest_names: currentGuests.join(', ') });
    };

    if (!isOpen || !attendee) return null;

    const guests = formData.guest_names ? formData.guest_names.split(',').map(g => g.trim()).filter(Boolean) : [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <div className="bg-card w-full max-w-lg p-6 rounded-2xl border border-border shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                <h2 className="text-xl font-bold text-white mb-6">Edit Attendee</h2>

                {error && (
                    <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-2 rounded-lg mb-4">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-sm text-muted-foreground mb-1">Name *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-muted/50 border border-border rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    {/* Additional Name */}
                    <div>
                        <label className="block text-sm text-muted-foreground mb-1">Additional Name</label>
                        <input
                            type="text"
                            value={formData.additionalName}
                            onChange={(e) => setFormData({ ...formData, additionalName: e.target.value })}
                            className="w-full bg-muted/50 border border-border rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="e.g. Spouse, Partner"
                        />
                    </div>

                    {/* Seating Number */}
                    <div>
                        <label className="block text-sm text-muted-foreground mb-1">Seating Number</label>
                        <input
                            type="text"
                            value={formData.seatingNumber}
                            onChange={(e) => setFormData({ ...formData, seatingNumber: e.target.value })}
                            className="w-full bg-muted/50 border border-border rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="e.g. A-12"
                        />
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-sm text-muted-foreground mb-1">Phone</label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full bg-muted/50 border border-border rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm text-muted-foreground mb-1">Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full bg-muted/50 border border-border rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    {/* Instagram */}
                    <div>
                        <label className="block text-sm text-muted-foreground mb-1">Instagram</label>
                        <input
                            type="text"
                            value={formData.instagram}
                            onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                            className="w-full bg-muted/50 border border-border rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    {/* YouTube */}
                    <div>
                        <label className="block text-sm text-muted-foreground mb-1">YouTube</label>
                        <input
                            type="text"
                            value={formData.youtube}
                            onChange={(e) => setFormData({ ...formData, youtube: e.target.value })}
                            className="w-full bg-muted/50 border border-border rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm text-muted-foreground mb-1">Category</label>
                        <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="w-full bg-muted/50 border border-border rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="">Select Category</option>
                            <option value="5k to 10k">5k to 10k</option>
                            <option value="10k to 100k">10k to 100k</option>
                            <option value="100k to 500k">100k to 500k</option>
                            <option value="500k to 1m">500k to 1m</option>
                            <option value="1m plus">1m plus</option>
                            <option value="Guest">Guest</option>
                        </select>
                    </div>

                    {/* Meal Preference */}
                    <div>
                        <label className="block text-sm text-muted-foreground mb-1">Meal Preference</label>
                        <select
                            value={formData.meal_preference}
                            onChange={(e) => setFormData({ ...formData, meal_preference: e.target.value as 'veg' | 'non-veg' })}
                            className="w-full bg-muted/50 border border-border rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="veg">Vegetarian</option>
                            <option value="non-veg">Non-Vegetarian</option>
                        </select>
                    </div>

                    {/* Guests Section */}
                    <div className="border-t border-border pt-4">
                        <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <Users className="w-4 h-4" />
                            Guests
                        </label>

                        {/* Current Guests */}
                        {guests.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                                {guests.map((guest, index) => (
                                    <span
                                        key={index}
                                        className="flex items-center gap-1 bg-orange-500/20 text-orange-300 px-3 py-1 rounded-full text-sm border border-orange-500/30"
                                    >
                                        {guest}
                                        <button
                                            onClick={() => removeGuest(index)}
                                            className="ml-1 hover:text-red-400 transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Add Guest */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newGuest}
                                onChange={(e) => setNewGuest(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addGuest())}
                                placeholder="Add guest name..."
                                className="flex-1 bg-muted/50 border border-border rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            />
                            <button
                                onClick={addGuest}
                                className="px-3 py-2 bg-orange-600/20 hover:bg-orange-600/40 text-orange-400 rounded-lg border border-orange-500/30 transition-all"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 text-white rounded-lg transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !formData.name}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-all font-medium"
                    >
                        {isSaving ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
