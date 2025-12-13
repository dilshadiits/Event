import mongoose, { Schema } from 'mongoose';

const EventSchema = new Schema({
    name: { type: String, required: true },
    date: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
});

// Use 'Event' (singular) -> 'events' collection
export const Event = mongoose.models.Event || mongoose.model('Event', EventSchema);

const AttendeeSchema = new mongoose.Schema({
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    name: { type: String, required: true },
    email: { type: String, required: false },
    phone: { type: String, required: true },
    instagram: { type: String },
    youtube: { type: String },
    category: { type: String },
    guest_names: { type: String },
    status: { type: String, enum: ['registered', 'checked-in'], default: 'registered' },
    checked_in_at: { type: Date },
    created_at: { type: Date, default: Date.now },
});

const InviteCodeSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    isUsed: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

export const Attendee = mongoose.models.Attendee || mongoose.model('Attendee', AttendeeSchema);
export const InviteCode = mongoose.models.InviteCode || mongoose.model('InviteCode', InviteCodeSchema);
