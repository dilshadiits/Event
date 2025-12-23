import mongoose, { Schema } from 'mongoose';

const EventSchema = new Schema({
    name: { type: String, required: true },
    date: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
});

// Use 'Event' (singular) -> 'events' collection
export const Event = mongoose.models.Event || mongoose.model('Event', EventSchema);

const AttendeeSchema = new mongoose.Schema({
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: false },
    phone: { type: String, required: true, index: true },
    instagram: { type: String },
    youtube: { type: String },
    category: { type: String },
    guest_names: { type: String },
    meal_preference: { type: String, enum: ['veg', 'non-veg'], default: 'veg' },
    status: { type: String, enum: ['registered', 'checked-in'], default: 'registered' },
    checked_in_at: { type: Date },
    guest_checked_in: { type: Boolean, default: false },
    guest_checked_in_at: { type: Date },
    created_at: { type: Date, default: Date.now },
});

const InviteCodeSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    isUsed: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

// Compound index for faster invite lookups
InviteCodeSchema.index({ code: 1, eventId: 1 });

export const Attendee = mongoose.models.Attendee || mongoose.model('Attendee', AttendeeSchema);
export const InviteCode = mongoose.models.InviteCode || mongoose.model('InviteCode', InviteCodeSchema);

// Award Category Schema - defines voting categories for an event
const AwardCategorySchema = new mongoose.Schema({
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    showResults: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

// Vote Schema - tracks individual votes
const VoteSchema = new mongoose.Schema({
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'AwardCategory', required: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    nomineeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendee', required: true },
    voterPhone: { type: String, required: true },
    voterName: { type: String, required: true }, // Voter's name
    createdAt: { type: Date, default: Date.now },
});

// Compound index to enforce one vote per phone per EVENT (only one vote total)
VoteSchema.index({ eventId: 1, voterPhone: 1 }, { unique: true });

export const AwardCategory = mongoose.models.AwardCategory || mongoose.model('AwardCategory', AwardCategorySchema);
export const Vote = mongoose.models.Vote || mongoose.model('Vote', VoteSchema);

// Standalone Award Event Schema - separate from attendance events
const AwardEventSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    headerImage: { type: String }, // Event banner/header image URL
    sponsorImages: [{ type: String }], // Array of sponsor logo URLs
    digitalMediaSponsorIndex: { type: Number, default: -1 }, // Index of sponsor to show as Digital Media Sponsor (-1 = none)
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
});

// Nominee Schema - separate nominees for award voting
const NomineeSchema = new mongoose.Schema({
    awardEventId: { type: mongoose.Schema.Types.ObjectId, ref: 'AwardEvent', required: true, index: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'AwardCategory', index: true },
    name: { type: String, required: true },
    description: { type: String },
    imageUrl: { type: String },
    position: { type: Number, default: 0 }, // Position for ordering within category
    createdAt: { type: Date, default: Date.now },
});

export const AwardEvent = mongoose.models.AwardEvent || mongoose.model('AwardEvent', AwardEventSchema);
export const Nominee = mongoose.models.Nominee || mongoose.model('Nominee', NomineeSchema);

